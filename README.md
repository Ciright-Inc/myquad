# MyQuad Docker Setup

This project has two Docker images:

- `Dockerfile.backend` for API (`server/index.ts`)
- `Dockerfile.frontend` for React app (served by Nginx)

## Prerequisites

- Docker installed and running
- PostgreSQL reachable from backend container

## 1) Build Images

Run these commands from project root:

```bash
docker build -f Dockerfile.backend -t myquad-backend .
docker build -f Dockerfile.frontend -t myquad-frontend .
```

## 2) Run Backend Container

Replace values as per your environment:

```bash
docker run -d --name myquad-backend -p 3001:3001 \
  -e DATABASE_URL="postgresql://postgres:password@host.docker.internal:5432/myquad" \
  -e JWT_SECRET="myquad-dev-secret-change-in-production" \
  -e PORT=3001 \
  myquad-backend
```

On startup, backend container now runs `prisma migrate deploy` automatically before API boot, so all committed migration files are applied to the live database.

If you also want demo data in live DB (optional), run:

```bash
docker exec -it myquad-backend npx prisma db seed
```

## Create Migration / Seed

When schema changes locally:

```bash
npm run db:migrate:create -- add_new_table
```

This creates a new file under `prisma/migrations/*`.

Apply migrations in production:

```bash
npm run db:deploy
```

Apply migrations + seed together:

```bash
npm run db:deploy:seed
```

Backend URL:

- `http://localhost:3001`
- Health check: `http://localhost:3001/api/health`

## 3) Run Frontend Container

```bash
docker run -d --name myquad-frontend -p 8080:80 myquad-frontend
```

Frontend URL:

- `http://localhost:8080`

## API Proxy Notes

Frontend Nginx config proxies `/api/*` to:

- `http://host.docker.internal:3001`

This means backend should be available on host machine at port `3001`.

If you run backend in another container/network, update `nginx.conf` accordingly and rebuild frontend image.
