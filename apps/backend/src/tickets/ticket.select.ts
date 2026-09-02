import { Prisma } from '../../generated/prisma';

/**
 * Proyeccion unica de un ticket. Incluye creador y asignado como objetos
 * (no como ids sueltos) para que el frontend pinte nombres sin una segunda
 * llamada, y nunca arrastra el passwordHash de esos usuarios.
 */
export const TICKET_SELECT = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  category: true,
  tags: true,
  suggestedReply: true,
  enrichmentStatus: true,
  enrichedAt: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, name: true, email: true, role: true } },
  assignedTo: { select: { id: true, name: true, email: true, role: true } },
} satisfies Prisma.TicketSelect;

export type TicketDto = Prisma.TicketGetPayload<{ select: typeof TICKET_SELECT }>;
