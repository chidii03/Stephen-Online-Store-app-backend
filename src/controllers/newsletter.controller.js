import db from '../db/database.js';
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import cron from 'node-cron';
import { logger } from '../utils/logger.js';

/**
 * 1. TRANSPORTER CONFIGURATION
 * Optimized for Render by using Port 465 (Secure SSL) to prevent ETIMEDOUT.
 */
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465, 
  secure: true, // Use true for port 465
  pool: true,   // Keeps connections open for multiple emails (better for cron)
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false // Helps avoid handshake errors in cloud environments
  }
});

/**
 * 2. SUBSCRIPTION LOGIC
 */
export const subscribe = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    // Attempt to save to Turso Database
    try {
      await db.execute({
        sql: "INSERT INTO subscribers (email) VALUES (?)",
        args: [email]
      });
      logger.info(`New subscriber added to DB: ${email}`);
    } catch (dbError) {
      // If user is already in DB, just log it and proceed to send the email
      if (dbError.message?.includes('UNIQUE')) {
        logger.info(`Existing subscriber requested email: ${email}`);
      } else {
        throw dbError; 
      }
    }

    // Always send the Welcome email
    await sendProfessionalEmail(email, 'welcome');
    
    return res.status(200).json({ 
      success: true, 
      message: "Check your inbox! The welcome email is on its way." 
    });

  } catch (error) {
    logger.error("Subscription Error:", error);
    
    if (error.code === 'ETIMEDOUT') {
      return res.status(503).json({ error: "Email service timed out. Please try again." });
    }

    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * 3. EMAIL TEMPLATES & SENDER
 */
const sendProfessionalEmail = async (email, type) => {
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

  const content = templates[type];

  return transporter.sendMail({
    from: `"Steve Obizz Store Team" <${env.EMAIL_USER}>`,
    to: email,
    subject: content.subject,
    html: content.html
  });
};

/**
 * 4. WEEKLY CRON JOB
 * Runs every Monday at 9:00 AM
 */
cron.schedule('0 9 * * 1', async () => {
  logger.info("Running Weekly Newsletter Cron...");
  try {
    const result = await db.execute("SELECT email FROM subscribers");
    
    // Using a for...of loop with await to ensure we don't overwhelm the connection
    for (const sub of result.rows) {
      try {
        await sendProfessionalEmail(sub.email, 'weekly');
        logger.info(`Weekly email sent to: ${sub.email}`);
      } catch (err) {
        logger.error(`Cron Failed for ${sub.email}:`, err);
      }
    }
  } catch (dbErr) {
    logger.error("Cron DB Error:", dbErr);
  }
});