# CAMBIOS — Feature de Equipos (Teams) en Cal.diy

> Documento de continuidad. Resume **qué se modificó, por qué y en qué estado quedó** el feature de equipos portado a este fork (Cal.com v6.2.0 upstream, fork `calcom-cal.diy`).
> Última actualización: 2026-10-09. Todo el trabajo está commiteado; `git status` limpio.

---

## 1. Contexto: por qué existía este trabajo

Cal.com upstream tiene lógica nativa de equipos (tabla `Team`, `Membership`, roles `OWNER/ADMIN/MEMBER`, event types de equipo con `schedulingType`, disponibilidad de equipo, etc.). Este fork **conservó el esquema de BD y los routers tRPC de bajo nivel, pero desguazó la UI y algunos servicios de equipos** (se eliminaron junto con el código EE/organizaciones).

El objetivo del usuario: que varios usuarios puedan unirse a un equipo y crear/editar bookings del equipo; que en la creación de event types y disponibilidad el dropdown de perfil (donde aparece el nombre de usuario) permita seleccionar el equipo.

**Estrategia**: portar desde upstream `v6.2.0` solo la parte de **equipos**, desacoplada de organizaciones (EE): sin orgs, sin dominios custom, sin billing, sin event types MANAGED.

---

## 2. Commits del feature (en orden de dependencia)

| Commit | Qué hizo | Por qué |
|---|---|---|
| `7b1fe085` | `.gitattributes` fuerza LF en scripts | Los checkouts Windows con CRLF rompían los shell scripts del build |
| `80d7ac7f` | `packages/features/teams/lib/` — servicios core: `teams.ts` (CRUD de equipo, roles) e `invitations.ts` (`createInviteByToken`, `acceptInviteByToken`, `joinTeam`) | Lógica de negocio en Services (no en repositories), según convención del repo |
| `80857d7d` | Router tRPC `viewer.teams` (13 endpoints: create, get, update, delete, listMembers, invite, join/leave, setRole, etc.) | API interna que consume la UI; upstream lo tenía en EE, se portó desacoplado |
| `0acaced8` | API v2: `GET /v2/teams/:teamId/event-types` | Paridad con upstream para consumidores de la API pública |
| `dc72bf12` | UI settings: `apps/web/modules/settings/teams/` (listado de equipos, miembros, settings) + `teams-view.tsx` | Pantalla de gestión de equipos en `/settings/teams` |
| `97dccee0` | Página de invitación `/teams/invite/[token]` | Flujo de "unirse por link" (invite link copiable desde Members) |
| `5926edd5` | `AvailabilityTab.tsx` + `TeamSettingsTab.tsx` en `settings/teams/[teamId]/components/` | Disponibilidad de equipo en Settings (schedules de miembros, read-only para no-admin) |
| `46c278d9` | Páginas públicas de agendamiento de equipo (App Router) + `getServerSideProps` en `apps/web/server/lib/team/[slug]/` | La página pública del equipo donde se listan sus event types (booker) |
| `ab22c901` | Redirect legacy: signup apunta a `/teams/invite/[token]` | Coherencia del flujo de invitación |
| `cecfd0df` | `TEAMS-PLAN.md` + `docker-compose.dev.yml` con servicio **API v2 dev** (NestJS `--watch`, bind mount) | Entorno de prueba que compila en vivo lo que se edita (web + API v2) |
| `0a44a960` | Integración E2E: endpoint `teams` en `packages/trpc/react/shared.ts` (ENDPOINTS) + handler `apps/web/pages/api/trpc/teams/[trpc].ts` + `invitations.ts` auto-acepta la invitación al seguir el link | El cliente tRPC del fork parte las rutas por endpoint (`/api/trpc/teams`); sin el handler el POST de `teams.create` no llegaba al servidor. Auto-accept: el fork simplificó el modelo (no hay UI de "membresía pendiente") |
| `37ded0f` | `packages/features/teams/components/TeamEventTypeForm.tsx` (nuevo) + `CreateEventTypeDialog.tsx` renderiza el form de equipo | **El bug reportado por el usuario**: al crear un event type con el perfil del equipo, el diálogo salía vacío porque el fork renderizaba `null` en esa rama (`{teamId ? null : <form/>}`) — el form era parte del EE desguazado. Portado de upstream y adaptado: prefijo `/b/`, solo Collective/Round-Robin (sin MANAGED, que requiere organizaciones) |
| `74ef6b99` | **Prefijo público `/team/` → `/b/`** (business) — ver detalle en §3 | Decisión de naming del usuario: `b/` para agendamiento de equipo; `team` queda para gestión |

Commits previos del usuario (contexto): `320cf4f` compose con imágenes publicadas, `d34b03a` puertos.

---

## 3. La migración `/team/` → `/b/` (commit `74ef6b99`)

**Qué cambió:**

- Rutas movidas (renames limpios, el historial se preserva):
  - `apps/web/app/(booking-page-wrapper)/team/[slug]` → **`b/[slug]`** (página pública del equipo)
  - `apps/web/server/lib/team/[slug]` → **`server/lib/b/[slug]`** (getServerSideProps)
- `apps/web/next.config.ts`:
  - Rewrites: `/org/:slug` → `/b/:slug` y avatares (`/team/avatar.png`, `/org/:slug/avatar.png` → API de avatar)
  - Redirects permanentes de compatibilidad: `/team/:slug` → `/b/:slug`, `/teams/:slug` → `/b/:slug`, `/team/:slug/:type` → `/b/:slug/:type`. **`/teams/invite/<token>` NO se redirige** (es la UI de gestión)
