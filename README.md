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

### Prerequisites

- Docker installed and running
- PostgreSQL reachable from backend container

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

Frontend Nginx config proxies `/api/*` to:

- `http://host.docker.internal:3001`

This means backend should be available on host machine at port `3001`.

If you run backend in another container/network, update `nginx.conf` accordingly and rebuild frontend image.
