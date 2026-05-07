# Quick Testing Guide

## Prerequisites
- PostgreSQL running and configured
- Backend migrations applied: `npx prisma migrate dev`
- Backend server running: `npm run dev` in `/backend`
- Frontend dev server running: `npm run dev` in `/web-app`
- User authenticated in the app

## Testing Cart Functionality

### 1. Add Items to Cart
```
1. Navigate to Menu page
2. Click + to increase quantity
3. Click "Add to cart"
4. Item should appear in Redux state and localStorage
5. Inspect: localStorage.getItem('cart_items')
```

### 2. Cart Persistence
```
1. Add items to cart
2. Hard refresh page (Ctrl+Shift+R)
3. Cart should still have items (loaded from localStorage)
4. Network tab should show GET /api/carts if authenticated
```

### 3. Cart Operations
```
- Update quantity: Use +/- buttons in CartPage
- Remove item: Click "Remove" button
- Clear cart: Use Redux action (check Redux DevTools)
```

## Testing Order Creation

### 1. Place Order
```
1. Add items to cart
2. Navigate to CartPage
3. Click "Place Order"
4. Should call POST /api/orders
5. Order should be created in database
6. Cart should be cleared after success
7. Navigate to payment page
```

### 2. Verify Order in Database
```
psql restaurant_db
SELECT * FROM orders WHERE user_id = 3 ORDER BY created_at DESC LIMIT 1;
SELECT * FROM order_items WHERE order_id = <order_id>;
```

### 3. Order Response Verification
```
Check Redux state: store.getState().orders.currentOrder
Should include:
- id, userId, restaurantId, orderNumber
- items with menuItem and variant details
- statusLogs
- status: "PLACED"
- paymentStatus: "PENDING"
```

## Testing Payment Initiation

### 1. Initiate Payment (Manual Test)
```javascript
// In browser console:
fetch('http://localhost:4000/api/payments/initiate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN_HERE'
  },
  body: JSON.stringify({
    orderId: 1,
    userId: 3,
    transactionId: 'TXN-20260505-001',
    amount: 268,
    status: 'SUCCESS',
    method: 'UPI'
  })
})
.then(r => r.json())
.then(d => console.log(d))
```

## API Testing with cURL

### Get Cart
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:4000/api/carts
```

### Add to Cart
```bash
curl -X POST http://localhost:4000/api/carts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "menuItemId": 1,
    "variantId": 1,
    "quantity": 2,
    "price": 189
  }'
```

### Create Order
```bash
curl -X POST http://localhost:4000/api/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 3,
    "restaurantId": 1,
    "tableId": 1,
    "orderType": "DELIVERY",
    "discountAmount": 0,
    "items": [{
      "menuItemId": 1,
      "variantId": 1,
      "quantity": 2,
      "price": 189
    }]
  }'
```

### Get Order
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:4000/api/orders/1
```

### Initiate Payment
```bash
curl -X POST http://localhost:4000/api/payments/initiate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": 1,
    "userId": 3,
    "transactionId": "TXN-20260505-001",
    "amount": 268,
    "status": "SUCCESS",
    "method": "UPI"
  }'
```

## Redux DevTools Inspection

### Check Cart State
```
Store → cart
- items: [array of items with quantity, price, etc]
- loading: boolean
- error: null or error message
- syncing: boolean (when syncing with server)
```

### Check Order State
```
Store → orders
- currentOrder: {order details}
- loading: boolean
- error: null or error message
```

### Check Payment State
```
Store → payments
- payments: [array of payments]
- loading: boolean
- error: null or error message
```

## Common Issues & Solutions

### Cart Empty After Refresh
- Check localStorage: `localStorage.getItem('cart_items')`
- Check network tab for GET /api/carts request
- Verify user authentication token is valid

### Order Creation Fails
- Check Auth token in Authorization header
- Verify all required fields in payload (userId, restaurantId, items)
- Check backend console for validation errors

### Payment Not Recording
- Verify orderId exists in database
- Check userId matches order owner
- Verify amount is a valid number

## Database Cleanup (if needed)

```sql
-- Clear test data
DELETE FROM cart_items WHERE user_id = 3;
DELETE FROM payments WHERE user_id = 3;
DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = 3);
DELETE FROM orders WHERE user_id = 3;

-- Verify cleanup
SELECT COUNT(*) FROM cart_items WHERE user_id = 3;
SELECT COUNT(*) FROM orders WHERE user_id = 3;
```

## Performance Monitoring

### Check Network Waterfall
1. Open DevTools Network tab
2. Add to cart
3. Should see: 
   - POST /api/carts (±100ms)
   - Redux state update (instant)
   - localStorage write (instant)

### Check Redux State Size
```javascript
// In console:
JSON.stringify(store.getState()).length // bytes
```

Keep it under 5MB for optimal performance.