- Builders de URL actualizados a `b/...`:
  - `packages/trpc/server/routers/loggedInViewer/teamsAndUserProfilesQuery.handler.ts` (el slug que alimenta el **dropdown de perfil** que menciona el usuario)
  - `packages/trpc/server/routers/viewer/eventTypes/utils/filterUtils.ts` (`createTeamSlug`)
  - `packages/features/eventtypes/lib/getEventTypesByViewer.ts`
  - `packages/features/bookings/lib/buildEventUrlFromBooking.ts`
  - `apps/web/modules/bookings/components/event-meta/Members.tsx`, `onboarding/components/onboarding-browser-view.tsx`, `lib/apps/installation/.../getServerSideProps.ts`, `modules/teams/team-listing-view.tsx`, `team-type-view.tsx`, `lib/getThemeProviderProps.ts` (+ test), `settings/admin/components/UsersTable.tsx`
  - `packages/app-store/intercom/lib/configure/link.ts`, `packages/lib/telemetry.ts` (detección de team booking por `/b/`), `packages/prisma/seed-pbac-only.ts` (log)
- OAuth: `apps/web/modules/auth/oauth2/authorize-view.tsx` — las cuentas de equipo ahora empiezan con `b/` (`substring(2)` en vez de `substring(5)`)
- `docker-compose.yml` (prod): `NEXTAUTH_URL=http://calcom:3000` — el self-fetch de next-auth (`getCsrfToken` en SSR) intentaba `localhost:3001` dentro del contenedor y fallaba
- `.dockerignore`: excluye `.env*` (no hornear secretos en imágenes)

**Por qué**: el usuario pidió `b/` (business) como prefijo de agendamiento de equipo, distinto de `team` (gestión). Los links viejos siguen funcionando por los redirects permanentes.

---

## 4. Flujos verificados end-to-end (navegador real, dev en :3000)

1. **Setup**: admin (`jorge-admin`) crea el equipo **Soporte** (`/b/soporte`).
2. **Invitación**: link copiado desde Members → usuario B se registra vía link → **bajo automáticamente como MEMBER** (auto-accept, decisión documentada en §2 `0a44a960`).
3. **Dropdown de perfil**: en `/event-types` el switcher muestra "Jorge Admin" y "Soporte" — el requisito original del usuario.
4. **Crear event type de equipo**: perfil Soporte → Create → formulario con Título, URL `/b/soporte/...` y tipo de asignación (Collective/Round-Robin) → mutación crea fila en BD (`teamId`, `schedulingType`) → página pública lo lista.
5. **Booker público**: `/b/soporte` lista los event types; `/b/soporte/<slug>` renderiza el booker (200).
6. **Type-check**: `turbo run type-check:ci --filter=@calcom/web` verde tras cada fase.

Evidencia en BD: el usuario ya creó `ejemplo-jeje` (teamId=1, collective) desde la UI.

---

## 5. Infraestructura de desarrollo (estado actual)

| Pieza | Estado |
|---|---|
| `docker-compose.dev.yml` | Postgres + Redis + **web dev** (bind mount, hot reload) + **API v2 dev** (`--watch`). Web en `:3000`, API v2 en `:3002`, Postgres `:5433` |
| `docker-compose.yml` | Stack prod con imágenes `jorgeortega593/calcom-cal.dy:6.2.0` — web `:3001`, API `:80` |
| `.wslconfig` | `memory=10GB, processors=8, swap=8GB` (host: 16 GB / 8 CPUs — ya casi al máximo) |
| Docker Desktop | Se colgó una vez (type-check de 8 GB saturó la VM de 10 GB); reiniciado. La caché de Turbopack (`.next`) quedó corrupta tras el reinicio y se tuvo que borrar (causó 404 transitorios) |

**Rendimiento conocido**: la primera carga de cada ruta en `:3000` compila en caliente (1-3 min tras limpiar caché; luego 1-7 s). El bind mount NTFS→WSL2 es el cuello de botella estructural (~7 ms/lectura). Mejoras pendientes: exclusiones de Windows Defender (comandos en la conversación, requieren PowerShell admin) o mover el repo al filesystem de WSL2 (10-20x I/O).

---

## 6. Decisiones de producto documentadas

| Decisión | Razón |
|---|---|
| Auto-accept de invitación por link | El fork no tiene UI de "membresía pendiente"; upstream la tiene pero este fork la simplificó |
| Sin opción MANAGED en el form de equipo | MANAGED (event types gestionados por org) requiere infraestructura de organizaciones que el fork no trae |
| Prefijo `/b/` para público, `/teams` para gestión | Naming pedido por el usuario; redirects permanentes cubren links viejos |
| `NEXT_PUBLIC_WEBAPP_URL` del prod apunta a `:3001` | Ver conversación de E2E: los links de invitación del prod usan ese host; en dev el dev-server usa el suyo |

## 7. Pendientes conocidos (no bloqueantes)

- [ ] Reconstruir la imagen prod `6.2.0` cuando se quiera el feature en `:3001` (el código nuevo solo corre en dev por ahora).
- [ ] Exclusiones de Defender (mejora de performance, requiere admin).
- [ ] Reservar un booking de equipo de punta a punta como visitante anónimo (la página y el booker renderizan; el flujo completo de confirmación no se ejerció).
- [ ] Los event types de equipo creados antes del fix del diálogo (si los hubo) no existen — no aplica migración.
