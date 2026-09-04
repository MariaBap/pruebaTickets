import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { getErrorMessage, getFieldErrors } from '../api/client';
import { splitServerErrors } from '../api/field-errors';
import { ALLOWED_EMAIL_DOMAIN } from '../api/labels';
import { FullPageLoader, Spinner } from '../components/States';
import { PasswordField } from '../components/PasswordField';

type FieldName = 'name' | 'email' | 'password';
type FieldErrors = Partial<Record<FieldName, string>>;

/** Qué campo reclama cada mensaje de error de la API. */
const FIELD_MATCHERS = [
  ['name', /nombre/i],
  ['email', /correo/i],
  ['password', /contraseña/i],
] as const satisfies ReadonlyArray<readonly [FieldName, RegExp]>;

export default function RegisterPage() {
  const { user, loading, register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        const { fields, rest } = splitServerErrors(serverMessages, FIELD_MATCHERS);
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

          <PasswordField
            id="password"
            label="Contraseña"
            value={password}
            autoComplete="new-password"
            error={errors.password}
            hint="Mínimo 8 caracteres, con al menos una letra y un número."
            onChange={(value) => {
              setPassword(value);
              clearError('password');
            }}
          />

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
            Ya tengo una cuenta
          </Link>
        </form>
      </div>
    </main>
  );
}
