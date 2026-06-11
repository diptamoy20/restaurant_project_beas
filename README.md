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
NODE_ENV=development
DATABASE_URL="postgresql://postgres:root@localhost:5432/restaurant_db?schema=restaurant_management"
PORT=4000
WEB_APP_URL="http://localhost:5173"
ADMIN_PANEL_URL="http://localhost:5174"
QR_FRONTEND_URL="http://localhost:5175"

CORS_ORIGINS="http://localhost:5173,http://localhost:5174,http://localhost:5175"
CORS_ALLOWED_HEADERS="Content-Type,Authorization"
CORS_EXPOSED_HEADERS=""
CORS_MAX_AGE_SECONDS=600
TRUST_PROXY=false

ACCESS_TOKEN_SECRET="restaurant-app-local-access-secret"
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET="restaurant-app-local-refresh-secret"
REFRESH_TOKEN_EXPIRES_IN=7d
JWT_SECRET="restaurant-app-local-access-secret"
JWT_EXPIRES_IN=15m

LOGIN_LOCK_THRESHOLD=5
LOGIN_LOCK_DURATION_MINUTES=15
BCRYPT_ROUNDS=10

DOCS_ENABLED=true
DOCS_ALLOW_IN_PRODUCTION=false

DB_POOL_MAX=20
DB_POOL_IDLE_TIMEOUT_MS=30000
DB_POOL_CONNECTION_TIMEOUT_MS=5000
DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=true

RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=120

CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
IMAGE_UPLOAD_MAX_MB=1

LOG_LEVELS="log,warn,error,debug,verbose"
```

`CLOUDINARY_*` values are required in production and whenever image upload endpoints are used. `IMAGE_UPLOAD_MAX_MB` controls backend image upload size.

## Installation

Quick install from repo root:

```bash
npm run install:all
```

This installs dependencies for:

- `backend`
- `web-app`
- `admin-panel`
- `qr-ordering-frontend`

Manual install in each app also works:

```bash
cd backend && npm install
cd ../web-app && npm install
cd ../admin-panel && npm install
cd ../qr-ordering-frontend && npm install
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

Recommended single-command local startup from repo root:

```bash
npm run dev
```

What it starts:

- Backend on `http://localhost:4000`
- Web app on `http://localhost:5173`
- Admin panel on `http://localhost:5174`
- QR ordering frontend on `http://localhost:5175`

The root dev runner also injects:

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

One-time requirement before first run:

```bash
npm run install:all
```

Optional overrides:

```bash
PORT=7001 npm run dev
VITE_API_BASE_URL=http://localhost:7001/api npm run dev
QR_ORDERING_PORT=7004 npm run dev
```

If you prefer running each app separately, use:

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

Start the QR ordering frontend:

```bash
cd qr-ordering-frontend
npm run dev
```

Local endpoints:

- Backend: `http://localhost:4000`
- Web app: `http://localhost:5173`
- Admin panel: `http://localhost:5174`
- QR ordering frontend: `http://localhost:5175`

Build every app from the repo root:

```bash
npm run build
```

## API Documentation

When `DOCS_ENABLED=true`, OpenAPI docs are available at:

- Swagger UI: `http://localhost:4000/api/docs`
- OpenAPI JSON: `http://localhost:4000/api/openapi.json`

QR ordering endpoints are included under the `QR Ordering` Swagger tag:

- `GET /api/qr/menu/{restaurantId}/{tableId}`
- `POST /api/qr/order`

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

- Public: `GET /api/health`, `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/login/role`, `POST /api/auth/refresh`
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
CORS_ORIGINS="https://app.example.com,https://admin.example.com,https://qr.example.com"
ACCESS_TOKEN_SECRET="<strong-secret>"
REFRESH_TOKEN_SECRET="<strong-secret>"
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
DOCS_ENABLED=false
DOCS_ALLOW_IN_PRODUCTION=false
TRUST_PROXY=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=120
```

For LAN/deployed access from your current host, include:

```env
CORS_ORIGINS="http://192.168.1.18:7001"
```

If you need Swagger available on a pushed production server, set both:

```env
DOCS_ENABLED=true
DOCS_ALLOW_IN_PRODUCTION=true
```

### Security + Reliability Defaults

- Helmet enabled globally
- Strict CORS allowlist in production (required)
- Global request validation (`whitelist`, `forbidNonWhitelisted`, `transform`)
- Global exception filter with sanitized `5xx` responses and request ID tracing
- Request ID middleware (`x-request-id`) and request logging interceptor
- Global in-memory rate limiting middleware (`RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`)
- Graceful shutdown hooks enabled

### Backend Release Runtime

Production release now uses:

- GitHub Actions or local packaging to create immutable backend tarball
- Server release directories under `/var/www/dev.beas.in/public_html/restaurant_project_beas/releases/<release-id>`
- `current` symlink switch only after Prisma migrate + PM2 reload + `/api/health` passes
- Auto rollback to previous release if health check fails
- PM2 runtime config from `backend/ecosystem.config.cjs`

One-time server prep:

```bash
mkdir -p /var/www/dev.beas.in/public_html/restaurant_project_beas/{incoming,releases,shared}
cp backend/.env.example /var/www/dev.beas.in/public_html/restaurant_project_beas/shared/backend.env
```

Use `shared/backend.env` for production values. Health check default reads `PORT` from that file and probes `http://127.0.0.1:<PORT>/api/health`.

### No-Docker Runtime (PM2 + Nginx)

PM2 runs backend from versioned `current` release:

