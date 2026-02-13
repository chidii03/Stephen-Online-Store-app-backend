import dotenv from "dotenv";
dotenv.config();

const required = {
  PORT: process.env.PORT || 5000,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL,
  TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN,
  FRONTEND_URL: process.env.FRONTEND_URL || "https://steveobizzstore.vercel.app",
};

// Optional Twilio vars – we'll check before using
const optional = {
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_WHATSAPP_NUMBER: process.env.TWILIO_WHATSAPP_NUMBER,
  ADMIN_PHONE: process.env.ADMIN_PHONE,
};

// Check required vars
for (const [key, value] of Object.entries(required)) {
  if (!value && key !== 'PORT') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  ...required,
  ...optional,
  NODE_ENV: process.env.NODE_ENV || 'development',
};