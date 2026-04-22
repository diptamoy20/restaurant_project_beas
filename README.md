# Restaurant App Project

Monorepo for a restaurant platform with:

- `backend` - NestJS API with Prisma and PostgreSQL
- `web-app` - React + Vite customer ordering app
- `admin-panel` - React + Vite admin operations app

## Repo Inspection Summary

- Package manager detected: `npm`
- `package.json` locations:
  - `backend/package.json`
  - `web-app/package.json`
  - `admin-panel/package.json`
- Backend entrypoint: `backend/src/main.ts`
- Customer frontend setup: Vite (`web-app`)
- Admin frontend setup: Vite (`admin-panel`)
- Table ID / QR flow:
  - URL query param: `?table=<id>`
  - Parsed in `web-app/src/lib/tableSession.js`
  - Persisted in `sessionStorage`
- Existing order APIs:
  - `POST /api/orders`
  - `GET /api/orders/:id`
- Existing DB setup:
  - Prisma + PostgreSQL
  - Order persistence already existed in `backend/prisma/schema.prisma`
  - No MongoDB is used by this repo

## Realtime Tracking Added

- Socket.IO attached to the existing NestJS HTTP server
- Admin room and table rooms for realtime order updates
- Persistent order status flow:
  - `PLACED`
  - `CONFIRMED`
  - `PREPARING`
  - `READY`
  - `SERVED`
- Customer live tracking on the payment page
- Admin live order queue with instant updates and optional sound notifications
- Prisma migration for `orders.updated_at`

## Packages Installed

- `backend`
  - `socket.io`
  - `cors` was not added because Nest already handles CORS in the existing server
  - `zod` / `joi` were not added because the repo already uses `class-validator` and `class-transformer`
- `web-app`
  - `socket.io-client`
- `admin-panel`
  - `socket.io-client`

## Project Structure

```text
restaurant_project_beas/
|- backend/
|  |- prisma/
|  \- src/
|- web-app/
\- admin-panel/
```

## Prerequisites

- Node.js 20+ (backend engines: `>=20 <26`)
- npm 9+
- PostgreSQL 14+

## Environment Setup

Create these files from the examples:

- `backend/.env` from `backend/.env.example`
- `web-app/.env` from `web-app/.env.example`
- `admin-panel/.env` from `admin-panel/.env.example`

Backend example:

```env
DATABASE_URL="postgresql://postgres:root@localhost:5432/restaurant_db?schema=restaurant_management"
PORT=4000
CLIENT_ORIGIN="http://localhost:5173,http://localhost:5174"
WEB_APP_URL="http://localhost:5173"
ADMIN_PANEL_URL="http://localhost:5174"
CORS_ORIGINS="http://localhost:4000,http://localhost:5173,http://localhost:5174"
CORS_ALLOWED_HEADERS="Content-Type, Authorization"
CORS_EXPOSED_HEADERS=""
CORS_MAX_AGE_SECONDS=600
ADMIN_SOCKET_TOKEN=""
JWT_SECRET="restaurant-app-super-secret"
JWT_EXPIRES_IN="7d"
ACCESS_TOKEN_SECRET="restaurant-app-access-secret"
ACCESS_TOKEN_EXPIRES_IN="15m"
REFRESH_TOKEN_SECRET="restaurant-app-refresh-secret"
REFRESH_TOKEN_EXPIRES_IN="7d"
LOGIN_LOCK_THRESHOLD=5
LOGIN_LOCK_DURATION_MINUTES=15
BCRYPT_ROUNDS=10
DOCS_ENABLED=true
DB_POOL_MAX=20
DB_POOL_IDLE_TIMEOUT_MS=30000
DB_POOL_CONNECTION_TIMEOUT_MS=5000
DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=true
MONGO_URI=""
```

Customer frontend example:

```env
VITE_API_URL="http://localhost:4000"
VITE_API_BASE_URL="http://localhost:4000/api"
```

Admin frontend example:

```env
VITE_API_URL="http://localhost:4000"
VITE_API_BASE_URL="http://localhost:4000/api"
VITE_ADMIN_SOCKET_TOKEN=""
```

## Install Commands (PowerShell)

Full app installs:

