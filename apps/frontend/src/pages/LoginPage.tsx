import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { getErrorMessage } from '../api/client';
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
    if (!email.trim()) errors.email = 'El email es obligatorio.';
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = 'Escribe un email válido.';
    if (!password) errors.password = 'La contraseña es obligatoria.';
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
        <h1 style={{ marginBottom: '0.25rem' }}>CrazySupportHub</h1>
        <p className="muted" style={{ marginTop: 0, marginBottom: '1.5rem' }}>
          Inicia sesión para gestiónar los tickets.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          {formError && (
            <div className="alert" role="alert" style={{ marginBottom: '1rem' }}>
              {formError}
            </div>
          )}

          <div className="field">
            <label className="label" htmlFor="email">
              Email
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
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearFieldError('password');
              }}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            />
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
        </form>
      </div>
    </main>
  );
}
