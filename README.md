# Restaurant App Project

Monorepo for a restaurant platform with a shared NestJS backend, a customer-facing web app, and an admin panel.

## Apps

- `backend` - NestJS API with Prisma and PostgreSQL
- `web-app` - React + Vite customer ordering app
- `admin-panel` - React + Vite admin operations app

## Tech Stack

- Backend: NestJS, TypeScript, Prisma, PostgreSQL, JWT
- Frontend: React, Vite, Redux Toolkit, React Router
- Tooling: ESLint, Prettier, Husky, lint-staged

## Project Structure

```text
restaurant_project_beas/
├─ backend/
│  ├─ prisma/
│  └─ src/
├─ web-app/
└─ admin-panel/
```

## Prerequisites

- Node.js 20+ (current backend engines: >=20 <26)
- npm 9+
- PostgreSQL 14+

## Environment Setup

Create `backend/.env` from `backend/.env.example`.

Create frontend env files from their examples:

- `web-app/.env` from `web-app/.env.example`
- `admin-panel/.env` from `admin-panel/.env.example`

Default backend environment:

```env
DATABASE_URL="postgresql://postgres:root@localhost:5432/restaurant_db?schema=restaurant_management"
PORT=4000
WEB_APP_URL="http://localhost:5173"
ADMIN_PANEL_URL="http://localhost:5174"
JWT_SECRET="restaurant-app-super-secret"
JWT_EXPIRES_IN="7d"
DOCS_ENABLED=true
DB_POOL_MAX=20
DB_POOL_IDLE_TIMEOUT_MS=30000
DB_POOL_CONNECTION_TIMEOUT_MS=5000
DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=true
```

## Installation

Install dependencies in each app:

```bash
cd backend && npm install
cd ../web-app && npm install
cd ../admin-panel && npm install
```

## Database Setup

Make sure PostgreSQL is running locally and that the database in `DATABASE_URL` exists.

This project expects `schema=restaurant_management` in backend `DATABASE_URL`.

From `backend`:

```bash
npm run prisma:generate
npm run prisma:dbpush
npm run seed
```

## Run Locally

Start the backend:

```bash
cd backend
npm run start:dev
```

Start the customer app:

```bash
cd web-app
npm run dev
```

Start the admin panel:

```bash
cd admin-panel
npm run dev
```

Local endpoints:

- Backend: `http://localhost:4000`
- Web app: `http://localhost:5173`
- Admin panel: `http://localhost:5174`

## API Documentation

When `DOCS_ENABLED=true`, OpenAPI docs are available at:

- Swagger UI: `http://localhost:4000/api/docs`
- OpenAPI JSON: `http://localhost:4000/api/openapi.json`

Recommended production setting:

- Set `DOCS_ENABLED=false` for public production environments unless you explicitly need docs exposed.

Prisma Studio:

```bash
cd backend
npm run prisma:studio
```

## Backend Quality Tooling

From `backend`:

```bash
npm run lint
npm run lint:fix
npm run format
```

Pre-commit checks run with Husky and lint-staged on staged files only.

## Backend Modules

Current backend structure includes:

- `auth`
- `admin`
- `restaurants`
- `menu`
- `orders`
- `payments`
- `deliveries`
- `notifications`
- `membership`

## Build

Backend:

```bash
cd backend
npm run build
```

Frontend apps:

```bash
cd web-app && npm run build
cd ../admin-panel && npm run build
```

## Production Hardening

### API Access Classification

- Public: `GET /health`, `POST /auth/register`, `POST /auth/login`, `POST /auth/login/role`, `POST /auth/refresh`
- Authenticated + role: all other endpoints (global JWT guard + role guard)
- Owner-only enforcement:
  - `GET /orders/:id` (customers can only access their own order)
  - `GET /membership/user/:userId` (customers can only access their own membership)
  - `GET /notifications/user/:userId` (customers and delivery users can only access their own notifications)
  - `GET /deliveries/order/:orderId/track` (customers can only access tracking for their own order)

### Backend Production Environment (minimum)

```env
NODE_ENV=production
PORT=4000
DATABASE_URL="postgresql://<user>:<password>@<host>:5432/restaurant_db?schema=restaurant_management"
CORS_ORIGINS="https://app.example.com,https://admin.example.com"
ACCESS_TOKEN_SECRET="<strong-secret>"
REFRESH_TOKEN_SECRET="<strong-secret>"
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
DOCS_ENABLED=false
TRUST_PROXY=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=120
```

### Security + Reliability Defaults

- Helmet enabled globally
- Strict CORS allowlist in production (required)
- Global request validation (`whitelist`, `forbidNonWhitelisted`, `transform`)
- Global exception filter with sanitized `5xx` responses and request ID tracing
- Request ID middleware (`x-request-id`) and request logging interceptor
- Global in-memory rate limiting middleware (`RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`)
- Graceful shutdown hooks enabled

### Prisma Production Commands

Run on release:

```bash
cd backend
npm ci
npm run prisma:generate
npx prisma migrate deploy
npm run build
```

### No-Docker Deploy (PM2 + Nginx)

```bash
# backend
cd /var/www/restaurant/backend
npm ci
npm run prisma:generate
npx prisma migrate deploy
npm run build
pm2 describe restaurant-backend >/dev/null 2>&1 && pm2 restart restaurant-backend --update-env || pm2 start dist/main.js --name restaurant-backend
pm2 save

# frontend builds (run in CI or server)
cd /var/www/restaurant/web-app && npm ci && npm run build
cd /var/www/restaurant/admin-panel && npm ci && npm run build
```

Nginx should serve frontend `dist` directories and reverse-proxy `/api` to backend port.

### CI Checks (recommended)

```bash
cd backend && npm ci && npm run prisma:generate && npm run lint && npm run build
cd ../web-app && npm ci && npm run build
cd ../admin-panel && npm ci && npm run build
```

### Go Live Checklist

- Production env secrets set and validated
- `DOCS_ENABLED=false`
- `CORS_ORIGINS` only includes trusted domains
- Prisma migration deploy successful
- Health endpoint returns `ok`
- PM2 process running and persisted
- Nginx TLS + API proxy verified
- Smoke test: login, browse menu, create order, payment flow, delivery tracking

### Rollback Plan

1. Revert to previous git release tag/commit on server.
2. Reinstall dependencies and rebuild.
3. Restart PM2 process with previous artifact.
4. If schema change caused issue, apply prepared backward migration or restore DB snapshot.
5. Re-run smoke checks and monitor logs.

## Troubleshooting

If `npm run seed` fails after schema or env changes, run:

```bash
cd backend
npm run prisma:generate
npm run prisma:dbpush
npm run seed
```
