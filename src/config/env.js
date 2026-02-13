import dotenv from "dotenv";
dotenv.config();

const required = {
  PORT: process.env.PORT || 5000,
  PAYSTACK_SECRET: process.env.PAYSTACK_SECRET_KEY,
  MAIL_USER: process.env.MAIL_USER,
  MAIL_PASS: process.env.MAIL_PASS,
  TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL,
  TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN,
  FRONTEND_URL: process.env.FRONTEND_URL || "https://steveobizzstore.vercel.app",
  TWILIO_WHATSAPP_NUMBER:process.env.TWILIO_WHATSAPP_NUMBER,
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL, 
  ADMIN_PASS: process.env.ADMIN_PASS,
  ADMIN_PHONE:process.env.ADMIN_PHONE
};

const optional = {
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_WHATSAPP_NUMBER: process.env.TWILIO_WHATSAPP_NUMBER,
};

export const env = {
  ...required,
  ...optional,
  NODE_ENV: process.env.NODE_ENV || 'development',
};
