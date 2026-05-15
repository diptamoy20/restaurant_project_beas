# QR Ordering Frontend

Standalone React + TypeScript frontend for QR table ordering.

## Routes

- `/menu/:restaurantId/:tableId`
- `/cart`
- `/order-success`

The app calls the existing backend QR APIs:

- `GET /api/qr/menu/:restaurantId/:tableId`
- `POST /api/qr/order`

## Local Setup

```bash
npm install
npm run dev
```

The default Vite port is `5175`. Configure the backend URL with:

```bash
VITE_API_BASE_URL=http://localhost:4000/api
```
