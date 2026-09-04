import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDatabase, seedUsers, type SeededUser } from './utils/test-app';

const CALLBACK = '/api/webhooks/n8n/enrichment';
const SECRET_HEADER = 'X-Webhook-Secret';

describe('Callback de enriquecimiento de n8n (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let users: Record<string, SeededUser>;
  let secret: string;
  let ticketId: number;

  beforeAll(async () => {
    const context = await createTestApp();
    app = context.app;
    prisma = context.prisma;
    secret = process.env.N8N_WEBHOOK_SECRET as string;
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    users = await seedUsers(prisma);

    const ticket = await prisma.ticket.create({
      data: {
        title: 'Cobro duplicado en la factura',
        description: 'Aparecen dos cargos por el mismo importe en la factura de este mes.',
        createdById: users.bruno.id,
      },
    });
    ticketId = ticket.id;
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  const payload = () => ({
    ticketId,
    priority: 'high',
    category: 'billing',
    tags: ['facturacion', 'duplicado'],
  });

  describe('secreto compartido', () => {
    it('responde 401 sin la cabecera', async () => {
      await request(app.getHttpServer()).post(CALLBACK).send(payload()).expect(401);
    });

    it('responde 401 con un secreto incorrecto', async () => {
      await request(app.getHttpServer())
        .post(CALLBACK)
        .set(SECRET_HEADER, 'secreto-incorrecto')
        .send(payload())
        .expect(401);
    });

    /**
     * La comparación es en tiempo constante y compara longitudes por separado:
     * un secreto del mismo largo tampoco debe pasar.
     */
    it('responde 401 con un secreto de la misma longitud', async () => {
      const mismoLargo = 'x'.repeat(secret.length);
      await request(app.getHttpServer())
        .post(CALLBACK)
        .set(SECRET_HEADER, mismoLargo)
        .send(payload())
        .expect(401);
    });

    /** Un JWT de usuario no abre esta puerta: son mecanismos distintos. */
    it('responde 401 con un JWT de usuario válido en lugar del secreto', async () => {
      const login = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: users.admin.email, password: users.admin.password });

      await request(app.getHttpServer())
        .post(CALLBACK)
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .send(payload())
        .expect(401);
    });

    it('no revela por qué falló', async () => {
      const sinCabecera = await request(app.getHttpServer())
        .post(CALLBACK)
        .send(payload())
        .expect(401);

      const secretoMalo = await request(app.getHttpServer())
        .post(CALLBACK)
        .set(SECRET_HEADER, 'otro')
        .send(payload())
        .expect(401);

      expect(sinCabecera.body.message).toBe(secretoMalo.body.message);
      expect(JSON.stringify(sinCabecera.body)).not.toContain(secret);
    });

    it('el ticket sigue en pending tras los intentos rechazados', async () => {
      await request(app.getHttpServer()).post(CALLBACK).send(payload()).expect(401);

      const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } });
      expect(ticket.enrichmentStatus).toBe('pending');
    });
  });

  describe('validación del payload', () => {
    const conSecreto = () => request(app.getHttpServer()).post(CALLBACK).set(SECRET_HEADER, secret);

    it('responde 404 si el ticket no existe', async () => {
      await conSecreto()
        .send({ ...payload(), ticketId: 999999 })
        .expect(404);
    });

    it.each([
      ['priority inválida', { priority: 'altisima' }],
      ['category inválida', { category: 'inventada' }],
      ['ticketId como texto', { ticketId: 'cuarenta' }],
      ['tags que no es lista', { tags: 'una-sola' }],
      ['campo no declarado', { status: 'closed' }],
    ])('responde 400 con %s', async (_caso, override) => {
      await conSecreto()
        .send({ ...payload(), ...override })
        .expect(400);
    });

    it('responde 400 con el cuerpo vacío', async () => {
      await conSecreto().send({}).expect(400);
    });

    it('el mensaje del 400 lista los valores válidos', async () => {
      const response = await conSecreto()
        .send({ ...payload(), priority: 'altisima' })
        .expect(400);

      expect(response.body.message.join(' ')).toContain('low, medium, high, urgent');
    });
  });

  describe('enriquecimiento correcto', () => {
    const conSecreto = () => request(app.getHttpServer()).post(CALLBACK).set(SECRET_HEADER, secret);

    it('persiste el enriquecimiento y pasa el ticket a done', async () => {
      const response = await conSecreto().send(payload()).expect(200);

      expect(response.body).toMatchObject({ ticketId, enrichmentStatus: 'done' });
      expect(response.body.enrichedAt).toEqual(expect.any(String));

      const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } });
      expect(ticket).toMatchObject({
        enrichmentStatus: 'done',
        priority: 'high',
        category: 'billing',
        tags: ['facturacion', 'duplicado'],
      });
      expect(ticket.enrichedAt).toBeInstanceOf(Date);
    });

    /** El flujo de esta entrega no genera respuesta sugerida. */
    it('deja suggestedReply en null si no viene en el payload', async () => {
      await conSecreto().send(payload()).expect(200);

      const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } });
      expect(ticket.suggestedReply).toBeNull();
    });

    it('acepta suggestedReply si el payload la incluye', async () => {
      await conSecreto()
        .send({ ...payload(), suggestedReply: 'Ya iniciamos el reverso del cargo duplicado.' })
        .expect(200);

      const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } });
      expect(ticket.suggestedReply).toBe('Ya iniciamos el reverso del cargo duplicado.');
    });

    it('deja tags como lista vacía si no vienen', async () => {
      await conSecreto().send({ ticketId, priority: 'low', category: 'other' }).expect(200);

      const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } });
      expect(ticket.tags).toEqual([]);
    });

    /**
     * n8n reintenta: un segundo callback debe sobrescribir y responder 200, no
     * 409. Romper un reintento legítimo sería peor que aceptar el dato nuevo.
     */
    it('es idempotente: un segundo callback sobrescribe y responde 200', async () => {
      await conSecreto().send(payload()).expect(200);

      await conSecreto()
        .send({ ticketId, priority: 'urgent', category: 'technical', tags: ['revisado'] })
        .expect(200);

      const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } });
      expect(ticket).toMatchObject({
        enrichmentStatus: 'done',
        priority: 'urgent',
        category: 'technical',
        tags: ['revisado'],
      });
    });

    it('el enriquecimiento se ve en el detalle del ticket', async () => {
      await conSecreto().send(payload()).expect(200);

      const login = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: users.bruno.email, password: users.bruno.password });

      const response = await request(app.getHttpServer())
        .get(`/api/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        enrichmentStatus: 'done',
        priority: 'high',
        category: 'billing',
      });
    });
  });
});
