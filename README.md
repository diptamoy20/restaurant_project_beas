# Restaurant App Project

Monorepo scaffold for a restaurant platform with:

- `backend`: Shared NestJS API for mobile app, web ordering app, and admin panel
- `web-app`: Customer-facing React app for QR ordering and online ordering
- `admin-panel`: React app for restaurant/admin operations

## Stack

- Frontend: React, Vite, Redux Toolkit, React Router
- Backend: NestJS, Prisma, PostgreSQL

## Suggested next steps

1. Install dependencies in each app.
2. Add your Prisma schema and generate the Prisma client in `backend`.
3. Implement auth, menu, order, membership, payment, and notification modules.
4. Connect both React apps to the backend API.
