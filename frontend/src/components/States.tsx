import type { ReactNode } from 'react';

/** Estados de UI compartidos: carga, vacío y error. */

export function Spinner() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: 16,
        height: 16,
        border: '2px solid var(--border)',
        borderTopColor: 'var(--brand)',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }}
    />
  );
}

export function FullPageLoader({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div
      role="status"
      style={{
        minHeight: '60vh',
        display: 'grid',
        placeItems: 'center',
        gap: '0.75rem',
        color: 'var(--text-muted)',
      }}
    >
      <div className="row" style={{ gap: '0.6rem' }}>
        <Spinner />
        <span>{label}</span>
      </div>
    </div>
  );
}

export function Loading({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div role="status" className="row" style={{ padding: '2rem', color: 'var(--text-muted)' }}>
      <Spinner />
      <span style={{ marginLeft: '0.5rem' }}>{label}</span>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
      <h2 style={{ marginBottom: '0.35rem' }}>{title}</h2>
      {description && <p className="muted" style={{ marginTop: 0 }}>{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div style={{ padding: '1.5rem' }} className="stack">
      <div className="alert" role="alert">
        {message}
      </div>
      {onRetry && (
        <div>
          <button type="button" className="btn btn-secondary" onClick={onRetry}>
            Reintentar
          </button>
        </div>
      )}
    </div>
  );
}
