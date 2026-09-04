import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTickets, type TicketFilters } from '../api/tickets';
import { getErrorMessage } from '../api/client';
import {
  CATEGORY_LABELS,
  CATEGORY_VALUES,
  PRIORITY_LABELS,
  PRIORITY_VALUES,
  STATUS_LABELS,
  STATUS_VALUES,
  formatDate,
} from '../api/labels';
import type { TicketCategory, TicketPriority, TicketStatus } from '../api/types';
import { EmptyState, ErrorState, Loading } from '../components/States';
import {
  CategoryBadge,
  EnrichmentBadge,
  PriorityBadge,
  StatusBadge,
  Tags,
} from '../components/Badges';

/**
 * Los filtros viven en la URL y no en el estado del componente: así una
 * búsqueda concreta se puede compartir o recargar sin perderla, y el botón
 * atrás del navegador funciona como se espera.
 */
function readFilters(params: URLSearchParams): TicketFilters {
  const asEnum = <T extends string>(value: string | null, allowed: readonly T[]): T | undefined =>
    value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;

  return {
    status: asEnum<TicketStatus>(params.get('status'), STATUS_VALUES),
    priority: asEnum<TicketPriority>(params.get('priority'), PRIORITY_VALUES),
    category: asEnum<TicketCategory>(params.get('category'), CATEGORY_VALUES),
    search: params.get('search') || undefined,
    page: Math.max(1, Number(params.get('page')) || 1),
    limit: 10,
    sortBy: params.get('sortBy') || 'createdAt',
    sortOrder: params.get('sortOrder') === 'asc' ? 'asc' : 'desc',
  };
}

export default function TicketsPage() {
  const [params, setParams] = useSearchParams();
  const filters = readFilters(params);

  // El input se mantiene local y solo se vuelca a la URL tras una pausa: sin
  // esto habría una petición por cada tecla pulsada.
  const [searchInput, setSearchInput] = useState(filters.search ?? '');

  useEffect(() => {
    const timer = setTimeout(() => {
      const current = params.get('search') ?? '';
      if (searchInput === current) return;
      const next = new URLSearchParams(params);
      if (searchInput) {
        next.set('search', searchInput);
      } else {
        next.delete('search');
      }
      next.delete('page');
      setParams(next, { replace: true });
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput, params, setParams]);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    // Cualquier cambio de filtro vuelve a la primera página: si estabas en la
    // página 3 y el nuevo filtro solo tiene 1, verías una página vacía.
    if (key !== 'page') next.delete('page');
    setParams(next);
  }

  function clearFilters() {
    setSearchInput('');
    setParams(new URLSearchParams());
  }

  const { data, isPending, isError, error, refetch, isFetching } = useTickets(filters);

  const hasFilters = Boolean(
    filters.status || filters.priority || filters.category || filters.search,
  );

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>Tickets</h1>
        <Link className="btn" to="/tickets/nuevo" style={{ textDecoration: 'none' }}>
          Nuevo Ticket
        </Link>
      </div>

      <div className="card" style={{ padding: '1rem' }}>
        <div className="filters">
          <div className="field" style={{ margin: 0 }}>
            <label className="label" htmlFor="search">
              Buscar
            </label>
            <input
              id="search"
              className="input"
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <div className="field" style={{ margin: 0 }}>
            <label className="label" htmlFor="status">
              Estado
            </label>
            <select
              id="status"
              className="select"
              value={filters.status ?? ''}
              onChange={(e) => setParam('status', e.target.value)}
            >
              <option value="">Todos</option>
              {STATUS_VALUES.map((value) => (
                <option key={value} value={value}>
                  {STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="field" style={{ margin: 0 }}>
            <label className="label" htmlFor="priority">
              Prioridad
            </label>
            <select
              id="priority"
              className="select"
              value={filters.priority ?? ''}
              onChange={(e) => setParam('priority', e.target.value)}
            >
              <option value="">Todas</option>
              {PRIORITY_VALUES.map((value) => (
                <option key={value} value={value}>
                  {PRIORITY_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="field" style={{ margin: 0 }}>
            <label className="label" htmlFor="category">
              Categoría
            </label>
            <select
              id="category"
              className="select"
              value={filters.category ?? ''}
              onChange={(e) => setParam('category', e.target.value)}
            >
              <option value="">Todas</option>
              {CATEGORY_VALUES.map((value) => (
                <option key={value} value={value}>
                  {CATEGORY_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={clearFilters}
            disabled={!hasFilters}
          >
            Borrar Filtros
          </button>
        </div>
      </div>

      <div className="card">
        {isPending ? (
          <Loading label="Cargando tickets…" />
        ) : isError ? (
          <ErrorState
            message={getErrorMessage(error, 'No se pudieron cargar los tickets.')}
            onRetry={() => void refetch()}
          />
        ) : data.data.length === 0 ? (
          <EmptyState
            title={hasFilters ? 'Ningún ticket coincide' : 'Todavía no hay tickets'}
            description={
              hasFilters
                ? 'Prueba a quitar algún filtro o a cambiar la búsqueda.'
                : 'Crea el primero para ver aquí cómo n8n lo clasifica.'
            }
            action={
              hasFilters ? (
                <button type="button" className="btn btn-secondary" onClick={clearFilters}>
                  Borrar Filtros
                </button>
              ) : (
                <Link className="btn" to="/tickets/nuevo" style={{ textDecoration: 'none' }}>
                  Nuevo Ticket
                </Link>
              )
            }
          />
        ) : (
          <>
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '32%' }}></th>
                    <th>Estado</th>
                    <th>Prioridad</th>
                    <th>Categoría</th>
                    <th>Enriquecimiento</th>
                    <th>Asignado</th>
                    <th>Creado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((ticket) => (
                    <tr key={ticket.id}>
                      <td>
                        <Link className="link-cell" to={`/tickets/${ticket.id}`}>
                          {ticket.title}
                        </Link>
                        <div style={{ marginTop: '0.3rem' }}>
                          <Tags tags={ticket.tags} />
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={ticket.status} />
                      </td>
                      <td>
                        <PriorityBadge priority={ticket.priority} />
                      </td>
                      <td>
                        <CategoryBadge category={ticket.category} />
                      </td>
                      <td>
                        <EnrichmentBadge status={ticket.enrichmentStatus} />
                      </td>
                      <td>
                        {ticket.assignedTo ? (
                          ticket.assignedTo.name
                        ) : (
                          <span className="muted">Sin asignar</span>
                        )}
                      </td>
                      <td className="muted">{formatDate(ticket.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <span className="muted">
                {data.meta.total} {data.meta.total === 1 ? 'ticket' : 'tickets'} · página{' '}
                {data.meta.page} de {data.meta.totalPages}
                {isFetching && ' · actualizando…'}
              </span>
              <div className="row">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={data.meta.page <= 1}
                  onClick={() => setParam('page', String(data.meta.page - 1))}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={data.meta.page >= data.meta.totalPages}
                  onClick={() => setParam('page', String(data.meta.page + 1))}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
