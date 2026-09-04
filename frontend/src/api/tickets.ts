import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type {
  Paginated,
  Ticket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  User,
} from './types';

export interface TicketFilters {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  search?: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

/**
 * Los filtros forman parte de la clave de cache: cambiar un filtro es otra
 * consulta, no la misma con otro resultado.
 */
const ticketKeys = {
  all: ['tickets'] as const,
  list: (filters: TicketFilters) => ['tickets', 'list', filters] as const,
  detail: (id: number) => ['tickets', 'detail', id] as const,
};

export function useTickets(filters: TicketFilters) {
  return useQuery({
    queryKey: ticketKeys.list(filters),
    queryFn: async () => {
      const { data } = await api.get<Paginated<Ticket>>('/tickets', { params: filters });
      return data;
    },
    // Mantiene la página anterior visible mientras llega la nueva, para que la
    // tabla no parpadee a vacío al pasar de página o cambiar un filtro.
    placeholderData: (previous) => previous,
  });
}

export function useTicket(id: number) {
  return useQuery({
    queryKey: ticketKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<Ticket>(`/tickets/${id}`);
      return data;
    },
    /**
     * El enriquecimiento lo produce n8n de forma asíncrona: mientras el ticket
     * no esté resuelto se vuelve a consultar cada 2 s, y en cuanto llega a done
     * o failed el sondeo se detiene solo.
     */
    refetchInterval: (query) => {
      const status = query.state.data?.enrichmentStatus;
      return status === 'pending' || status === 'processing' ? 2000 : false;
    },
  });
}

export function useUsers(enabled: boolean) {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get<User[]>('/users');
      return data;
    },
    // Solo el admin puede pedir esta lista; para un agent daría 403.
    enabled,
  });
}

interface CreateTicketInput {
  title: string;
  description: string;
  assignedToId?: number;
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTicketInput) => {
      const { data } = await api.post<Ticket>('/tickets', input);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ticketKeys.all });
    },
  });
}

interface UpdateTicketInput {
  status?: TicketStatus;
  assignedToId?: number | null;
}

export function useUpdateTicket(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateTicketInput) => {
      const { data } = await api.patch<Ticket>(`/tickets/${id}`, input);
      return data;
    },
    onSuccess: (ticket) => {
      queryClient.setQueryData(ticketKeys.detail(id), ticket);
      void queryClient.invalidateQueries({ queryKey: ['tickets', 'list'] });
    },
  });
}
