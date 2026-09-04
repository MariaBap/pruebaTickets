import { Link, useParams } from 'react-router-dom';
import { useTicket, useUpdateTicket, useUsers } from '../api/tickets';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../auth/useAuth';
import {
  ENRICHMENT_LABELS,
  ROLE_LABELS,
  STATUS_LABELS,
  STATUS_VALUES,
  canAgentMoveTo,
  formatDate,
} from '../api/labels';
import type { Ticket, TicketStatus } from '../api/types';
import { ErrorState, FullPageLoader, Spinner } from '../components/States';
import {
  CategoryBadge,
  EnrichmentBadge,
  PriorityBadge,
  StatusBadge,
  Tags,
} from '../components/Badges';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '150px 1fr',
        gap: '0.75rem',
        padding: '0.5rem 0',
        alignItems: 'center',
      }}
    >
      <span className="muted">{label}</span>
      <span>{children}</span>
    </div>
  );
}

/**
 * Panel del enriquecimiento. Es la parte que refleja el estado asíncrono:
 * mientras n8n no ha respondido muestra la espera en vez de campos vacíos,
 * y se repuebla solo cuando el sondeo detecta que pasó a done.
 */
function EnrichmentPanel({ ticket }: { ticket: Ticket }) {
  const waiting = ticket.enrichmentStatus === 'pending' || ticket.enrichmentStatus === 'processing';

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <h2>Enriquecimiento</h2>
        <EnrichmentBadge status={ticket.enrichmentStatus} />
      </div>

      {waiting ? (
        <div
          className="row"
          style={{
            gap: '0.6rem',
            padding: '1.25rem',
            background: 'var(--neutral-bg)',
            borderRadius: 'var(--radius)',
            color: 'var(--text-muted)',
          }}
        >
          <Spinner />
          <span>Esperando la clasificación de n8n…</span>
        </div>
      ) : ticket.enrichmentStatus === 'failed' ? (
        <div className="alert" role="alert">
          El flujo de n8n no completó la clasificación de este ticket.
        </div>
      ) : (
        <>
          <Row label="Prioridad">
            <PriorityBadge priority={ticket.priority} />
          </Row>
          <Row label="Categoría">
            <CategoryBadge category={ticket.category} />
          </Row>
          <Row label="Etiquetas">
            <Tags tags={ticket.tags} />
          </Row>
          <Row label="Clasificado el">
            {ticket.enrichedAt ? (
              formatDate(ticket.enrichedAt)
            ) : (
              <span className="muted">—</span>
            )}
          </Row>

          {/* Solo se pinta si existe: el flujo de esta entrega no genera
              respuesta sugerida, pero los tickets del seed sí la traen. */}
          {ticket.suggestedReply && (
            <div style={{ marginTop: '0.75rem' }}>
              <span className="muted">Respuesta sugerida</span>
              <blockquote
                style={{
                  margin: '0.4rem 0 0',
                  padding: '0.85rem 1rem',
                  background: 'var(--neutral-bg)',
                  borderLeft: '3px solid var(--brand)',
                  borderRadius: 'var(--radius)',
                }}
              >
                {ticket.suggestedReply}
              </blockquote>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const ticketId = Number(id);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { data: ticket, isPending, isError, error, refetch } = useTicket(ticketId);
  const updateTicket = useUpdateTicket(ticketId);
  const usersQuery = useUsers(isAdmin);

  if (!Number.isInteger(ticketId) || ticketId <= 0) {
    return <ErrorState message="El identificador del ticket no es válido." />;
  }

  if (isPending) return <FullPageLoader label="Cargando el ticket…" />;

  if (isError) {
    return (
      <div className="stack">
        <ErrorState
          message={getErrorMessage(error, 'No se pudo cargar el ticket.')}
          onRetry={() => void refetch()}
        />
        <div className="back-bar">
          <Link to="/tickets" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
            ← Volver
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h1 style={{ maxWidth: '70%' }}>{ticket.title}</h1>
        <span className="muted">#{ticket.id}</span>
      </div>

      {updateTicket.isError && (
        <div className="alert" role="alert">
          {getErrorMessage(updateTicket.error, 'No se pudo actualizar el ticket.')}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1fr)',
          gap: '1rem',
          alignItems: 'start',
        }}
        className="detail-grid"
      >
        <div className="stack">
          <div className="card" style={{ padding: '1.25rem' }}>
            <h2 style={{ marginBottom: '0.5rem' }}>Descripción</h2>
            <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{ticket.description}</p>
          </div>

          <EnrichmentPanel ticket={ticket} />
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <h2 style={{ marginBottom: '0.5rem' }}>Detalles</h2>

          <Row label="Estado">
            <select
              className="select"
              value={ticket.status}
              disabled={updateTicket.isPending}
              onChange={(e) => updateTicket.mutate({ status: e.target.value as TicketStatus })}
              aria-label="Cambiar el estado del ticket"
            >
              {STATUS_VALUES.map((value) => (
                <option
                  key={value}
                  value={value}
                  // Un agente avanza open, in_progress y resolved en ese orden,
                  // y no puede cerrar. Se deshabilita lo que la API rechazaria.
                  disabled={!isAdmin && !canAgentMoveTo(ticket.status, value)}
                >
                  {STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </Row>

          <Row label="Asignado a">
            {isAdmin ? (
              <select
                className="select"
                value={ticket.assignedTo?.id ?? ''}
                disabled={updateTicket.isPending || usersQuery.isPending}
                onChange={(e) =>
                  updateTicket.mutate({
                    assignedToId: e.target.value ? Number(e.target.value) : null,
                  })
                }
                aria-label="Cambiar el responsable del ticket"
              >
                <option value="">Sin asignar</option>
                {usersQuery.data?.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name} ({ROLE_LABELS[candidate.role]})
                  </option>
                ))}
              </select>
            ) : ticket.assignedTo ? (
              ticket.assignedTo.name
            ) : (
              <span className="muted">Sin asignar</span>
            )}
          </Row>

          <Row label="Creado por">{ticket.createdBy.name}</Row>
          <Row label="Creado el">{formatDate(ticket.createdAt)}</Row>
          <Row label="Actualizado">{formatDate(ticket.updatedAt)}</Row>
          <Row label="Enriquecimiento">
            <span className="muted">{ENRICHMENT_LABELS[ticket.enrichmentStatus]}</span>
          </Row>
        </div>
      </div>

      <div className="row muted" style={{ gap: '0.5rem' }}>
        <StatusBadge status={ticket.status} />
        <span>·</span>
        <span>última actualización {formatDate(ticket.updatedAt)}</span>
      </div>

      <div className="back-bar">
        <Link to="/tickets" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
          ← Volver
        </Link>
      </div>
    </div>
  );
}
