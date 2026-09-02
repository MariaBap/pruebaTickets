import { Link, NavLink, Outlet } from 'react-router-dom';
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
          <Link
            to="/tickets"
            style={{ fontWeight: 700, color: 'var(--text)', textDecoration: 'none' }}
          >
            CrazySupportHub
          </Link>

          <nav className="row" style={{ gap: '0.9rem' }}>
            <NavLink
              to="/tickets"
              style={({ isActive }) => ({
                color: isActive ? 'var(--brand)' : 'var(--text-muted)',
                fontWeight: isActive ? 600 : 400,
                textDecoration: 'none',
              })}
            >
              Tickets
            </NavLink>
            <NavLink
              to="/tickets/nuevo"
              style={({ isActive }) => ({
                color: isActive ? 'var(--brand)' : 'var(--text-muted)',
                fontWeight: isActive ? 600 : 400,
                textDecoration: 'none',
              })}
            >
              Nuevo ticket
            </NavLink>
          </nav>

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
