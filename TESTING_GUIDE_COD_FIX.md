# COD Order Retry Payment Fix - Testing Guide

## Quick Start Testing

### Prerequisites
- Backend running on `http://localhost:3000` (or configured port)
- Frontend running on `http://localhost:5173` (or configured port)
- Admin panel running on `http://localhost:5174` (or configured port)
- Test user account created
- At least one restaurant configured in system

## Test Scenarios

### Test Scenario 1: Place COD Order - No Retry Payment Button

#### Steps:
1. Open web app at `http://localhost:5173`
2. Login with test user account
3. Select a restaurant
4. Add items to cart
5. Go to checkout
6. In payment method section, select "Pay by cash on delivery" (COD)
7. Select delivery address
8. Complete checkout
9. Wait for redirect to payment page

#### Expected Results:
- ✅ Order created successfully
- ✅ Order appears in order list
- ✅ Payment page shows Order ID
- ✅ Payment status displays as "Awaiting Cash Collection"
- ✅ **NO "Retry Payment" button appears** (this is the key fix)
- ✅ Only "Download Invoice" button appears if applicable
- ✅ Order appears in admin panel

#### Verification:
- Check browser console for any errors
- Check network tab - no calls to `/payments/razorpay/order`
- Check admin panel - order shows `Payment Method: COD`

---

### Test Scenario 2: Place COD Order - Refresh Payment Page

#### Steps:
1. From Test Scenario 1, note the Order ID
2. Refresh the payment page (F5 or Cmd+R)
3. Observe the payment page after refresh

#### Expected Results:
- ✅ Payment page reloads with correct order data
- ✅ Payment status still shows "Awaiting Cash Collection"
- ✅ **NO "Retry Payment" button appears**
- ✅ No errors in console

#### Verification:
- Network tab shows `/orders/{orderId}` call
- Response includes `paymentMethod: "COD"`
- Frontend correctly preserves `paymentMethod` in Redux state

---

### Test Scenario 3: Verify Backend Rejects COD Payment for Razorpay Order Creation

#### Steps:
1. Create a COD order (from Test Scenario 1)
2. Open developer console (F12)
3. Go to Network tab
4. Try to manually trigger Razorpay order creation:

```javascript
// In browser console:
fetch('/api/payments/razorpay/order', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({ orderId: ORDER_ID_FROM_COD_ORDER })
}).then(r => r.json()).then(console.log)
```

#### Expected Results:
- ✅ Backend returns 400 Bad Request
- ✅ Error message: "Cannot create Razorpay order for Cash on Delivery orders..."
- ✅ No Razorpay order created in database
- ✅ Order's paymentMethod remains 'COD'

---

### Test Scenario 4: Razorpay Order Retry Still Works (Regression Test)

#### Steps:
1. Place a new order with **Online Payment (RAZORPAY)**
2. On Razorpay checkout, click "Close" or cancel payment
3. Payment page appears
4. Observe retry button

#### Expected Results:
- ✅ "Retry Payment" button is visible
- ✅ Clicking it reopens Razorpay checkout
- ✅ Can complete payment or cancel again
- ✅ No errors related to COD validation

#### Verification:
- All Razorpay functionality works as before
- No regressions introduced

---

### Test Scenario 5: Admin Panel COD Confirmation

#### Steps:
1. Create a COD order (Test Scenario 1)
2. Go to admin panel: `http://localhost:5174`
3. Navigate to Orders
4. Find the COD order created in Test 1
5. Click to open order details

#### Expected Results:
- ✅ Order details show:
  - Payment Method: **COD**
  - Payment Status: **PENDING**
- ✅ "Confirm COD Payment" button is visible
- ✅ Button is NOT visible for Razorpay orders

#### Verification:
- Admin correctly identifies COD orders
- Only COD orders show the confirm button
- Admin can properly manage COD payments

---

### Test Scenario 6: Admin Confirm COD Payment

#### Steps:
1. From Test Scenario 5, with order details open
2. Click "Confirm COD Payment" button
3. Observe the result

#### Expected Results:
- ✅ Order status updates to reflect COD payment confirmed
- ✅ Payment Status changes to **PAID**
- ✅ Success message displayed
- ✅ "Download Invoice" option becomes available

---

## Edge Cases & Additional Tests

### Edge Case 1: Multiple Retry Attempts on COD Order

#### Setup:
- Create COD order

