import { useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

/** Menú del usuario: el nombre despliega las acciones de sesión. */
function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  // Cierra al hacer clic fuera o con Escape, que es lo que se espera de un menú.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function handleLogout() {
    setOpen(false);
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="user-menu" ref={container}>
      <button
        type="button"
        className="user-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {user?.name}
        <svg
          className="user-menu-caret"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          aria-hidden="true"
        >
          <path
            d="M2.5 4.5L6 8l3.5-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="user-menu-panel" role="menu">
          <button type="button" className="user-menu-item" role="menuitem" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

export function Layout() {
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
          <span style={{ fontWeight: 700 }}>CrazySupportHub</span>

          <div style={{ marginLeft: 'auto' }}>
            <UserMenu />
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '1.5rem' }}>
        <Outlet />
      </main>
    </div>
  );
}
