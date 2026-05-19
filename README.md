## MyQuad

MyQuad is a **Vite + React** frontend paired with an **Express + Prisma** backend API.

- **Frontend**: `src/` (React, React Router)
- **Backend**: `server/index.ts` (Express API)
- **Database**: Prisma (`prisma/`), typically PostgreSQL via `DATABASE_URL`

## Project flow (end-to-end)

```mermaid
flowchart LR
  U[User] --> UI[React UI (Vite)]
  UI -->|apiRequest()| API[Express API :3001]
  API -->|Prisma Client| DB[(Postgres)]
  UI <-->|JWT token| API
```

### Frontend flow

- **App bootstrap**: `src/main.tsx` mounts `<App />` and wraps it with `BrowserRouter` + `AuthProvider`.
- **Routing**: `src/App.tsx`
  - `/` → landing
  - `/sign-in` + `/sign-up/*` → auth pages
  - `/dashboard` → protected → `QuadrantDashboard`
  - `/admin` → protected + admin-only → `AdminDashboard`
- **API calls**: `src/lib/api.ts`
  - Dev mode: calls backend directly at `http://localhost:3001/api/...`
  - Prod mode: calls relative `/api/...` (usually handled by Nginx proxy)

### Backend flow

- **Entry**: `server/index.ts`
  - Public endpoints: `/api/health`, `/api/auth/*`
  - Protected endpoints: guarded by `requireAuth` (expects `Authorization: Bearer <token>`)
  - Uses Prisma (`@prisma/client`) for all persistence and queries

## Local development (recommended)

Install deps:

```bash
npm install
```

Start **API + UI together**:

```bash
npm run dev
```

Default URLs:

- **UI**: Vite dev server (usually `http://localhost:5173`)
- **API**: `http://localhost:3001`
- **Health**: `http://localhost:3001/api/health`

## Environment variables

Backend expects:

- `DATABASE_URL`: e.g. `postgresql://user:pass@localhost:5432/myquad`
- `JWT_SECRET`: used to sign/verify JWTs
- `PORT`: API port (defaults to `3001`)

Frontend optional:

- `VITE_API_BASE_URL`: override API base URL (otherwise dev uses `http://localhost:3001`, prod uses `/api`)

## Database workflows (Prisma)

Create a migration locally:

```bash
npm run db:migrate:create -- add_new_table
```

Apply migrations:

```bash
npm run db:deploy
```

Apply migrations + seed:

```bash
npm run db:deploy:seed
```

## Docker setup

This repo includes two Docker images:

- `Dockerfile.backend` for API (`server/index.ts`)
- `Dockerfile.frontend` for React app (served by Nginx)

### Quick start (recommended)

From the project root:

```bash
docker compose up --build -d
```

Then open:

- Frontend: `http://localhost:8080`
- API health: `http://localhost:3001/api/health`

If login shows **502 Bad Gateway**, the frontend container cannot reach the API. With `docker compose`, set `API_UPSTREAM=http://backend:3001` on the frontend service and ensure `backend` is running (`docker compose ps`).

### Prerequisites

- Docker installed and running
- PostgreSQL reachable from backend container (included in `docker-compose.yml`)

### 1) Build images

Run these commands from project root:

```bash
docker build -f Dockerfile.backend -t myquad-backend .
docker build -f Dockerfile.frontend -t myquad-frontend .
```

### 2) Run backend container

Replace values as per your environment:

```bash
docker run -d --name myquad-backend -p 3001:3001 \
  -e DATABASE_URL="postgresql://postgres:password@host.docker.internal:5432/myquad" \
  -e JWT_SECRET="myquad-dev-secret-change-in-production" \
  -e PORT=3001 \
  myquad-backend
```

On startup, backend container runs `prisma migrate deploy` automatically before API boot, so all committed migration files are applied to the live database.

If you also want demo data in live DB (optional), run:

```bash
docker exec -it myquad-backend npx prisma db seed
```

### 3) Run frontend container

```bash
docker run -d --name myquad-frontend -p 8080:80 myquad-frontend
```

Frontend URL:

- `http://localhost:8080`

## API proxy notes (Nginx)

The frontend image uses `nginx.conf.template` and proxies `/api/*` to `API_UPSTREAM` (default `http://127.0.0.1:3001`).

