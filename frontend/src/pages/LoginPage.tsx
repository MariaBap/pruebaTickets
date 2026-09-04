import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { getErrorMessage } from '../api/client';
import { ALLOWED_EMAIL_DOMAIN } from '../api/labels';
import { FullPageLoader, Spinner } from '../components/States';

interface LocationState {
  from?: string;
}

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (loading) return <FullPageLoader label="Comprobando la sesión..." />;

  // Si ya hay sesion, esta pantalla no tiene sentido.
  if (user) return <Navigate to="/tickets" replace />;

  /** Limpia el error de un campo en cuanto se empieza a corregirlo. */
  function clearFieldError(field: keyof typeof fieldErrors) {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function validate(): boolean {
    const errors: typeof fieldErrors = {};
    const value = email.trim().toLowerCase();

    if (!value) {
      errors.email = 'Campo obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors.email = 'Escribe un correo válido.';
    } else if (!value.endsWith(ALLOWED_EMAIL_DOMAIN)) {
      errors.email = 'Dirección de correo inválida';
    }

    if (!password) errors.password = 'Campo obligatorio';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      const target = (location.state as LocationState | null)?.from ?? '/tickets';
      navigate(target, { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error, 'No se pudo iniciar sesión.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '1.5rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: 380, padding: '1.75rem' }}>
        <h1 style={{ textAlign: 'center', fontWeight: 800, marginBottom: '1.75rem' }}>
          CrazySupportHub
        </h1>

        <form onSubmit={handleSubmit} noValidate>
          {formError && (
            <div className="alert" role="alert" style={{ marginBottom: '1rem' }}>
              {formError}
            </div>
          )}

          <div className="field">
            <label className="label" htmlFor="email">
              Correo
            </label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearFieldError('email');
              }}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            />
            {fieldErrors.email && (
              <span className="field-error" id="email-error">
                {fieldErrors.email}
              </span>
            )}
          </div>

          <div className="field">
            <label className="label" htmlFor="password">
              Contraseña
            </label>
            {/* El interruptor esta siempre presente, no solo al escribir. */}
            <div className="input-with-action">
              <input
                id="password"
                className="input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError('password');
                }}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
              />
              <button
                type="button"
                className="input-action"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Ocultar la contraseña' : 'Mostrar la contraseña'}
                aria-pressed={showPassword}
                title={showPassword ? 'Ocultar la contraseña' : 'Mostrar la contraseña'}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none"
                    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3l18 18" />
                    <path d="M10.6 10.6a2 2 0 002.8 2.8" />
                    <path d="M9.4 5.2A9.5 9.5 0 0112 5c5 0 9 4.5 9 7 0 .9-.6 2.1-1.6 3.3" />
                    <path d="M6.2 6.7C3.9 8.2 3 10.3 3 12c0 2.5 4 7 9 7 1.4 0 2.6-.3 3.7-.8" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none"
                    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </svg>
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <span className="field-error" id="password-error">
                {fieldErrors.password}
              </span>
            )}
          </div>

          <button type="submit" className="btn" style={{ width: '100%' }} disabled={submitting}>
            {submitting ? (
              <span className="row" style={{ justifyContent: 'center' }}>
                <Spinner /> <span style={{ marginLeft: '0.5rem' }}>Entrando...</span>
              </span>
            ) : (
              'Entrar'
            )}
          </button>

          <Link
            to="/registro"
            className="btn btn-secondary"
            style={{
              width: '100%',
              marginTop: '0.6rem',
              display: 'block',
              textAlign: 'center',
              textDecoration: 'none',
            }}
          >
            Regístrate
          </Link>
        </form>
      </div>
    </main>
  );
}
