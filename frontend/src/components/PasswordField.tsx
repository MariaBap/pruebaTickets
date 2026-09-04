import { useState } from 'react';

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** 'current-password' al iniciar sesión, 'new-password' al registrarse. */
  autoComplete: 'current-password' | 'new-password';
  error?: string;
  /** Texto de ayuda que se muestra cuando no hay error. */
  hint?: string;
}

const EyeIcon = ({ crossed }: { crossed: boolean }) => (
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
    {crossed ? (
      <>
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6a2 2 0 002.8 2.8" />
        <path d="M9.4 5.2A9.5 9.5 0 0112 5c5 0 9 4.5 9 7 0 .9-.6 2.1-1.6 3.3" />
        <path d="M6.2 6.7C3.9 8.2 3 10.3 3 12c0 2.5 4 7 9 7 1.4 0 2.6-.3 3.7-.8" />
      </>
    ) : (
      <>
        <path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    )}
  </svg>
);

/**
 * Campo de contraseña con el interruptor de mostrar u ocultar.
 *
 * El interruptor está siempre presente, no solo cuando hay texto escrito, y
 * sustituye al ojo nativo de Edge y Chrome, que aparece y desaparece solo
 * (se oculta desde el CSS con ::-ms-reveal).
 */
export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  error,
  hint,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>

      <div className="input-with-action">
        <input
          id={id}
          className="input"
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
        />
        <button
          type="button"
          className="input-action"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Ocultar la contraseña' : 'Mostrar la contraseña'}
          aria-pressed={visible}
          title={visible ? 'Ocultar la contraseña' : 'Mostrar la contraseña'}
        >
          <EyeIcon crossed={visible} />
        </button>
      </div>

      {error ? (
        <span className="field-error" id={`${id}-error`}>
          {error}
        </span>
      ) : (
        hint && (
          <span className="hint" id={`${id}-hint`}>
            {hint}
          </span>
        )
      )}
    </div>
  );
}