Set when running the frontend container, for example:

```bash
docker run -d --name myquad-frontend -p 8080:80 \
  -e API_UPSTREAM=http://myquad-backend:3001 \
  myquad-frontend
```

On **AWS/Linux production**, do not use `host.docker.internal`. Point `API_UPSTREAM` at your API service (same host `127.0.0.1:3001`, ECS service name, or ALB internal URL).

## Local development (no Docker)

```bash
cp .env.example .env   # if present; set DATABASE_URL
npm ci
npm run db:deploy
npm run dev            # Vite + API on :5173 and :3001
```

Vite proxies `/api` to `http://localhost:3001` automatically.

## Deploy on Railway

### Two services (recommended for myquad.ciright.com + api.myquad.ciright.com)

| Service | Domain | Dockerfile | Config file (Railway Settings) |
|---------|--------|------------|--------------------------------|
| `myquad-backend` | `api.myquad.ciright.com` | `Dockerfile.backend` | `railway.backend.toml` |
| `myquad-frontend` | `myquad.ciright.com` | `Dockerfile.frontend` | `railway.frontend.toml` |

**Backend variables:** `DATABASE_URL` (reference Postgres), `JWT_SECRET`, Ciright IDs.

**Frontend variables:** `BACKEND_URL=https://api.myquad.ciright.com` (no trailing slash).  
Nginx forwards `/api/auth/login` → `https://api.myquad.ciright.com/api/auth/login`.  
Also accepts `API_UPSTREAM` instead of `BACKEND_URL`.

For lower latency inside Railway, you can use private networking instead:  
`API_UPSTREAM=http://${{myquad-backend.RAILWAY_PRIVATE_DOMAIN}}:${{myquad-backend.PORT}}`

In each service: **Settings → Config-as-code → Config file path** must match the row above.  
If the frontend uses the root `Dockerfile` by mistake, deploy will run Prisma and fail with `localhost:5432`.

### Single service (simpler)

Use **one** Railway service with the root `Dockerfile` (not `Dockerfile.frontend`). That image serves the React app and API on the same port, which is what Railway expects.

### Setup

1. Create a Railway project from this repo.
2. Add a **PostgreSQL** plugin and attach it to the service (Railway sets `DATABASE_URL`).
3. In the **web** service **Variables** (required):
   - `DATABASE_URL` — must be a **variable reference** to Railway Postgres, not `localhost` and not typed by hand.
     - Railway: **Variables** → **+ New Variable** → **Add Reference** → select your Postgres service → `DATABASE_URL`
     - It should look like `postgresql://postgres:...@...railway.internal:5432/railway` (not `localhost:5432`).
   - `JWT_SECRET` — a long random string
   - If logs show `Can't reach database server at localhost:5432`, `DATABASE_URL` is missing or wrong on this service.
4. **Settings → Deploy**:
   - Builder: Dockerfile
   - Dockerfile path: `Dockerfile` (root)
5. **Do not hard-code port 8080** in Railway networking. Railway injects `PORT` (often `8080`); the app already listens on `process.env.PORT`. If you forced a custom port that does not match `$PORT`, the deploy will fail or return 502.

### Verify

After deploy, open your Railway URL:

- `https://<your-app>.up.railway.app/api/health` → `{"ok":true,...}`
- `https://<your-app>.up.railway.app/` → sign-in page

### Why login showed 502 before

`Dockerfile.frontend` runs **nginx on port 80** and proxies `/api` to `http://backend:3001`. On Railway there is no `backend` hostname unless you run a **second** service with private networking. A single frontend-only deploy always 502s on `/api/*`.

The root `Dockerfile` fixes this by running Express on `$PORT` and serving both the UI and API.

### Optional: two Railway services

If you prefer separate frontend (nginx) and backend containers, you need:

- Backend service: `Dockerfile.backend`, Postgres, `JWT_SECRET`
- Frontend service: `Dockerfile.frontend` with `API_UPSTREAM` set to the backend’s **private** URL (e.g. `${{MyQuad API.RAILWAY_PRIVATE_DOMAIN}}`), and nginx must `listen` on `$PORT` — use the unified root `Dockerfile` instead.
