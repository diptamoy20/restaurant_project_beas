# QR-Based Dine-In Ordering Module

## Overview

This module implements QR-based dine-in ordering for guest customers. It allows customers to scan QR codes at restaurant tables, view the live menu, and place dine-in orders without creating an account or logging in.

## Architecture

The QR module follows NestJS modular architecture and integrates seamlessly with the existing order management system:

- **Reuses existing Order + OrderItem tables** - No separate tables created
- **Delegates to centralized OrderService** - All order creation logic centralized
- **Maintains existing API compatibility** - No breaking changes to existing endpoints
- **Public QR endpoints only** - Guests can use QR menu and order creation without weakening auth on other modules
- **Server-side pricing** - Client-submitted totals, prices, and discounts are not trusted
- **GST billing** - QR orders return GST snapshot totals from restaurant billing config

## API Endpoints

All routes are served under the global `/api` prefix.

### GET /api/qr/menu/:restaurantId/:tableId

Public endpoint. Retrieves the available menu for a specific active restaurant and table.

**Parameters:**

- `restaurantId` (number): Restaurant ID
- `tableId` (number): Table ID

**Response:**

```json
{
  "restaurant": {
    "id": 1,
    "name": "Mario's Pizzeria",
    "description": "Authentic Italian cuisine",
    "tableId": 12,
    "tableName": "Table 12"
  },
  "categories": [
    {
      "id": 1,
      "name": "Pizza",
      "description": "Wood-fired pizzas",
      "items": [
        {
          "id": 1,
          "name": "Margherita Pizza",
          "description": "Fresh tomato sauce, mozzarella, basil",
          "price": 250,
          "isAvailable": true,
          "preparationTime": 15,
          "categoryId": 1,
          "variants": [
            {
              "id": 2,
              "name": "Large",
              "price": 150,
              "isAvailable": true
            }
          ]
        }
      ]
    }
  ]
}
```

### POST /api/qr/order

Public endpoint. Creates a new guest QR dine-in order.

**Request Body:**

```json
{
  "restaurantId": 1,
  "tableId": 12,
  "items": [
    {
      "menuItemId": 1,
      "variantId": 2,
      "quantity": 2
    }
  ],
  "paymentMethod": "COD"
}
```

Notes:

- `items` must contain at least one item.
- `quantity` must be `1` or greater.
- `paymentMethod` is optional and must be a supported value when provided.
- Guest QR orders do not accept raw `discountAmount`; pricing and totals are calculated server-side.

**Response:**

```json
{
  "orderId": 123,
  "orderNumber": "ORD-1640995200000",
  "status": "PENDING",
  "estimatedTime": 20,
  "subtotalAmount": 500,
  "taxableAmount": 500,
  "gstRate": 5,
  "cgstAmount": 12.5,
  "sgstAmount": 12.5,
  "taxAmount": 25,
  "finalAmount": 525
}
```

## Workflow

1. **Customer scans QR code** at table (URL: `https://your-domain.com/qr/restaurant/1/table/12`)
2. **Frontend extracts** restaurantId and tableId from URL
3. **Frontend calls** `GET /api/qr/menu/:restaurantId/:tableId`
4. **Backend validates** restaurant and table existence
5. **Backend returns** menu data with categories and items
6. **Customer browses menu** and adds items to cart
7. **Customer places order** via `POST /api/qr/order`
8. **QR module validates** order data and delegates to OrderService with guest-safe values
9. **OrderService creates order** with `userId: null`, `source: QR_DINE_IN`, and `orderType: DINE_IN`
10. **Order stored** in existing orders and order_items tables
11. **Admin panel** automatically receives order (no changes needed)
12. **Customer receives** order confirmation with estimated time

Guest order tracking is intentionally not included in this module.

## Key Features

- **Guest orders**: No user authentication required
- **Table validation**: Ensures table belongs to restaurant
- **Menu validation**: Only shows available items
- **Centralized pricing**: Uses existing OrderService billing logic
- **Discount protection**: Guest-provided discounts are not accepted
- **Estimated time calculation**: Based on menu item preparation times
- **Transaction safety**: Uses Prisma transactions for data consistency
- **Order numbering**: Automatic order number generation
- **Status tracking**: Integrated with existing order status system

## Integration Points

- **OrderService.createOrder()**: Delegates all order creation logic
- **Existing Order/OrderItem tables**: No schema changes required
- **Existing admin panel**: Automatically receives QR orders
- **Existing payment system**: QR orders can use existing payment methods
- **Existing notification system**: Works with existing order notifications

## Security Considerations

- Input validation on all endpoints
- Restaurant and table existence validation
- Menu item availability checks
- Variant ownership validation through OrderService
- Public access is limited to QR menu and QR order creation endpoints
- Guest orders never trust frontend prices, totals, or discounts
- SQL injection prevention via Prisma ORM
- Existing application rate limiting middleware applies to these routes

## Error Handling

- `404 Not Found`: Restaurant or table not found
- `400 Bad Request`: Invalid order data, empty items, invalid quantity, unavailable menu items, invalid variant, unsupported payment method, or disallowed extra fields
- `500 Internal Server Error`: Database or system errors

## Testing

The module includes comprehensive validation and error handling. Test cases should cover:

- Valid restaurant/table combinations
- Invalid restaurant/table combinations
- Menu item availability
- Order creation with various item combinations
- QR order creation without JWT
- QR order source stored as `QR_DINE_IN`
- QR order user stored as `null`
- Guest discount rejection
- Estimated time calculation
