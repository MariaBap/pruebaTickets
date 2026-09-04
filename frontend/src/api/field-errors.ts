/**
 * Reparte por campo la lista de errores que devuelve la API.
 *
 * El backend contesta con un array de mensajes, sin decir a qué campo
 * pertenece cada uno. Sin este reparto todos acabarían en el aviso general del
 * formulario en vez de debajo del campo que los provoca, que es justo lo que
 * pide el enunciado.
 *
 * Cada pantalla aporta su propia tabla de coincidencias porque solo ella sabe
 * qué campos tiene.
 */
export function splitServerErrors<TField extends string>(
  messages: string[],
  matchers: ReadonlyArray<readonly [TField, RegExp]>,
): { fields: Partial<Record<TField, string>>; rest: string[] } {
  const fields: Partial<Record<TField, string>> = {};
  const rest: string[] = [];

  for (const message of messages) {
    const match = matchers.find(([, pattern]) => pattern.test(message));

    // Solo se guarda el primer error de cada campo: mostrar varios a la vez
    // bajo el mismo input no ayuda a corregirlo.
    if (match && fields[match[0]] === undefined) {
      fields[match[0]] = message;
    } else if (!match) {
      rest.push(message);
    }
  }

  return { fields, rest };
}
