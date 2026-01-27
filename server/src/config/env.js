import dotenv from 'dotenv';
dotenv.config();

export const env = {
  PORT: process.env.PORT || 5000,
  PAYSTACK_SECRET: process.env.PAYSTACK_SECRET_KEY,
  MAIL_USER: process.env.MAIL_USER,
  MAIL_PASS: process.env.MAIL_PASS,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback_secret_key_change_this',
  ADMIN_EMAIL: 'stephenokwu@yahoo.com', // Hardcoded for MVP, or move to DB
  ADMIN_PASS: 'admin123'
};