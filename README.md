# CrazySupportHub

Prueba full stack que consiste en una herramienta de tickets de soporte con integración bidireccional
con n8n: al crear un ticket, la API dispara un flujo de n8n que lo clasifica, y ese flujo
responde a la API con el resultado.

**Stack:** React 18 + Vite 6 + TanStack Query · NestJS 11 + Prisma 6 + PostgreSQL 16 ·
n8n 2.36 self-hosted.

---

### Con Docker

```bash
npm install
npm run setup:env         # crea .env con secretos generados al azar
docker compose up --build
```

`setup:env` rellena los marcadores de `.env.example` con valores aleatorios y
escribe el `.env`. No sobrescribe uno existente; para regenerarlo,
`npm run setup:env -- --force`. Si prefieres rellenarlo a mano, copia
`.env.example` a `.env` y edita los valores marcados con `<…>`.

| Pieza | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:3000/api |
| n8n | http://localhost:5678 |
| PostgreSQL | `localhost:5433` |

El primer arranque tarda unos minutos porque construye las imágenes. Cuando termine,
entra al frontend con cualquiera de los usuarios de prueba que estan en el seed.

### Sin Docker

Necesitas Node 20+ y un PostgreSQL accesible.

```bash
npm install
npm run setup:env         # o copia .env.example a .env y rellénalo

npm run prisma:migrate    # crea el esquema
npm run prisma:seed       # inserta usuarios y tickets de ejemplo

npm run dev:backend       # API en http://localhost:3000
npm run dev:frontend      # web en http://localhost:5173
```

n8n aparte, con `npx n8n` o Docker, e importando `n8n/CrazySupportHubWorkflow.json`

---

## Decisiones técnicas

**NestJS en vez de Express.** El proyecto tiene tres cosas distintas que decidir en cada
petición: si hay sesión, si el rol permite llamar a ese endpoint, y qué tickets puede ver
esa persona. Con los guards de Nest cada una queda en su sitio y se puede probar por
separado. Con Express habría terminado escribiendo ese mismo andamiaje a mano y mezclado
dentro de los controladores.

**Prisma como ORM, fijado en la 6.19.3.** El esquema genera los tipos, así que si cambio
una columna y olvido actualizar el código, no compila en lugar de fallar en ejecución. Lo
fijé en la 6 porque no me parecía buena idea montar la entrega sobre una versión no estable.

**Cómo modelé el enriquecimiento.** Los campos que devuelve n8n (`priority`, `category`,
`tags`, `suggestedReply`) están en la misma tabla de tickets, nulos hasta que el flujo
responde, más un `enrichmentStatus` que va de `pending` a `processing` y de ahí a `done` o
`failed`, y un `enrichedAt` con la fecha. 

**Cómo manejo el estado asíncrono en el front.** Con TanStack Query y un
`refetchInterval` condicional, mientras el ticket está en `pending` o `processing`
consulta cada 2 segundos, y en cuanto llega a `done` o `failed` deja de consultar solo. 
Usé sondeo y no WebSockets porque el enunciado lo permite y no compensa mantener una
conexión abierta para un evento que ocurre una sola vez por ticket.

---

## Uso de IA

Utilice Claude Code como herramienta de trabajo, primero hice a mano algunos de los archivos 
del backend, el como queria las columnas para la lista de tickets y el workflow de n8n, los 
subi a claude code junto a las instrucciones dadas para corregir y generar lo que faltaba, 
por ejemplo la parte donde se visualiza el enriquecimiento con n8n lo sugirio la IA junto a 
otros detalles del fronted, fui revisando y corregiendo para que se viera mejor. Las pruebas 
manuales, como la revision de que sirvieran las reglas del n8n con los ejemplos del seed las, 
que se cumplieran las reglas del logging, resgistro y los campos para el nuevo ticket las hice 
yo y los test 2e2 los hizo la IA junto a los los Dockerfiles.

---

## Pendientes y limitaciones conocidas

Lo que no está hecho, y por qué:

**Nodo de IA en n8n.** Como no era una exigencia no lo agregue, deje el campo de 
`suggestedReply` porque los incluia los tickets del seed, pero el workflow de esta entrega 
no lo produce.

**Deploy.** Igual, como no era una exigencia deje que el proyecto corra en local con `docker 
compose up`.

**Reintento del enriquecimiento.** Si n8n estaba caído al crear un ticket, este queda en
`failed` y no hay forma de reintentarlo desde la interfaz actual. Aun es usable pero le falta
la clasificación del n8n, asi que un boton para reintentarlo seria algo bueno para agregar en 
otra entrega. Tambien serviria para los tickets del seed con el status en `pending`, pues estos
no se enriquecen solos por estar insertados directamente en la base, saltándose la API, así que 
nunca se disparó el webhook para ellos. 

**La búsqueda es sensible a acentos.** Usa `contains` con `ILIKE` sin `unaccent`, así que
`sesion` no encuentra `sesión`. 

**Sin criterio de desempate en el ordenamiento.** Dos tickets con exactamente el mismo
`createdAt` pueden intercambiar posiciones entre páginas. 

**Ordenamiento.** Aparte del `createdAt` no hay ninguna otra forma de ordenarlo. Se podria agregar 
una feauture para ordenarlos del ticket mas antiguo al mas reciente o por prioridad.

---

### Reglas de autorización

- **`admin`**: ve y gestiona todos los tickets, asigna a cualquiera y es el único que
  puede cerrar un ticket o cambiar de un estado a otro sin restricción.
- **`agent`**: ve solo los tickets que creó o tiene asignados. Permite que pudiese cambiar el estado 
  de los tickets asignados, pero en un solo sentido segun como los encargados avancen en la solucion
  (`open → in_progress → resolved`), sin retroceder ni saltar pasos.