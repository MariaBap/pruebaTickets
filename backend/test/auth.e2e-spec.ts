import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDatabase, seedUsers, type SeededUser } from './utils/test-app';

describe('Autenticación (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let users: Record<string, SeededUser>;

  beforeAll(async () => {
    const context = await createTestApp();
    app = context.app;
    prisma = context.prisma;
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    users = await seedUsers(prisma);
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  describe('POST /api/auth/login', () => {
    it('devuelve un JWT y el usuario con credenciales correctas', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: users.admin.email, password: users.admin.password })
        .expect(200);

      expect(response.body.accessToken).toEqual(expect.any(String));
      expect(response.body.accessToken.split('.')).toHaveLength(3);
      expect(response.body.user).toMatchObject({ email: users.admin.email, role: 'admin' });
    });

    it('nunca expone el hash de la contraseña', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: users.admin.email, password: users.admin.password })
        .expect(200);

      expect(JSON.stringify(response.body)).not.toContain('passwordHash');
      expect(JSON.stringify(response.body)).not.toContain(users.admin.password);
    });

    it('normaliza el email: entra escrito en mayúsculas', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: users.admin.email.toUpperCase(), password: users.admin.password })
        .expect(200);
    });

    it('responde 401 con la contraseña equivocada', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: users.admin.email, password: 'incorrecta' })
        .expect(401);
    });

    /**
     * El mismo mensaje para email inexistente y contraseña incorrecta es lo que
     * impide averiguar qué cuentas existen probando correos.
     */
    it('usa el mismo mensaje para email inexistente y contraseña incorrecta', async () => {
      const passwordMala = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: users.admin.email, password: 'incorrecta' })
        .expect(401);

      const emailInexistente = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'nadie@crazysupporthub.test', password: users.admin.password })
        .expect(401);

      expect(emailInexistente.body.message).toBe(passwordMala.body.message);
    });

    it('responde 400 con un payload inválido', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'no-es-un-email', password: '' })
        .expect(400);

      expect(Array.isArray(response.body.message)).toBe(true);
    });
  });

  describe('POST /api/auth/register', () => {
    it('crea la cuenta, la hashea con bcrypt y devuelve un token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Nueva Persona',
          email: 'nueva@crazysupporthub.test',
          password: 'Prueba1234',
        })
        .expect(201);

      expect(response.body.accessToken).toEqual(expect.any(String));

      const created = await prisma.user.findUniqueOrThrow({
        where: { email: 'nueva@crazysupporthub.test' },
      });
      expect(created.passwordHash).not.toBe('Prueba1234');
      expect(created.passwordHash).toMatch(/^\$2[aby]\$/);
      await expect(bcrypt.compare('Prueba1234', created.passwordHash)).resolves.toBe(true);
    });

    /** El registro público no debe ser una vía para crear administradores. */
    it('asigna siempre el rol agent', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ name: 'Otra Persona', email: 'otra@crazysupporthub.test', password: 'Prueba1234' })
        .expect(201);

      expect(response.body.user.role).toBe('agent');
    });

    it('rechaza con 400 un intento de colar el campo role', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Colada',
          email: 'colada@crazysupporthub.test',
          password: 'Prueba1234',
          role: 'admin',
        })
        .expect(400);

      expect(response.body.message).toContain('property role should not exist');
    });

    /**
     * La restricción de dominio vive en el DTO y no solo en el formulario: una
     * validación que solo existe en el navegador se salta con cualquier
     * cliente HTTP.
     */
    it.each([
      ['dominio ajeno', 'alguien@gmail.com'],
      ['dominio parecido', 'alguien@crazysupporthub.test.malo.com'],
      ['dominio con el punto cambiado', 'alguien@crazysupporthubXtest'],
    ])('rechaza con 400 un correo de %s', async (_caso, email) => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ name: 'Persona Externa', email, password: 'Prueba1234' })
        .expect(400);

      expect(response.body.message).toContain('Dirección de correo inválida');
    });

    it('acepta el dominio permitido escrito en mayúsculas', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Persona Interna',
          email: 'Persona.Interna@CrazySupportHub.TEST',
          password: 'Prueba1234',
        })
        .expect(201);

      // Se guarda normalizado en minúsculas.
      await expect(
        prisma.user.findUnique({ where: { email: 'persona.interna@crazysupporthub.test' } }),
      ).resolves.not.toBeNull();
    });

    it('responde 409 si el email ya existe', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ name: 'Duplicada', email: users.bruno.email, password: 'Prueba1234' })
        .expect(409);
    });
  });

  describe('GET /api/auth/me', () => {
    it('responde 401 sin token', async () => {
      await request(app.getHttpServer()).get('/api/auth/me').expect(401);
    });

    it('responde 401 con un token inválido', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer no.es.un.token')
        .expect(401);
    });

    it('devuelve el usuario autenticado con un token válido', async () => {
      const login = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: users.bruno.email, password: users.bruno.password });

      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({ email: users.bruno.email, role: 'agent' });
    });

    /**
     * La estrategia relee el usuario en cada petición: un token de alguien
     * borrado deja de valer sin esperar a que expire.
     */
    it('rechaza el token de un usuario que ya no existe', async () => {
      const login = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: users.carla.email, password: users.carla.password });

      await prisma.user.delete({ where: { id: users.carla.id } });

      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .expect(401);
    });
  });
});
