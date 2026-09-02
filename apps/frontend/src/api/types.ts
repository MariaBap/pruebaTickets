// Tipos del contrato con la API. Reflejan los enums que fija el enunciado.

export type Role = 'admin' | 'agent';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketCategory = 'billing' | 'technical' | 'account' | 'other';
export type EnrichmentStatus = 'pending' | 'processing' | 'done' | 'failed';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  createdAt?: string;
}

export interface Ticket {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority | null;
  category: TicketCategory | null;
  tags: string[];
  suggestedReply: string | null;
  enrichmentStatus: EnrichmentStatus;
  enrichedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: User;
  assignedTo: User | null;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface AuthResult {
  accessToken: string;
  user: User;
}

/** Forma unica de error que devuelve el filtro global de la API. */
export interface ApiError {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}