```powershell
Set-Location "c:\Users\BeasDev\Desktop\Project\restaurant_project_beas\backend"
npm.cmd install

Set-Location "c:\Users\BeasDev\Desktop\Project\restaurant_project_beas\web-app"
npm.cmd install

Set-Location "c:\Users\BeasDev\Desktop\Project\restaurant_project_beas\admin-panel"
npm.cmd install
```

Realtime-specific installs:

```powershell
Set-Location "c:\Users\BeasDev\Desktop\Project\restaurant_project_beas\backend"
npm.cmd install socket.io

Set-Location "c:\Users\BeasDev\Desktop\Project\restaurant_project_beas\web-app"
npm.cmd install socket.io-client

Set-Location "c:\Users\BeasDev\Desktop\Project\restaurant_project_beas\admin-panel"
npm.cmd install socket.io-client
```

## Database Setup (PowerShell)

Make sure PostgreSQL is running and the database in `DATABASE_URL` exists.

```powershell
Set-Location "c:\Users\BeasDev\Desktop\Project\restaurant_project_beas\backend"
npm.cmd run prisma:generate
npm.cmd run prisma:migrate
npm.cmd run seed
```

## Run Commands (PowerShell)

Start backend:

```powershell
Set-Location "c:\Users\BeasDev\Desktop\Project\restaurant_project_beas\backend"
npm.cmd run start:dev
```

Start customer app:

```powershell
Set-Location "c:\Users\BeasDev\Desktop\Project\restaurant_project_beas\web-app"
npm.cmd run dev
```

Start admin panel:

```powershell
Set-Location "c:\Users\BeasDev\Desktop\Project\restaurant_project_beas\admin-panel"
npm.cmd run dev
```

Local endpoints:

- Backend: `http://localhost:4000`
- Web app: `http://localhost:5173`
- Admin panel: `http://localhost:5174`

## Manual Test Plan

1. Start backend, web app, and admin panel with the PowerShell commands above.
2. Open the admin panel at `http://localhost:5174` and sign in as an admin or manager.
3. Open customer tab A at `http://localhost:5173/menu?table=1`.
4. Open customer tab B at `http://localhost:5173/menu?table=2`.
5. In customer tab A, place an order.
6. Confirm the admin panel receives the new order instantly without a refresh.
7. Confirm the customer payment page shows the live tracker with `Placed`.
8. In the admin panel, move the order through `Confirmed`, `Preparing`, `Ready`, and `Served`.
9. Confirm customer tab A updates immediately for every status change.
10. Confirm customer tab B does not receive table 1 updates.
11. Place another order from table 2 and confirm it appears instantly in the admin queue.
12. Enable sound in the admin panel and place a new order to verify the notification tone.
13. Refresh the admin panel and confirm it reconnects and still shows recent orders.
14. Refresh the customer payment page and confirm it reconnects to the table room and resumes live updates.

## API Documentation

When `DOCS_ENABLED=true`:

- Swagger UI: `http://localhost:4000/api/docs`
- OpenAPI JSON: `http://localhost:4000/api/openapi.json`

## Prisma Studio

```powershell
Set-Location "c:\Users\BeasDev\Desktop\Project\restaurant_project_beas\backend"
npm.cmd run prisma:studio
```

## Quality / Build Commands

Backend linting:

```powershell
Set-Location "c:\Users\BeasDev\Desktop\Project\restaurant_project_beas\backend"
npm.cmd run lint
npm.cmd run lint:fix
npm.cmd run format
```

Build backend:

```powershell
Set-Location "c:\Users\BeasDev\Desktop\Project\restaurant_project_beas\backend"
npm.cmd run build
```

Build frontends:

```powershell
Set-Location "c:\Users\BeasDev\Desktop\Project\restaurant_project_beas\web-app"
npm.cmd run build

Set-Location "c:\Users\BeasDev\Desktop\Project\restaurant_project_beas\admin-panel"
npm.cmd run build
```

## Verification Run

These checks were run successfully after the implementation:

- `backend`: `npm.cmd run build`
- `backend`: `npm.cmd run prisma:generate`
- `web-app`: `npm.cmd run build`
- `admin-panel`: `npm.cmd run build`
