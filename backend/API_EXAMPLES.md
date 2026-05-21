# Backend API Examples

## Authentication

### Register customer

`POST /api/auth/register`

```json
{
  "name": "Alice Customer",
  "email": "alice@example.com",
  "phone": "+919911112222",
  "password": "password123"
}
```

Response:

```json
{
  "accessToken": "jwt-token",
  "tokenType": "Bearer",
  "user": {
    "id": 10,
    "name": "Alice Customer",
    "email": "alice@example.com",
    "phone": "+919911112222",
    "roles": ["customer"]
  }
}
```

### Role-based login

`POST /api/auth/login/role`

```json
{
  "email": "admin@example.com",
  "password": "password123",
  "role": "admin"
}
```

Response:

```json
{
  "accessToken": "jwt-token",
  "tokenType": "Bearer",
  "user": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@example.com",
    "phone": "+919900000002",
    "roles": ["admin"]
  }
}
```

### Auth header

Use this on protected APIs:

```http
Authorization: Bearer <accessToken>
```

## RBAC

- `admin`: full platform access
- `manager`: order/dashboard/operations access
- `customer`: customer ordering, membership, payment, menu, nearby restaurant access
- `delivery_boy`: delivery tracking and delivery-side notifications

## Protected APIs

### Nearby restaurants

`GET /api/restaurants/nearby?latitude=12.9716&longitude=77.5946&radiusKm=10&limit=20&offset=0`

Sample response:

```json
{
  "items": [
    {
      "id": 1,
      "name": "Downtown Spice Hub",
      "address": "45 Residency Road",
      "city": "Bengaluru",
      "latitude": 12.9663,
      "longitude": 77.6012,
      "isActive": true,
      "categories": [
        {
          "id": 1,
          "restaurantId": 1,
          "name": "Starters",
          "description": "Quick bites and appetizers"
        }
      ],
      "distanceKm": 0.95
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0,
  "hasNextPage": false,
  "hasPreviousPage": false
}
```

### Restaurant menu with category and pagination

`GET /api/v1/restaurants/1/menu?categoryId=2&limit=20&offset=0`

Notes:

- `categoryId` accepts only category id.
- Response keeps `items` and `categories`, and adds `pagination`.

### Best-selling menu items

```http
GET /api/menu/best-selling?categoryId=2&restaurantId=1&limit=48
GET /api/menu/best-selling?categoryId=2&limit=48
```

Notes:

- `categoryId` filters best-selling items by category.
- `restaurantId` is optional; omit it to get best-selling items from all restaurants in that category.

### Create order

`POST /api/orders`

```json
{
  "userId": 3,
  "restaurantId": 1,
  "addressId": 1,
  "orderType": "DELIVERY",
  "discountAmount": 20,
  "items": [
    {
      "menuItemId": 1,
      "variantId": 1,
      "quantity": 2,
      "price": 189
    }
  ]
}
```

Notes:

- For `customer` users, backend overrides `userId` from the JWT token.
- `admin` can create orders for any user.

### Initiate payment

`POST /api/payments/initiate`

```json
{
  "orderId": 1,
  "userId": 3,
  "transactionId": "TXN-20260417-001",
  "amount": 268,
  "status": "SUCCESS",
  "method": "UPI"
}
```

### Update delivery location

`POST /api/deliveries/location`

```json
{
  "deliveryId": 1,
  "latitude": 12.971,
  "longitude": 77.599,
  "speed": 22,
  "heading": 135
}
```

### Track order delivery

`GET /api/deliveries/order/1/track`

Sample response:

```json
{
  "deliveryId": 1,
  "status": "ON_THE_WAY",
  "agent": {
    "id": 1,
    "name": "Ravi Kumar",
    "phone": "+919900000099",
    "isAvailable": false
  },
  "orderNumber": "ORD-DEMO-1001",
  "latestLocation": {
    "id": 2,
    "deliveryId": 1,
    "latitude": 12.971,
    "longitude": 77.599,
    "speed": 22,
    "heading": 135,
    "recordedAt": "2026-04-17T09:45:00.000Z"
  },
  "trackingHistory": []
}
```

## Demo users

- `admin@example.com` / `password123`
- `manager@example.com` / `password123`
- `customer@example.com` / `password123`
- `delivery@example.com` / `password123`
