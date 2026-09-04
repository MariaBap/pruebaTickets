import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCreateTicket, useUsers } from '../api/tickets';
import { getErrorMessage, getFieldErrors } from '../api/client';
import { useAuth } from '../auth/useAuth';
import { ROLE_LABELS } from '../api/labels';
import { Spinner } from '../components/States';

type FieldName = 'title' | 'description' | 'assignedToId';
type FieldErrors = Partial<Record<FieldName, string>>;

/** Límites alineados con los DTO del backend, para avisar antes de enviar. */
const LIMITS = {
  title: { min: 5, max: 150 },
  description: { min: 10, max: 3000 },
};

/**
 * Reparte los errores de validación que devuelve la API entre sus campos.
 * El backend contesta con una lista de mensajes; sin este reparto, todos
 * acabarían en el aviso general y no debajo del campo que los provoca.
 */
function mapServerErrors(messages: string[]): { fields: FieldErrors; rest: string[] } {
  const fields: FieldErrors = {};
  const rest: string[] = [];

  for (const message of messages) {
    const lower = message.toLowerCase();
    if (lower.includes('título') || lower.includes('titulo')) {
      fields.title ??= message;
    } else if (lower.includes('descripción') || lower.includes('descripcion')) {
      fields.description ??= message;
    } else if (lower.includes('asignado')) {
      fields.assignedToId ??= message;
    } else {
      rest.push(message);
    }
  }

  return { fields, rest };
}

export default function NewTicketPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Solo el admin puede pedir la lista de usuarios; para un agent daría 403.
  const usersQuery = useUsers(isAdmin);
  const createTicket = useCreateTicket();

  function clearError(field: FieldName) {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function validate(): boolean {
    const next: FieldErrors = {};
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();

    if (!cleanTitle) {
      next.title = 'El título es obligatorio.';
    } else if (cleanTitle.length < LIMITS.title.min) {
      next.title = `El título debe tener al menos ${LIMITS.title.min} caracteres.`;
    } else if (cleanTitle.length > LIMITS.title.max) {
      next.title = `El título no puede superar los ${LIMITS.title.max} caracteres.`;
    }

    if (!cleanDescription) {
      next.description = 'La descripción es obligatoria.';
    } else if (cleanDescription.length < LIMITS.description.min) {
      next.description = `La descripción debe tener al menos ${LIMITS.description.min} caracteres.`;
    } else if (cleanDescription.length > LIMITS.description.max) {
      next.description = `La descripción no puede superar los ${LIMITS.description.max} caracteres.`;
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;

    try {
      const ticket = await createTicket.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        ...(assignedToId ? { assignedToId: Number(assignedToId) } : {}),
      });
      // Se va al detalle: es donde se ve llegar el enriquecimiento de n8n.
      navigate(`/tickets/${ticket.id}`);
    } catch (error) {
      const serverMessages = getFieldErrors(error);
      if (serverMessages.length > 0) {
        const { fields, rest } = mapServerErrors(serverMessages);
        setErrors(fields);
        setFormError(rest.length > 0 ? rest.join(' ') : null);
      } else {
        setFormError(getErrorMessage(error, 'No se pudo crear el ticket.'));
      }
    }
  }

  return (
    <div className="stack">
      <h1>Nuevo Ticket</h1>

      <div className="card" style={{ padding: '1.5rem' }}>
        <form onSubmit={handleSubmit} noValidate>
          {formError && (
            <div className="alert" role="alert" style={{ marginBottom: '1rem' }}>
              {formError}
            </div>
          )}

          <div className="field">
            <label className="label" htmlFor="title">
              Título
            </label>
            <input
              id="title"
              className="input"
              maxLength={LIMITS.title.max}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                clearError('title');
              }}
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? 'title-error' : 'title-hint'}
              placeholder="Resume el problema en una línea"
            />
            {errors.title ? (
              <span className="field-error" id="title-error">
                {errors.title}
              </span>
            ) : (
              <span className="hint" id="title-hint">
                {title.trim().length}/{LIMITS.title.max} caracteres
              </span>
            )}
          </div>

          <div className="field">
            <label className="label" htmlFor="description">
              Descripción
            </label>
            <textarea
              id="description"
              className="textarea"
              rows={8}
              maxLength={LIMITS.description.max}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                clearError('description');
              }}
              aria-invalid={Boolean(errors.description)}
              aria-describedby={errors.description ? 'description-error' : 'description-hint'}
              placeholder="Describe el problema"
            />
            {errors.description ? (
              <span className="field-error" id="description-error">
                {errors.description}
              </span>
            ) : (
              <span className="hint" id="description-hint">
                {description.trim().length}/{LIMITS.description.max} caracteres
              </span>
            )}
          </div>

          {isAdmin && (
            <div className="field">
              <label className="label" htmlFor="assignedToId">
                Asignar a
              </label>
              <select
                id="assignedToId"
                className="select"
                value={assignedToId}
                onChange={(e) => {
                  setAssignedToId(e.target.value);
                  clearError('assignedToId');
                }}
                aria-invalid={Boolean(errors.assignedToId)}
                aria-describedby={errors.assignedToId ? 'assignedToId-error' : undefined}
                disabled={usersQuery.isPending}
              >
                <option value="">Sin asignar</option>
                {usersQuery.data?.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name} ({ROLE_LABELS[candidate.role]})
                  </option>
                ))}
              </select>
              {errors.assignedToId && (
                <span className="field-error" id="assignedToId-error">
                  {errors.assignedToId}
                </span>
              )}
            </div>
          )}

          <button type="submit" className="btn" disabled={createTicket.isPending}>
            {createTicket.isPending ? (
              <span className="row">
                <Spinner /> <span style={{ marginLeft: '0.5rem' }}>Creando…</span>
              </span>
            ) : (
              'Crear ticket'
            )}
          </button>
        </form>
      </div>

      <div className="back-bar">
        <Link to="/tickets" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
          ← Volver
        </Link>
      </div>
    </div>
  );
}
