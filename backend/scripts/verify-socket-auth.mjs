import { config as loadEnv } from 'dotenv';
import jwt from 'jsonwebtoken';

loadEnv();

const secret = process.env.ACCESS_TOKEN_SECRET ?? process.env.JWT_SECRET;

if (!secret) {
  console.error('ACCESS_TOKEN_SECRET is not configured');
  process.exit(1);
}

const token = jwt.sign(
  {
    sub: 4,
    userId: 4,
    role: 'delivery_boy',
    type: 'access',
    email: 'delivery@example.com',
    phone: null,
    name: 'Delivery Boy',
  },
  secret,
  { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN ?? '15m' },
);

console.log('Sample access token for socket test:\n');
console.log(token);
console.log('\nConnect with:');
console.log(`io('http://localhost:${process.env.PORT ?? 4000}/delivery-tracking', {`);
console.log("  transports: ['polling', 'websocket'],");
console.log('  auth: { token },');
console.log('});');
