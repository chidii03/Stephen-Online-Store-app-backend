import db from '../db/database.js';
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import cron from 'node-cron';
import { logger } from '../utils/logger.js';

/**
 * 1. CREATE TRANSPORTER FUNCTION (fresh per request to avoid timeouts)
 */
const createTransporter = () => nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,                    // 587 with STARTTLS is more reliable on Render
  secure: false,                 // false for 587
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,   // Helps in some cloud environments
    ciphers: 'SSLv3'
  },
  connectionTimeout: 10000,      // 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

/**
 * 2. EMAIL TEMPLATES (full HTML preserved)
 */
const templates = {
  welcome: {
    subject: "Welcome to Steve-Obizz-Store! ✨",
    html: `
      <html>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; color: #333; padding: 20px; margin: 0;">
          <div style="max-width: 600px; margin: auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
            <h2 style="text-align: center; color: #4b70f5;">Welcome to Steve-Obizz-Store!</h2>
            <p style="font-size: 16px; line-height: 1.6;">Dear New Customer,</p>
            <p style="font-size: 16px; line-height: 1.6;">
              We are genuinely delighted to welcome you to the Steve-Obizz-Store. Your subscription marks the beginning of an exciting journey, and we couldn't be more thrilled to have you join us.
            </p>
            <div style="margin-top: 20px; text-align: center;">
              <img src="https://images.unsplash.com/photo-1677530410699-f692c94cf806?w=600" style="max-width: 100%; border-radius: 10px;" alt="Welcome Image">
            </div>
            <p style="font-size: 16px; line-height: 1.6;">
              As a valued member, you can look forward to receiving carefully curated content, exclusive offers, and first access to our latest product launches.
            </p>
            <div style="margin-top: 20px; text-align: center;">
              <a href="https://steveobizzstore.vercel.app" style="display: inline-block; background-color: #4b70f5; color: white; padding: 12px 20px; border-radius: 5px; text-decoration: none; font-weight: bold;">Shop Now</a>
            </div>
            <footer style="margin-top: 30px; text-align: center; font-size: 14px; color: #666;">
              <p>Warm regards,<br>The Steve-Obizz-Store Team</p>
              <p>No 69 Obafemi Awolowo Way, Ikeja, Lagos, Nigeria</p>
              <p>+234 803 304 8352</p>
            </footer>
          </div>
        </body>
      </html>`
  },
  weekly: {
    subject: "Exclusive Update from Steve-Obizz-Store! 💡",
    html: `
      <html>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; color: #333; padding: 20px; margin: 0;">
          <div style="max-width: 600px; margin: auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #4b70f5; text-align: center;">Weekly Inspiration</h2>
            <div style="margin-top: 20px; text-align: center;">
              <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600" style="width: 100%; border-radius: 10px; margin-bottom: 15px;" alt="Inspiration">
            </div>
            <p style="font-size: 16px; line-height: 1.6;">
              Explore our latest artisanal paper collection and enjoy special offers crafted just for you this week. Don't miss out on what's new!
            </p>
            <div style="margin-top: 20px; text-align: center;">
              <a href="https://steveobizzstore.vercel.app" style="display: inline-block; background-color: #4b70f5; color: white; padding: 12px 20px; border-radius: 5px; text-decoration: none; font-weight: bold;">Browse Collection</a>
            </div>
            <footer style="margin-top: 30px; text-align: center; font-size: 14px; color: #666;">
              <p>The Steve-Obizz-Store Team</p>
              <p>No 69 Obafemi Awolowo Way, Ikeja, Lagos, Nigeria</p>
            </footer>
          </div>
        </body>
      </html>`
  }
};

/**
 * 3. SUBSCRIPTION HANDLER
 */
export const subscribe = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    // Ensure subscribers table exists
    await db.execute(`
      CREATE TABLE IF NOT EXISTS subscribers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Save to Turso (ignore duplicates)
    await db.execute({
      sql: "INSERT OR IGNORE INTO subscribers (email) VALUES (?)",
      args: [email]
    });

    // Send welcome email using a fresh transporter
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Steve Obizz Store Team" <${env.EMAIL_USER}>`,
      to: email,
      subject: templates.welcome.subject,
      html: templates.welcome.html
    });

    logger.info(`Welcome email sent to ${email}`);
    return res.status(200).json({
      success: true,
      message: "Check your inbox! The welcome email is on its way."
    });

  } catch (error) {
    logger.error("Subscription Error:", error);
    
    if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKET') {
      return res.status(503).json({ error: "Email service timed out. Please try again later." });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * 4. WEEKLY CRON JOB – only if explicitly enabled (prevents duplicate runs on multiple instances)
 */
if (process.env.ENABLE_CRON === 'true') {
  cron.schedule('0 9 * * 1', async () => {
    logger.info("Weekly Newsletter Cron Started");

    try {
      // Ensure table exists (cron might run before any subscription)
      await db.execute(`
        CREATE TABLE IF NOT EXISTS subscribers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const result = await db.execute("SELECT email FROM subscribers");
      const subscribers = result.rows || [];

      for (const sub of subscribers) {
        try {
          const transporter = createTransporter();
          await transporter.sendMail({
            from: `"Steve Obizz Store Team" <${env.EMAIL_USER}>`,
            to: sub.email,
            subject: templates.weekly.subject,
            html: templates.weekly.html
          });
          logger.info(`Weekly email sent to: ${sub.email}`);
          // Small delay to avoid overwhelming SMTP
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
          logger.error(`Cron Failed for ${sub.email}:`, err);
        }
      }
    } catch (dbErr) {
      logger.error("Cron DB Error:", dbErr);
    }
  });

  logger.info("Weekly cron scheduled (Monday 9:00 AM)");
} else {
  logger.info("Weekly cron disabled – set ENABLE_CRON=true to activate");
}