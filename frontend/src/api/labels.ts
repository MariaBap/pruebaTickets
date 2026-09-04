// Etiquetas en español para los enums del contrato.
// Los valores que viajan a la API siguen siendo los del enunciado.

import type {
  EnrichmentStatus,
  Role,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from './types';

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Abierto',
  in_progress: 'En progreso',
  resolved: 'Resuelto',
  closed: 'Cerrado',
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
};

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  billing: 'Facturación',
  technical: 'Técnico',
  account: 'Cuenta',
  other: 'Otro',
};

export const ENRICHMENT_LABELS: Record<EnrichmentStatus, string> = {
  pending: 'Pendiente',
  processing: 'Procesando',
  done: 'Listo',
  failed: 'Fallido',
};

/** Las cuentas son internas: solo se admite este dominio. La API lo exige también. */
export const ALLOWED_EMAIL_DOMAIN = '@crazysupporthub.test';

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'administrador',
  agent: 'agente',
};

/**
 * Transiciones que la API admite a un agente. Se repiten aquí para poder
 * deshabilitar las opciones imposibles en el selector, pero la regla que manda
 * es la del backend: esto solo evita ofrecer algo que va a devolver 403.
 */
export const AGENT_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: ['in_progress'],
  in_progress: ['resolved'],
  resolved: [],
  closed: [],
};

export function canAgentMoveTo(from: TicketStatus, to: TicketStatus): boolean {
  return from === to || AGENT_TRANSITIONS[from].includes(to);
}

export const STATUS_VALUES = Object.keys(STATUS_LABELS) as TicketStatus[];
export const PRIORITY_VALUES = Object.keys(PRIORITY_LABELS) as TicketPriority[];
export const CATEGORY_VALUES = Object.keys(CATEGORY_LABELS) as TicketCategory[];

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
