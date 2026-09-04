import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  createTestApp,
  resetDatabase,
  seedUsers,
  type N8nDispatcherSpy,
  type SeededUser,
} from './utils/test-app';

const TITULO = 'Cobro duplicado en la factura';
const DESCRIPCION = 'Aparecen dos cargos por el mismo importe en la factura de este mes.';

describe('Tickets (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let n8n: N8nDispatcherSpy;
  let users: Record<string, SeededUser>;
  let tokens: Record<string, string>;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const context = await createTestApp();
    app = context.app;
    prisma = context.prisma;
    n8n = context.n8n;
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    n8n.reset();
    users = await seedUsers(prisma);

    tokens = {};
    for (const [alias, user] of Object.entries(users)) {
      const login = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: user.email, password: user.password });
      tokens[alias] = login.body.accessToken as string;
    }
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  describe('POST /api/tickets', () => {
    it('crea el ticket en pending y sin enriquecimiento', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/tickets')
        .set(auth(tokens.bruno))
        .send({ title: TITULO, description: DESCRIPCION })
        .expect(201);

      expect(response.body).toMatchObject({
        title: TITULO,
        status: 'open',
        enrichmentStatus: 'pending',
        priority: null,
        category: null,
        tags: [],
        suggestedReply: null,
        enrichedAt: null,
      });
      expect(response.body.createdBy).toMatchObject({ id: users.bruno.id });
      expect(response.body.assignedTo).toBeNull();
    });

    /** La mitad saliente del contrato con n8n. */
    it('despacha a n8n con el payload del contrato, después de persistir', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/tickets')
        .set(auth(tokens.bruno))
        .send({ title: TITULO, description: DESCRIPCION })
        .expect(201);

      expect(n8n.dispatches).toHaveLength(1);
      expect(n8n.dispatches[0]).toEqual({
        ticketId: response.body.id,
        title: TITULO,
        description: DESCRIPCION,
        createdAt: response.body.createdAt,
      });

      // El ticket ya existía cuando se despachó: n8n puede responder de inmediato.
      await expect(
        prisma.ticket.findUnique({ where: { id: n8n.dispatches[0].ticketId } }),
      ).resolves.not.toBeNull();
    });

    it('responde 401 sin token y no despacha nada', async () => {
      await request(app.getHttpServer())
        .post('/api/tickets')
        .send({ title: TITULO, description: DESCRIPCION })
        .expect(401);

      expect(n8n.dispatches).toHaveLength(0);
    });

    /**
     * El enriquecimiento lo produce n8n: no debe haber forma de escribirlo
     * desde la API pública, que es la regla central del enunciado.
     */
    it('rechaza con 400 los campos de enriquecimiento', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/tickets')
        .set(auth(tokens.bruno))
        .send({ title: TITULO, description: DESCRIPCION, priority: 'urgent', category: 'billing' })
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([
          'property priority should not exist',
          'property category should not exist',
        ]),
      );
    });

    it.each([
      ['solo espacios', '          ', '                    '],
      ['solo números', '1234567890', '12345678901234567890'],
      ['solo símbolos', '!!!!!!!!!!', '@@@@@ ##### $$$$$ %%'],
      ['menos de cinco letras', 'Erro 12345', 'Erro 123456789012345'],
    ])('rechaza con 400 un texto sin contenido: %s', async (_caso, title, description) => {
      await request(app.getHttpServer())
        .post('/api/tickets')
        .set(auth(tokens.bruno))
        .send({ title, description })
        .expect(400);
    });

    it('acepta números dentro de una frase', async () => {
      await request(app.getHttpServer())
        .post('/api/tickets')
        .set(auth(tokens.bruno))
        .send({
          title: 'Error 500 al exportar el PDF',
          description: 'El 04/09/2026 a las 12:30 el export devolvió el código 500.',
        })
        .expect(201);
    });

    it('impide a un agente asignar el ticket a otra persona', async () => {
      await request(app.getHttpServer())
        .post('/api/tickets')
        .set(auth(tokens.bruno))
        .send({ title: TITULO, description: DESCRIPCION, assignedToId: users.carla.id })
        .expect(403);
    });

    it('permite a un admin asignar el ticket a otra persona', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/tickets')
        .set(auth(tokens.admin))
        .send({ title: TITULO, description: DESCRIPCION, assignedToId: users.carla.id })
        .expect(201);

      expect(response.body.assignedTo).toMatchObject({ id: users.carla.id });
    });
  });

  describe('GET /api/tickets — alcance por rol', () => {
    beforeEach(async () => {
      // Tres tickets: uno de cada agente y uno ajeno a Bruno.
      await prisma.ticket.createMany({
        data: [
          {
            title: 'Ticket creado por Bruno',
            description: DESCRIPCION,
            createdById: users.bruno.id,
          },
          {
            title: 'Ticket asignado a Bruno',
            description: DESCRIPCION,
            createdById: users.carla.id,
            assignedToId: users.bruno.id,
          },
          { title: 'Ticket solo de Carla', description: DESCRIPCION, createdById: users.carla.id },
        ],
      });
    });

    it('el admin ve todos', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tickets')
        .set(auth(tokens.admin))
        .expect(200);

      expect(response.body.meta.total).toBe(3);
    });

    it('un agente ve solo los que creó o tiene asignados', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tickets')
        .set(auth(tokens.bruno))
        .expect(200);

      expect(response.body.meta.total).toBe(2);
      expect(response.body.data.map((t: { title: string }) => t.title)).not.toContain(
        'Ticket solo de Carla',
      );
    });

    /**
     * El filtro va dentro del where: si se aplicara después de paginar, el
     * total sería el global y las páginas llegarían incompletas.
     */
    it('el total y las páginas respetan el alcance del agente', async () => {
      const primera = await request(app.getHttpServer())
        .get('/api/tickets?limit=1&page=1')
        .set(auth(tokens.bruno))
        .expect(200);

      expect(primera.body.meta).toMatchObject({ total: 2, totalPages: 2, page: 1 });
      expect(primera.body.data).toHaveLength(1);

      const segunda = await request(app.getHttpServer())
        .get('/api/tickets?limit=1&page=2')
        .set(auth(tokens.bruno))
        .expect(200);

      expect(segunda.body.data).toHaveLength(1);
      expect(segunda.body.data[0].id).not.toBe(primera.body.data[0].id);
    });

    /** La búsqueda no puede ser una vía para ver tickets ajenos. */
    it('la búsqueda no filtra tickets fuera del alcance', async () => {
      const admin = await request(app.getHttpServer())
        .get('/api/tickets?search=solo de Carla')
        .set(auth(tokens.admin))
        .expect(200);
      expect(admin.body.meta.total).toBe(1);

      const bruno = await request(app.getHttpServer())
        .get('/api/tickets?search=solo de Carla')
        .set(auth(tokens.bruno))
        .expect(200);
      expect(bruno.body.meta.total).toBe(0);
    });

    it('rechaza con 400 los parámetros de consulta inválidos', async () => {
      await request(app.getHttpServer())
        .get('/api/tickets?limit=500')
        .set(auth(tokens.bruno))
        .expect(400);

      // sortBy es una lista blanca: el nombre de la columna no lo elige el cliente.
      await request(app.getHttpServer())
        .get('/api/tickets?sortBy=passwordHash')
        .set(auth(tokens.bruno))
        .expect(400);
    });
  });

  describe('GET, PATCH y DELETE /api/tickets/:id', () => {
    let ticketDeCarla: number;

    beforeEach(async () => {
      const ticket = await prisma.ticket.create({
        data: {
          title: 'Ticket solo de Carla',
          description: DESCRIPCION,
          createdById: users.carla.id,
        },
      });
      ticketDeCarla = ticket.id;
    });

    /** 404 y no 403: un agente no debe poder deducir que existen tickets ajenos. */
    it('devuelve 404 al leer un ticket fuera de alcance', async () => {
      await request(app.getHttpServer())
        .get(`/api/tickets/${ticketDeCarla}`)
        .set(auth(tokens.bruno))
        .expect(404);

      await request(app.getHttpServer())
        .get(`/api/tickets/${ticketDeCarla}`)
        .set(auth(tokens.admin))
        .expect(200);
    });

    it('devuelve 400 con un id no numérico y 404 con uno inexistente', async () => {
      await request(app.getHttpServer())
        .get('/api/tickets/abc')
        .set(auth(tokens.bruno))
        .expect(400);

      await request(app.getHttpServer())
        .get('/api/tickets/999999')
        .set(auth(tokens.bruno))
        .expect(404);
    });

    describe('transiciones de estado', () => {
      let propio: number;

      beforeEach(async () => {
        const ticket = await prisma.ticket.create({
          data: {
            title: 'Ticket propio de Bruno',
            description: DESCRIPCION,
            createdById: users.bruno.id,
          },
        });
        propio = ticket.id;
      });

      const patch = (token: string, id: number, status: string) =>
        request(app.getHttpServer()).patch(`/api/tickets/${id}`).set(auth(token)).send({ status });

      it('un agente avanza open, in_progress y resolved en ese orden', async () => {
        await patch(tokens.bruno, propio, 'in_progress').expect(200);
        await patch(tokens.bruno, propio, 'resolved').expect(200);
      });

      it('un agente no salta pasos ni retrocede', async () => {
        await patch(tokens.bruno, propio, 'resolved').expect(403);
        await patch(tokens.bruno, propio, 'in_progress').expect(200);
        await patch(tokens.bruno, propio, 'open').expect(403);
      });

      it('un agente no puede cerrar un ticket', async () => {
        await patch(tokens.bruno, propio, 'closed').expect(403);
      });

      it('reenviar el mismo estado no falla', async () => {
        await patch(tokens.bruno, propio, 'open').expect(200);
      });

      it('un admin pasa de cualquier estado a cualquier otro', async () => {
        await patch(tokens.admin, propio, 'closed').expect(200);
        await patch(tokens.admin, propio, 'open').expect(200);
        await patch(tokens.admin, propio, 'resolved').expect(200);
      });

      it('rechaza con 400 un estado que no existe', async () => {
        await patch(tokens.bruno, propio, 'pendiente').expect(400);
      });
    });

    it('un agente solo borra lo que creó, no lo que tiene asignado', async () => {
      const asignado = await prisma.ticket.create({
        data: {
          title: 'Ticket asignado a Bruno',
          description: DESCRIPCION,
          createdById: users.carla.id,
          assignedToId: users.bruno.id,
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/tickets/${asignado.id}`)
        .set(auth(tokens.bruno))
        .expect(403);

      const propio = await prisma.ticket.create({
        data: {
          title: 'Ticket propio de Bruno',
          description: DESCRIPCION,
          createdById: users.bruno.id,
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/tickets/${propio.id}`)
        .set(auth(tokens.bruno))
        .expect(204);

      await request(app.getHttpServer())
        .get(`/api/tickets/${propio.id}`)
        .set(auth(tokens.bruno))
        .expect(404);
    });
  });

  describe('GET /api/users', () => {
    it('solo lo puede consultar un admin', async () => {
      await request(app.getHttpServer()).get('/api/users').expect(401);
      await request(app.getHttpServer()).get('/api/users').set(auth(tokens.bruno)).expect(403);

      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set(auth(tokens.admin))
        .expect(200);

      expect(response.body).toHaveLength(3);
      expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    });
  });
});
