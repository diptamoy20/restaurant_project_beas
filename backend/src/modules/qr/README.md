# QR-Based Dine-In Ordering Module

## Overview

This module implements production-grade QR-based dine-in ordering functionality for the restaurant management system. It allows customers to scan QR codes at tables and place orders directly through their mobile devices.

## Architecture

The QR module follows NestJS modular architecture and integrates seamlessly with the existing order management system:

- **Reuses existing Order + OrderItem tables** - No separate tables created
- **Delegates to centralized OrderService** - All order creation logic centralized
- **Maintains existing API compatibility** - No breaking changes to existing endpoints

## API Endpoints

### GET /qr/menu/:restaurantId/:tableId

Retrieves the menu for a specific restaurant and table for QR ordering.

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

### POST /qr/order

Creates a new QR-based dine-in order.

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
  "paymentMethod": "COD",
  "discountAmount": 50
}
```

**Response:**
```json
{
  "orderId": 123,
  "orderNumber": "ORD-1640995200000",
  "status": "PLACED",
  "estimatedTime": 20
}
```

## Workflow

1. **Customer scans QR code** at table (URL: `https://your-domain.com/qr/restaurant/1/table/12`)
2. **Frontend extracts** restaurantId and tableId from URL
3. **Frontend calls** `GET /qr/menu/:restaurantId/:tableId`
4. **Backend validates** restaurant and table existence
5. **Backend returns** menu data with categories and items
6. **Customer browses menu** and adds items to cart
7. **Customer places order** via `POST /qr/order`
8. **QR module validates** order data and delegates to OrderService
9. **OrderService creates order** with `source: QR_DINE_IN` and `orderType: DINE_IN`
10. **Order stored** in existing orders and order_items tables
11. **Admin panel** automatically receives order (no changes needed)
12. **Customer receives** order confirmation with estimated time

## Key Features

- **Guest orders**: No user authentication required
- **Table validation**: Ensures table belongs to restaurant
- **Menu validation**: Only shows available items
- **Centralized pricing**: Uses existing OrderService pricing logic
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
- SQL injection prevention via Prisma ORM
- Rate limiting should be applied at infrastructure level

## Error Handling

- `404 Not Found`: Restaurant or table not found
- `400 Bad Request`: Invalid order data, unavailable menu items
- `500 Internal Server Error`: Database or system errors

## Testing

The module includes comprehensive validation and error handling. Test cases should cover:

- Valid restaurant/table combinations
- Invalid restaurant/table combinations
- Menu item availability
- Order creation with various item combinations
- Discount validation
- Estimated time calculation