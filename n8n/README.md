# Workflow de n8n — CrazySupportHub

`CrazySupportHubWorkflow.json` contiene el flujo que clasifica y enriquece los tickets. Es la
pieza que el enunciado exige que viva **dentro de n8n**: el backend no clasifica
nada, ni siquiera como respaldo.

## Qué hace

```
[Webhook] → [Enriquecimiento] → [Callback]
```

1. **Webhook** — `POST /webhook/ticket-created`. Recibe
   `{ ticketId, title, description, createdAt }` que envía la API al crear un
   ticket.
2. **Enriquecimiento** — nodo Code. Normaliza el texto a minúsculas y sin
   tildes y aplica reglas por palabras clave para deducir `category`, `priority`
   y `tags`.
3. **Callback** — `POST` al endpoint de enriquecimiento con la cabecera
   `X-Webhook-Secret`, enviando `{ ticketId, priority, category, tags }`.

No hay nodo de IA y el flujo no produce `suggestedReply`: la respuesta sugerida
solo tendría sentido con el nodo de IA, que es un bonus opcional y no se
implementó.

## Variables de entorno que necesita n8n

El workflow no lleva ningún secreto dentro. Los lee del entorno del contenedor:

| Variable | Para qué |
|---|---|
| `BACKEND_CALLBACK_URL` | URL del callback. En Docker Compose es `http://backend:3000/api/webhooks/n8n/enrichment` |
| `N8N_WEBHOOK_SECRET` | Secreto compartido que viaja en `X-Webhook-Secret`. Debe ser **idéntico** al del backend |
| `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` | **Obligatorio.** n8n bloquea `$env` en las expresiones por defecto; sin esto el nodo de callback se queda sin URL ni secreto y falla con `access to env vars denied` |
| `N8N_ENCRYPTION_KEY` | Clave con la que n8n cifra sus credenciales guardadas |

## Cómo importarlo

Con `docker compose up` el workflow se importa y se publica automáticamente.
Para hacerlo a mano en una instancia de n8n ya corriendo:

```bash
docker cp n8n/CrazySupportHubWorkflow.json <contenedor-n8n>:/tmp/workflow.json
docker exec <contenedor-n8n> n8n import:workflow --input=/tmp/workflow.json
docker exec <contenedor-n8n> n8n publish:workflow --id=crazySupportHub1
docker restart <contenedor-n8n>
```

El reinicio es necesario: n8n solo registra los webhooks de los workflows
publicados al arrancar. Hasta que reinicies, `POST /webhook/ticket-created`
responde 404.

Desde la interfaz (`http://localhost:5678`): **Workflows → … → Import from File**,
y luego activarlo con el interruptor de la esquina superior derecha.

## La cuenta de n8n

n8n **no requiere ningún registro externo**: ni cuenta en n8n.io, ni licencia,
ni API key. Todo corre self-hosted en el contenedor.

Lo que sí pide es una **cuenta de propietario local** la primera vez que abres
`http://localhost:5678`. Es un email y una contraseña cualesquiera, guardados
en la base SQLite del propio contenedor. Invéntatelos: no hay credenciales de
n8n documentadas en este repo porque no hacen falta para que la entrega
funcione.

Dos cosas verificadas al respecto:

- **El workflow clasifica sin que exista ninguna cuenta.** El flujo se importa,
  se publica y atiende el webhook por CLI; la cuenta solo sirve para abrir el
  editor y mirar el flujo.
- **Crear la cuenta después no oculta el workflow importado.** Tras el alta del
  propietario, `crazySupportHub1` sigue listado, activo, y el webhook sigue
  respondiendo 200.

## Reglas de clasificación

Están calibradas contra los 8 tickets que `tickets-seed.json` ya trae
enriquecidos, y reproducen los 8 exactamente. El orden de evaluación importa:

- **`category`** se evalúa `other → billing → technical → account`. Las señales
  de consulta comercial van primero porque *"Consulta sobre planes y precios"*
  contiene la palabra "precios" pero no es un problema de facturación. Y
  `technical` va antes que `account` porque *"La sesión se cierra sola"* menciona
  "iniciar sesión" pero es un fallo, no una gestión de cuenta.
- **`priority`**: `urgent` exige señales de recurrencia o bloqueo total
  ("constantemente", "cada pocos minutos", "no puedo trabajar"). Deliberadamente
  **no** usa "se cierra sola", porque esa frase aparece tanto en un crash puntual
  (medium en el seed) como en la expulsión constante de sesión (urgent).
- **`tags`** salen de las palabras que realmente aparecieron en el texto, con un
  tope de 4 para que sigan sirviendo como filtro.

## Extender con un nodo de IA (bonus no implementado)

Bastaría insertar un nodo de modelo entre el Code y el HTTP Request, que reciba
título y descripción y devuelva el mismo JSON más `suggestedReply`. La API ya
acepta ese campo en el callback: no habría que tocar el backend. La API key
iría en una credencial de n8n, nunca en `CrazySupportHubWorkflow.json`.
