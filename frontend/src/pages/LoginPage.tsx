import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { getErrorMessage } from '../api/client';
import { ALLOWED_EMAIL_DOMAIN } from '../api/labels';
import { FullPageLoader, Spinner } from '../components/States';
import { PasswordField } from '../components/PasswordField';

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

          <PasswordField
            id="password"
            label="Contraseña"
            value={password}
            autoComplete="current-password"
            error={fieldErrors.password}
            onChange={(value) => {
              setPassword(value);
              clearFieldError('password');
            }}
          />

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
            className="btn"
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
