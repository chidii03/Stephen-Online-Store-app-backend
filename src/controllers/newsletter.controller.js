import db from '../db/database.js';
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import cron from 'node-cron';
import { logger } from '../utils/logger.js';

// Setup Transporter using env variables
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // Use false for 587
  auth: {
    user: env.MAIL_USER,
    pass: env.MAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false 
  }
});

/**
 * 1. Subscription Logic
 * Handles saving to Turso and sending the welcome email
 */
export const subscribe = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    // Save to Turso Cloud Database
    await db.execute({
      sql: "INSERT INTO subscribers (email) VALUES (?)",
      args: [email]
    });
    
    // Send the professional welcome email
    await sendProfessionalEmail(email, 'welcome');
    
    return res.status(200).json({ 
      success: true, 
      message: "Subscription successful! Welcome email sent." 
    });

  } catch (error) {
    // Handle Turso Unique Constraint (User already exists)
    if (error.message?.includes('UNIQUE')) {
      return res.status(400).json({ error: "You are already subscribed!" });
    }
    
    logger.error("Subscription Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * 2. Professional Template Switcher
 * Contains the upgraded HTML templates from your original frontend logic
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
                We are genuinely delighted to welcome you to the Steve-Obizz-Store. Your subscription marks the beginning of an exciting journey.
              </p>
              <div style="margin-top: 20px; text-align: center;">
                <img src="https://images.unsplash.com/photo-1677530410699-f692c94cf806?w=600" style="max-width:100%; border-radius:10px;">
              </div>
              <p style="font-size: 16px; line-height: 1.6;">
                As a valued member, you can look forward to receiving carefully curated content, exclusive offers, and first access to our latest product launches.
              </p>
              <div style="margin-top: 20px; text-align: center;">
                <a href="https://stephen-online-store-my-app.vercel.app" style="display: inline-block; background-color: #4b70f5; color: white; padding: 12px 20px; border-radius: 5px; text-decoration: none; font-weight: bold;">Shop Now</a>
              </div>
              <footer style="margin-top: 30px; text-align: center; font-size: 14px; color: #666;">
                <p>Warm regards,<br>The Steve-Obizz-Store Team</p>
                <p>No 69 Obafemi Awolowo Way, Ikeja, Lagos, Nigeria</p>
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
              <p style="font-size: 16px; line-height: 1.6;">Hello from the Team,</p>
              <div style="margin-top: 20px; text-align: center;">
                <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600" style="width: 100%; border-radius: 10px; margin-bottom: 15px;">
              </div>
              <p style="font-size: 16px; line-height: 1.6;">
                Discover our latest artisanal paper collection and enjoy special offers crafted just for you. Stay inspired!
              </p>
              <footer style="margin-top: 30px; text-align: center; font-size: 14px; color: #666;">
                <p>The Steve-Obizz-Store Team</p>
                <p>+234 803 304 8352</p>
              </footer>
            </div>
          </body>
        </html>`
    }
  };

  const content = templates[type];

  return transporter.sendMail({
    from: `"Steve Obizz Store Team" <${env.MAIL_USER}>`,
    to: email,
    subject: content.subject,
    html: content.html
  });
};

/**
 * 3. REAL Weekly Cron Job
 * Runs every Monday at 9:00 AM. 
 * Fetches all emails from Turso and sends the 'weekly' template.
 */
cron.schedule('0 9 * * 1', async () => {
  logger.info("Running Weekly Newsletter Cron...");
  
  try {
    const result = await db.execute("SELECT email FROM subscribers");
    const subscribers = result.rows; 
    
    for (const sub of subscribers) {
      try {
        await sendProfessionalEmail(sub.email, 'weekly');
        logger.info(`Weekly email sent to ${sub.email}`);
      } catch (err) {
        logger.error(`Failed weekly email to ${sub.email}`, err);
      }
    }
  } catch (dbErr) {
    logger.error("Failed to fetch subscribers for newsletter", dbErr);
  }
});