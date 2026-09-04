import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div style={{ minHeight: '100vh' }}>
      <header
        style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          padding: '0.75rem 1.5rem',
        }}
      >
        <div
          style={{
            maxWidth: 1080,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
          }}
        >
          {/* El nombre es también la vuelta al inicio; sin pestañas de menú. */}
          <Link
            to="/tickets"
            style={{ fontWeight: 700, color: 'var(--text)', textDecoration: 'none' }}
          >
            CrazySupportHub
          </Link>

          <div className="row" style={{ marginLeft: 'auto', gap: '0.75rem' }}>
            <span className="row" style={{ gap: '0.4rem' }}>
              <span>{user?.name}</span>
              <span className="badge">{user?.role}</span>
            </span>
            <button type="button" className="btn btn-secondary" onClick={logout}>
              Salir
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '1.5rem' }}>
        <Outlet />
      </main>
    </div>
  );
}
