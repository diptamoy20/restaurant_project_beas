# Backend API Examples

Base URL: `http://localhost:4000/api`

Swagger UI: `/api/docs` when docs are enabled.

Use protected APIs with:

```http
Authorization: Bearer <accessToken>
```

## Auth

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/social-login
POST /api/auth/forgot-password
POST /api/auth/reset-password
POST /api/auth/refresh
POST /api/auth/logout
GET /api/auth/me
PATCH /api/auth/me
POST /api/auth/me/profile-image
```

Login body:

```json
{
  "email": "customer@example.com",
  "password": "password123"
}
```

## Checkout Quote With GST And Coupon

`POST /api/checkout/quote`

```json
{
  "restaurantId": 1,
  "addressId": 1,
  "orderType": "DELIVERY",
  "couponCode": "WELCOME50",
  "items": [
    {
      "menuItemId": 1,
      "variantId": 2,
      "quantity": 2,
      "addons": [
        {
          "addonGroupId": 1,
          "addonOptionId": 2
        }
      ]
    }
  ]
}
```

Response totals are calculated on the backend:

```json
{
  "restaurantId": 1,
  "currency": "INR",
  "mrpSubtotal": 500,
  "subtotalAmount": 450,
  "menuDiscountAmount": 50,
  "couponCode": "WELCOME50",
  "couponDiscountAmount": 40,
  "manualDiscountAmount": 0,
  "taxableAmount": 410,
  "gstRate": 5,
  "cgstAmount": 10.25,
  "sgstAmount": 10.25,
  "igstAmount": 0,
  "taxAmount": 20.5,
  "isDeliveryAvailable": true,
  "distanceKm": 1.13,
  "estimatedDeliveryMinutes": 24,
  "deliveryFee": 27,
  "deliveryCharge": 27,
  "packagingCharge": 10,
  "freeDeliveryMinAmount": 499,
  "deliveryUnavailableReason": null,
  "deliveryFeeBreakdown": {
    "distanceKm": 1.13,
    "baseFee": 20,
    "baseDistanceKm": 1,
    "extraDistanceKm": 0.13,
    "extraUnits": 1,
    "perKmFee": 7,
    "deliveryCharge": 27,
    "packagingCharge": 10,
    "freeDeliveryApplied": false,
    "freeDeliveryMinAmount": 499
  },
  "finalAmount": 467.5
}
```

## Orders

`POST /api/orders`

```json
{
  "userId": 3,
  "restaurantId": 1,
  "addressId": 1,
  "orderType": "DELIVERY",
  "couponCode": "WELCOME50",
  "items": [
    {
      "menuItemId": 1,
      "variantId": 1,
      "quantity": 2
    }
  ]
}
```

Notes:

- Customer `userId` is taken from JWT.
- Customer `discountAmount` is ignored.
- Admin/manager may send `manualDiscountAmount`.
- Razorpay order amount uses server `finalAmount`.

## Payments

```http
POST /api/payments/razorpay/order
POST /api/payments/razorpay/verify
POST /api/payments/razorpay/failure
POST /api/payments/cod/confirm
```

Create Razorpay order:

```json
{
  "orderId": 1
}
```

## Admin Coupons

Coupon codes are unique per restaurant scope. Use `restaurantId: null` or omit it for a global coupon.
The same code can be reused for different restaurants, but not twice for the same restaurant.
If a global and restaurant coupon share one code, checkout uses the restaurant coupon first.

```http
GET /api/admin/coupons?restaurantId=1&status=active&search=WELCOME&limit=20
GET /api/admin/coupons/:id
POST /api/admin/coupons
POST /api/admin/coupons/bulk
PATCH /api/admin/coupons/:id
DELETE /api/admin/coupons/:id
```

Create coupon:

```json
{
  "restaurantId": 1,
  "code": "WELCOME50",
  "description": "Welcome offer",
  "discountType": "PERCENTAGE",
  "discountValue": 10,
  "maxDiscountAmount": 100,
  "minOrderAmount": 299,
  "startsAt": "2026-05-25T00:00:00.000Z",
  "expiresAt": "2026-06-25T23:59:59.000Z",
  "usageLimitTotal": 500,
  "usageLimitPerUser": 1,
  "isActive": true
}
```

Create same coupon for multiple restaurants:

```json
{
  "restaurantIds": [1, 2, 3],
  "code": "WELCOME50",
  "description": "Welcome offer",
  "discountType": "PERCENTAGE",
  "discountValue": 10,
  "maxDiscountAmount": 100,
  "minOrderAmount": 299,
  "usageLimitTotal": 500,
  "usageLimitPerUser": 1,
  "isActive": true
}
```

## Restaurants

Restaurant create/update supports Indian GST billing and admin-controlled delivery pricing fields:

```json
{
  "name": "Downtown Spice Hub",
  "address": "45 Residency Road",
  "city": "Bengaluru",
  "latitude": 12.9663,
  "longitude": 77.6012,
  "deliveryEnabled": true,
  "deliveryRadiusKm": 8,
  "deliveryBaseFee": 20,
  "deliveryBaseDistanceKm": 1,
  "deliveryPerKmFee": 7,
  "deliveryFeeMin": 20,
  "deliveryFeeCap": 99,
  "freeDeliveryMinAmount": 499,
  "packagingCharge": 10,
  "gstin": "29ABCDE1234F1Z5",
  "gstRate": 5,
  "gstEnabled": true,
  "isActive": true
}
```

## Public Restaurant And Menu

```http
GET /api/restaurants?limit=20&offset=0
GET /api/restaurants/search?q=spice
GET /api/v1/restaurants/nearby?lat=12.9716&lng=77.5946&radiusKm=10
GET /api/restaurants/:id
GET /api/v1/restaurants/:id/menu?categoryId=2&limit=20
GET /api/menu/restaurant/:restaurantId?limit=50
GET /api/menu/best-selling?restaurantId=1&limit=12
POST /api/v1/address/validate
```

## Admin Menu

Menu item create/update supports `discountPrice`. If no variant is selected at checkout, backend uses `discountPrice` when it is lower than `price`.

```http
GET /api/admin/restaurants/:restaurantId/menu
POST /api/admin/restaurants/:restaurantId/menu
PUT /api/admin/menu/:id
DELETE /api/admin/menu/:id
```

## QR Ordering

```http
GET /api/qr/menu/:restaurantId/:tableId
POST /api/qr/order
```

QR order response includes `subtotalAmount`, `taxableAmount`, `gstRate`, `cgstAmount`, `sgstAmount`, `taxAmount`, and `finalAmount`.

## Delivery Boy Mobile APIs

Use a `delivery_boy` access token. All `/api/deliveries/me/*` routes resolve the delivery agent from the authenticated user and only return assigned deliveries.

```http
GET /api/deliveries/me/dashboard
GET /api/deliveries/me/orders?status=ASSIGNED&limit=20&offset=0
GET /api/deliveries/me/orders/:orderId
PATCH /api/deliveries/me/availability
PATCH /api/deliveries/me/orders/:orderId/accept
PATCH /api/deliveries/me/orders/:orderId/status
POST /api/deliveries/me/location
```

```json
{
  "isAvailable": true
}
```

```json
{
  "status": "ON_THE_WAY"
}
```

```json
{
  "orderId": 1025,
  "latitude": 22.5726,
  "longitude": 88.3639,
  "speed": 22,
  "heading": 135
}
```

## Other Protected APIs

```http
GET /api/carts
POST /api/carts
PUT /api/carts/:menuItemId
DELETE /api/carts/:menuItemId
DELETE /api/carts
GET /api/users/me/addresses
POST /api/users/me/addresses
PATCH /api/users/me/addresses/:id
DELETE /api/users/me/addresses/:id
PATCH /api/users/me/addresses/:id/default
GET /api/orders/my-orders
GET /api/orders/:id
GET /api/admin/dashboard
GET /api/admin/orders
PATCH /api/admin/orders/:id/accept
PATCH /api/admin/orders/:id/status
GET /api/membership/user/:userId
GET /api/deliveries/me/dashboard
GET /api/deliveries/me/orders
GET /api/deliveries/me/orders/:orderId
PATCH /api/deliveries/me/availability
PATCH /api/deliveries/me/orders/:orderId/accept
PATCH /api/deliveries/me/orders/:orderId/status
POST /api/deliveries/me/location
POST /api/deliveries/location
GET /api/deliveries/order/:orderId/track
GET /api/notifications/user/:userId
GET /api/health
```