```bash
cd /var/www/dev.beas.in/public_html/restaurant_project_beas/current
PM2_ENV_FILE=/var/www/dev.beas.in/public_html/restaurant_project_beas/shared/backend.env pm2 startOrReload ecosystem.config.cjs --env production --update-env
pm2 save
```

Nginx should reverse-proxy `/api` to backend port and serve frontend assets separately.

## Automated Deployment

Current default flow is simple GitHub-to-server deploy: GitHub checks backend and all frontends, SSHes into server, runs `git pull`, migrates DB, builds backend, restarts PM2, serves all frontend builds through PM2, then checks `/api/health` and each frontend port.

### Option 1: GitHub Actions (Easy Auto-Deploy)

The `.github/workflows/deploy.yml` workflow:

1. Runs backend lint/typecheck/build and builds `web-app`, `admin-panel`, and `qr-ordering-frontend` on PRs and pushes
2. On push to `main` or `production`, SSHes into server
3. Runs `git pull`
4. Runs `npm ci`, `npm run prisma:generate`, `npm run prisma:migrate:deploy`, `npm run build`
5. Restarts backend PM2 and serves frontend `dist` folders with PM2
6. Verifies `GET /api/health`, web app, admin panel, and QR ordering frontend

**Setup:**

1. Push this repo to GitHub
2. Add these secrets to your GitHub repo (Settings > Secrets and variables > Actions):
   - `SERVER_HOST` - Server IP/domain (e.g., `192.168.1.18` or `vps.example.com`)
   - `SERVER_USER` - SSH username (e.g., `deploy`)
   - `SERVER_SSH_KEY` - Private SSH key (paste the content of `~/.ssh/id_rsa`)
   - `SERVER_PORT` - SSH port (default: `22`)

   GitHub repository variables:
   - `SERVER_APP_DIR` - `/var/www/dev.beas.in/public_html/restaurant_project_beas`
   - `PM2_APP_NAME` - `restaurant-backend`
   - `WEB_PM2_APP_NAME` - `restaurant-web-app`
   - `ADMIN_PM2_APP_NAME` - `restaurant-admin-panel`
   - `QR_PM2_APP_NAME` - `restaurant-qr-ordering`
   - `PUBLIC_API_BASE_URL` - public backend API URL, for example `https://dev.beas.in/api`
   - `WEB_APP_PORT` - web app PM2 static server port, default `7002`
   - `ADMIN_PANEL_PORT` - admin panel PM2 static server port, default `7003`
   - `QR_ORDERING_PORT` - QR ordering PM2 static server port, default `7004`

3. On your server, ensure:
   - Repo already cloned at deploy root
   - Production env stored at `/var/www/dev.beas.in/public_html/restaurant_project_beas/shared/backend.env`
   - SSH key authentication configured
   - `node`, `npm`, `pm2`, `curl` available for deploy user

**Usage:**

```bash
git push origin main  # Automatically triggers workflow
# OR manually trigger: GitHub Actions > Simple Server Deploy > Run workflow
```

**Deploy Status:** Check GitHub > Actions tab for deployment logs

### Option 2: Local Deployment Script (Manual Control)

Use local scripts to build and deploy from your machine.

#### Linux/Mac:

```bash
bash scripts/deploy-local.sh
# OR with flags:
bash scripts/deploy-local.sh full      # Build + package + deploy
bash scripts/deploy-local.sh build     # Build only
bash scripts/deploy-local.sh deploy    # Deploy latest packaged artifact
```

#### Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy.ps1
# OR with flags:
powershell deploy.ps1 full      # Build + Deploy
powershell deploy.ps1 build     # Build only
powershell deploy.ps1 deploy    # Deploy only
```

**Configuration (before first deploy):**

Edit config in `scripts/deploy-local.sh` or `scripts/deploy.ps1`:

```bash
SERVER_HOST="dev.beas.in"       # Your server IP/domain
SERVER_USER="deploy"            # SSH user
SERVER_PORT="22"                # SSH port
```

**Requirements:**

- SSH access to your server
- `tar`, `scp`, and `ssh` commands available
- Node.js 20+ installed locally

**What it does:**

1. Builds backend locally
2. Runs lint + typecheck + build before packaging
3. Connects to server over SSH
4. Pulls latest code on server
5. Runs Prisma migrations on server
6. Restarts PM2 and verifies `/api/health`

### Deployment Workflow Comparison

| Method         | Trigger        | Speed | Logs      | Best For                  |
| -------------- | -------------- | ----- | --------- | ------------------------- |
| GitHub Actions | Git push       | Auto  | GitHub UI | Easy auto-deploy          |
| Local Script   | Manual command | Fast  | Terminal  | Controlled manual release |

### CI Checks (recommended)

```bash
cd backend && npm ci && npm run lint && npm run typecheck && npm run build
```

### Go Live Checklist

- Production env secrets set and validated
- `DOCS_ENABLED=false`
- `CORS_ORIGINS` only includes trusted domains
- Prisma migration deploy successful
- `GET /api/health` returns `200` and includes `database: "up"`
- PM2 process running and persisted
- Nginx TLS + API proxy verified
- Smoke test: login, browse menu, create order, payment flow, delivery tracking

### Rollback Plan

1. SSH into server.
2. `cd /var/www/dev.beas.in/public_html/restaurant_project_beas && git log --oneline -n 5`
3. `git checkout <good-commit-or-branch>`
4. `cd backend && npm ci && npm run prisma:generate && npm run build`
5. `pm2 restart restaurant-backend --update-env`

## Troubleshooting

If `npm run seed` fails after schema or env changes, run:

```bash
cd backend
npm run prisma:generate
npm run prisma:dbpush
npm run seed
```
