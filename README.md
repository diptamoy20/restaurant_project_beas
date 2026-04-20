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

## Troubleshooting

If `npm run seed` fails after schema or env changes, run:

```bash
cd backend
npm run prisma:generate
npm run prisma:dbpush
npm run seed
```