#### Steps:
1. Payment page appears
2. Try clicking retry button multiple times (if visible)
3. Check for error handling

#### Expected Results:
- ✅ Retry button never appears for COD
- ✅ If somehow triggered via console, backend rejects

---

### Edge Case 2: Rapid Checkout and Navigation

#### Steps:
1. Place COD order
2. Immediately navigate to order history before payment page loads
3. Come back to payment page

#### Expected Results:
- ✅ Payment status correctly preserved
- ✅ No race condition issues
- ✅ Retry button still not visible

---

### Edge Case 3: API Response Validation

#### Steps:
1. Place COD order
2. Check the `/orders/{orderId}` API response

#### Expected Results:
```json
{
  "id": 123,
  "paymentMethod": "COD",
  "paymentStatus": "PENDING",
  // ... other fields
}
```

#### Verification:
- Frontend correctly extracts `paymentMethod` from response
- Frontend correctly renders based on this value

---

## Debugging Guide

### If Retry Button Still Appears for COD Order

**Checklist:**
1. ✅ Confirm `paymentMethod` is set to 'COD' in database
   ```sql
   SELECT id, paymentMethod, paymentStatus FROM orders WHERE id = YOUR_ORDER_ID;
   ```

2. ✅ Verify PaymentPage received correct data
   - Open DevTools → Network
   - Check `/api/orders/{orderId}` response
   - Should include `"paymentMethod": "COD"`

3. ✅ Check Redux state
   - DevTools → Redux extension
   - Look for `orders.currentOrder.paymentMethod`
   - Should be 'COD'

4. ✅ Verify PaymentPage.jsx changes were applied
   - Check if `canRetryPayment` logic is present
   - Check if Retry button condition includes `canRetryPayment`

---

### If Backend Validation Not Working

**Checklist:**
1. ✅ Confirm backend code updated
   - Check `payments.service.ts` line ~36
   - Should see validation check for COD

2. ✅ Restart backend service
   ```bash
   npm run dev
   # or
   yarn dev
   ```

3. ✅ Clear browser cache
   - Frontend might be using old API response

4. ✅ Check backend logs for validation error messages

---

## Performance Testing

### Memory Leaks Check
- Scenario 1 (place COD order)
- Scenario 4 (place Razorpay order)
- Check browser DevTools → Memory tab
- No unexpected memory growth

### Network Performance
- Verify no extra API calls made
- Scenario 1 should NOT call `/payments/razorpay/order`
- Scenario 4 should call it normally

---

## Regression Testing Checklist

- [ ] COD order flow works
- [ ] Razorpay order flow works
- [ ] Razorpay payment verification works
- [ ] Razorpay payment retry works
- [ ] Admin COD confirmation works
- [ ] Order history displays correctly
- [ ] Invoice generation works
- [ ] No console errors
- [ ] No network errors
- [ ] Mobile responsive (payment page)
- [ ] Multiple browsers tested (Chrome, Firefox, Safari)

---

## Rollback Plan

If issues discovered, rollback:

```bash
# Backend
git checkout backend/src/modules/payments/payments.service.ts

# Frontend
git checkout web-app/src/pages/PaymentPage.jsx
git checkout web-app/src/hooks/useRazorpayPayment.js

# Restart services
npm run dev
```

---

## Success Criteria

✅ **All the following must be true:**

1. COD order placed → No Retry button visible
2. COD order refreshed → Still no Retry button
3. Razorpay order placed → Retry button visible
4. Razorpay retry works → Can retry payment
5. Admin confirms COD → Payment marked as paid
6. No API errors → Backend validation works
7. No console errors → Frontend validates
8. Order data consistent → All fields match expectations

---

## Monitoring in Production

After deployment, monitor:

1. **Payment Logs**
   - Track failed Razorpay creation attempts for COD orders
   - Should see validation errors (expected)

2. **Order Creation Metrics**
   - COD orders created
   - Razorpay orders created
   - Should not create duplicates

3. **Customer Feedback**
   - Report of "Retry Payment" button appearing for COD
   - Should be zero

4. **Admin Usage**
   - Track COD confirmation clicks
   - Should work smoothly

---

## Support & Escalation

If tests fail:

1. Check error message text
2. Review browser console
3. Review server logs
4. Check database state
5. Verify all files were updated
6. Restart all services
7. Clear all caches (browser, CDN, etc.)
