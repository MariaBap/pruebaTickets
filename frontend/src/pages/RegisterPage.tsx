import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { getErrorMessage, getFieldErrors } from '../api/client';
import { ALLOWED_EMAIL_DOMAIN } from '../api/labels';
import { FullPageLoader, Spinner } from '../components/States';

type FieldName = 'name' | 'email' | 'password';
type FieldErrors = Partial<Record<FieldName, string>>;

/**
 * Reparte por campo los errores que devuelve la API. El backend contesta con
 * una lista de mensajes; sin este reparto todos acabarían en el aviso general
 * en vez de debajo del campo que los provoca.
 */
function mapServerErrors(messages: string[]): { fields: FieldErrors; rest: string[] } {
  const fields: FieldErrors = {};
  const rest: string[] = [];

  for (const message of messages) {
    const lower = message.toLowerCase();
    if (lower.includes('nombre')) {
      fields.name ??= message;
    } else if (lower.includes('correo')) {
      fields.email ??= message;
    } else if (lower.includes('contraseña')) {
      fields.password ??= message;
    } else {
      rest.push(message);
    }
  }

  return { fields, rest };
}

export default function RegisterPage() {
  const { user, loading, register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <FullPageLoader label="Comprobando la sesión..." />;
  if (user) return <Navigate to="/tickets" replace />;

  function clearError(field: FieldName) {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  /** Mismas reglas que los DTO del backend, para avisar antes de enviar. */
  function validate(): boolean {
    const next: FieldErrors = {};
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      next.name = 'Campo obligatorio';
    } else if (cleanName.length < 2) {
      next.name = 'El nombre debe tener al menos 2 caracteres.';
    }

    if (!cleanEmail) {
      next.email = 'Campo obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      next.email = 'Dirección de correo inválida';
    } else if (!cleanEmail.endsWith(ALLOWED_EMAIL_DOMAIN)) {
      next.email = 'Dirección de correo inválida';
    }

    if (!password) {
      next.password = 'Campo obligatorio';
    } else if (password.length < 8) {
      next.password = 'La contraseña debe tener al menos 8 caracteres.';
    } else if (!/[A-Za-z]/.test(password)) {
      next.password = 'La contraseña debe incluir al menos una letra.';
    } else if (!/\d/.test(password)) {
      next.password = 'La contraseña debe incluir al menos un número.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      await register(name.trim(), email.trim().toLowerCase(), password);
      navigate('/tickets', { replace: true });
    } catch (error) {
      const serverMessages = getFieldErrors(error);
      if (serverMessages.length > 0) {
        const { fields, rest } = mapServerErrors(serverMessages);
        setErrors(fields);
        setFormError(rest.length > 0 ? rest.join(' ') : null);
      } else {
        setFormError(getErrorMessage(error, 'No se pudo crear la cuenta.'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '1.5rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: 380, padding: '1.75rem' }}>
        <h1 style={{ textAlign: 'center', fontWeight: 800, marginBottom: '1.75rem' }}>
          Crear cuenta
        </h1>

        <form onSubmit={handleSubmit} noValidate>
          {formError && (
            <div className="alert" role="alert" style={{ marginBottom: '1rem' }}>
              {formError}
            </div>
          )}

          <div className="field">
            <label className="label" htmlFor="name">
              Nombre
            </label>
            <input
              id="name"
              className="input"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearError('name');
              }}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'name-error' : undefined}
            />
            {errors.name && (
              <span className="field-error" id="name-error">
                {errors.name}
              </span>
            )}
          </div>

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
                clearError('email');
              }}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <span className="field-error" id="email-error">
                {errors.email}
              </span>
            )}
          </div>

          <div className="field">
            <label className="label" htmlFor="password">
              Contraseña
            </label>
            <div className="input-with-action">
              <input
                id="password"
                className="input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearError('password');
                }}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'password-error' : 'password-hint'}
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
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 3l18 18" />
                    <path d="M10.6 10.6a2 2 0 002.8 2.8" />
                    <path d="M9.4 5.2A9.5 9.5 0 0112 5c5 0 9 4.5 9 7 0 .9-.6 2.1-1.6 3.3" />
                    <path d="M6.2 6.7C3.9 8.2 3 10.3 3 12c0 2.5 4 7 9 7 1.4 0 2.6-.3 3.7-.8" />
                  </svg>
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password ? (
              <span className="field-error" id="password-error">
                {errors.password}
              </span>
            ) : (
              <span className="hint" id="password-hint">
                Mínimo 8 caracteres, con al menos una letra y un número.
              </span>
            )}
          </div>

          <button type="submit" className="btn" style={{ width: '100%' }} disabled={submitting}>
            {submitting ? (
              <span className="row" style={{ justifyContent: 'center' }}>
                <Spinner /> <span style={{ marginLeft: '0.5rem' }}>Creando cuenta...</span>
              </span>
            ) : (
              'Crear cuenta'
            )}
          </button>

          <Link
            to="/login"
            className="btn"
            style={{
              width: '100%',
              marginTop: '0.6rem',
              display: 'block',
              textAlign: 'center',
              textDecoration: 'none',
            }}
          >
            Ya tengo cuenta
          </Link>
        </form>
      </div>
    </main>
  );
}
