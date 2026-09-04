import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as bcrypt from 'bcrypt';
import {
  PrismaClient,
  Role,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  EnrichmentStatus,
} from '../generated/prisma';

/**
 * Seed a partir de `tickets-seed.json` (raiz del repo, no se modifica).
 *
 * Dos cuidados que el archivo impone:
 *  1. Las contrasenas vienen en texto plano a proposito; aqui se hashean con
 *     bcrypt y el texto plano nunca llega a la base de datos.
 *  2. Los `createdBy` / `assignedTo` son ids del propio JSON. Postgres genera
 *     los suyos, asi que se mapean explicitamente en vez de asumir que
 *     coinciden.
 */

const BCRYPT_ROUNDS = 10;
const SEED_FILE = join(__dirname, '..', '..', 'tickets-seed.json');

interface SeedUser {
  id: number;
  name: string;
  email: string;
  password: string;
  role: string;
}

interface SeedTicket {
  id: number;
  title: string;
  description: string;
  status: string;
  createdBy: number;
  assignedTo: number | null;
  priority: string | null;
  category: string | null;
  tags: string[];
  suggestedReply: string | null;
  enrichmentStatus: string;
  enrichedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SeedFile {
  users: SeedUser[];
  tickets: SeedTicket[];
}

const prisma = new PrismaClient();

async function main() {
  const raw = readFileSync(SEED_FILE, 'utf8');
  const data = JSON.parse(raw) as SeedFile;

  console.log(
    `Seed: ${data.users.length} usuarios y ${data.tickets.length} tickets desde tickets-seed.json`,
  );

  // Borra primero los tickets por la FK hacia users. El seed es repetible.
  await prisma.ticket.deleteMany();
  await prisma.user.deleteMany();

  // --- Usuarios ------------------------------------------------------------
  // Map de id-del-JSON -> id real de Postgres.
  const userIdMap = new Map<number, number>();

  for (const seedUser of data.users) {
    const passwordHash = await bcrypt.hash(seedUser.password, BCRYPT_ROUNDS);

    const created = await prisma.user.create({
      data: {
        name: seedUser.name,
        email: seedUser.email.toLowerCase(),
        passwordHash,
        role: seedUser.role as Role,
      },
    });

    userIdMap.set(seedUser.id, created.id);
    console.log(`  usuario #${seedUser.id} -> id ${created.id}  ${created.email} (${created.role})`);
  }

  // --- Tickets -------------------------------------------------------------
  for (const seedTicket of data.tickets) {
    const createdById = userIdMap.get(seedTicket.createdBy);
    if (createdById === undefined) {
      throw new Error(
        `Ticket ${seedTicket.id}: createdBy=${seedTicket.createdBy} no existe en users del seed.`,
      );
    }

    const assignedToId =
      seedTicket.assignedTo === null ? null : (userIdMap.get(seedTicket.assignedTo) ?? null);
    if (seedTicket.assignedTo !== null && assignedToId === null) {
      throw new Error(
        `Ticket ${seedTicket.id}: assignedTo=${seedTicket.assignedTo} no existe en users del seed.`,
      );
    }

    await prisma.ticket.create({
      data: {
        title: seedTicket.title,
        description: seedTicket.description,
        status: seedTicket.status as TicketStatus,
        createdById,
        assignedToId,
        priority: seedTicket.priority ? (seedTicket.priority as TicketPriority) : null,
        category: seedTicket.category ? (seedTicket.category as TicketCategory) : null,
        tags: seedTicket.tags,
        suggestedReply: seedTicket.suggestedReply,
        enrichmentStatus: seedTicket.enrichmentStatus as EnrichmentStatus,
        enrichedAt: seedTicket.enrichedAt ? new Date(seedTicket.enrichedAt) : null,
        // Fechas explicitas del JSON: sin esto Prisma pondria now() y se
        // perderia la posibilidad de demostrar el ordenamiento por fecha.
        createdAt: new Date(seedTicket.createdAt),
        updatedAt: new Date(seedTicket.updatedAt),
      },
    });
  }

  const pending = data.tickets.filter((t) => t.enrichmentStatus === 'pending').length;
  const done = data.tickets.filter((t) => t.enrichmentStatus === 'done').length;
  console.log(`  tickets insertados: ${data.tickets.length} (${pending} pending, ${done} done)`);
  console.log('Seed completado.');
}

main()
  .catch((error) => {
    console.error('Seed fallido:', error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
