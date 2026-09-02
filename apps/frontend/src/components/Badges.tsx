import type {
  EnrichmentStatus,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '../api/types';
import {
  CATEGORY_LABELS,
  ENRICHMENT_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from '../api/labels';
import { Spinner } from './States';

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <span className="badge">{STATUS_LABELS[status]}</span>;
}

export function PriorityBadge({ priority }: { priority: TicketPriority | null }) {
  if (!priority) return <span className="muted">—</span>;
  const tone =
    priority === 'urgent' || priority === 'high'
      ? 'badge-failed'
      : priority === 'medium'
        ? 'badge-pending'
        : 'badge-done';
  return <span className={`badge ${tone}`}>{PRIORITY_LABELS[priority]}</span>;
}

export function CategoryBadge({ category }: { category: TicketCategory | null }) {
  if (!category) return <span className="muted">—</span>;
  return <span className="badge">{CATEGORY_LABELS[category]}</span>;
}

/**
 * El estado del enriquecimiento es lo que hace visible la integración con n8n,
 * así que los cuatro estados se distinguen a simple vista y los dos que aún
 * están en curso llevan un indicador de actividad.
 */
export function EnrichmentBadge({ status }: { status: EnrichmentStatus }) {
  const tone = `badge-${status}`;
  const inProgress = status === 'pending' || status === 'processing';
  return (
    <span className={`badge ${tone}`} title={`Enriquecimiento: ${ENRICHMENT_LABELS[status]}`}>
      {inProgress && <Spinner />}
      {ENRICHMENT_LABELS[status]}
    </span>
  );
}

export function Tags({ tags }: { tags: string[] }) {
  if (tags.length === 0) return <span className="muted">—</span>;
  return (
    <span className="row" style={{ flexWrap: 'wrap', gap: '0.25rem' }}>
      {tags.map((tag) => (
        <span key={tag} className="badge">
          {tag}
        </span>
      ))}
    </span>
  );
}
