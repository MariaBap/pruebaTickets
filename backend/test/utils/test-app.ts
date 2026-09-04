import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app-setup';
import { PrismaService } from '../../src/prisma/prisma.service';
import { N8nDispatcherService, TicketCreatedPayload } from '../../src/n8n/n8n-dispatcher.service';
import { Role } from '../../generated/prisma';

/**
 * Doble del despachador de n8n.
 *
 * Los tests no levantan n8n: lo que interesa comprobar es que la API lo llama
 * con el payload del contrato, no que n8n conteste. Guarda cada disparo para
 * poder afirmarlo.
 */
export class N8nDispatcherSpy {
  readonly dispatches: TicketCreatedPayload[] = [];

  dispatch(payload: TicketCreatedPayload): void {
    this.dispatches.push(payload);
  }

  reset(): void {
    this.dispatches.length = 0;
  }
}

interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
  n8n: N8nDispatcherSpy;
}

export async function createTestApp(): Promise<TestContext> {
  const n8n = new N8nDispatcherSpy();

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(N8nDispatcherService)
    .useValue(n8n)
    .compile();

  const app = moduleRef.createNestApplication();
  // Misma configuración global que produccion: sin esto un test podría pasar
  // contra un comportamiento que la app real no tiene.
  configureApp(app);
  await app.init();

  return { app, prisma: app.get(PrismaService), n8n };
}

/** Deja la base vacía. Los tickets van primero por la FK hacia users. */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.ticket.deleteMany();
  await prisma.user.deleteMany();
}

export interface SeededUser {
  id: number;
  email: string;
  password: string;
  role: Role;
}

/**
 * Usuarios mínimos para los tests: un admin y dos agentes, igual que el seed
 * real, para poder comprobar el aislamiento entre agentes.
 */
export async function seedUsers(prisma: PrismaService): Promise<Record<string, SeededUser>> {
  const password = 'Prueba1234';
  const passwordHash = await bcrypt.hash(password, 10);

  const create = async (name: string, email: string, role: Role): Promise<SeededUser> => {
    const user = await prisma.user.create({ data: { name, email, passwordHash, role } });
    return { id: user.id, email, password, role };
  };

  return {
    admin: await create('Admin Prueba', 'admin@crazysupporthub.test', Role.admin),
    bruno: await create('Bruno Prueba', 'bruno@crazysupporthub.test', Role.agent),
    carla: await create('Carla Prueba', 'carla@crazysupporthub.test', Role.agent),
  };
}
