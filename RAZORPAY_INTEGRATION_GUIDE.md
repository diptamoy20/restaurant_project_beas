# Razorpay Integration Setup Guide

## 1) Backend setup

1. Install dependencies:
   - `cd backend`
   - `npm install`
2. Copy env:
   - Copy `backend/.env.example` to `backend/.env`
3. Fill Razorpay values:
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
4. Run migration:
   - `npm run prisma:migrate`
5. Start backend:
   - `npm run start:dev`

## 2) Frontend setup

1. Install dependencies:
   - `cd web-app`
   - `npm install`
2. Copy env:
   - Copy `web-app/.env.example` to `web-app/.env`
3. Set:
   - `VITE_API_BASE_URL`
   - `VITE_RAZORPAY_KEY_ID` (public key only)
4. Start frontend:
   - `npm run dev`

## 3) Payment APIs

- `POST /api/payments/razorpay/order`
  - Input: `{ "orderId": number }`
  - Creates Razorpay order in INR and stores `razorpay_order_id`
- `POST /api/payments/razorpay/verify`
  - Input: `{ orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature }`
  - Verifies HMAC SHA256 and marks order as `PAID`
- `POST /api/payments/razorpay/failure`
  - Stores failed payment attempts and increments retry count
- `POST /api/payments/cod/confirm`
  - Marks payment method as `COD` and keeps payment status `PENDING`

## 4) Test mode checklist

1. Use `rzp_test_*` credentials from Razorpay dashboard.
2. Create order from checkout.
3. Complete payment with Razorpay test card/UPI methods.
4. Confirm order payment status becomes `PAID`.
5. Test failure and modal dismiss to validate retry and failure logs.

## 5) Security checklist

- Keep `RAZORPAY_KEY_SECRET` only in backend env.
- Verify signature only on backend.
- Do not trust frontend amount; backend uses DB order amount.
- Record failed attempts for audit trail and retries.
