import db from '../db/database.js';
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import cron from 'node-cron';
import { logger } from '../utils/logger.js';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: env.MAIL_USER, pass: env.MAIL_PASS }
});

// 1. Subscription Logic
export const subscribe = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    await db.execute({
      sql: "INSERT INTO subscribers (email) VALUES (?)",
      args: [email]
    });
    
    await sendProfessionalEmail(email, 'welcome');
    res.json({ success: true, message: "Welcome email sent!" });
  } catch (error) {
    // Turso/LibSQL error check
    if (error.message?.includes('UNIQUE')) {
      return res.status(400).json({ error: "You are already subscribed!" });
    }
    res.status(500).json({ error: "Server error" });
  }
};
// 2. Professional Template Switcher
const sendProfessionalEmail = async (email, type) => {
  const templates = {
    welcome: {
      subject: "Welcome to the Steve O Bizz Store! 🎨",
      title: "The Journey Begins Here",
      body: "We are thrilled to have you. As a subscriber, you'll get first access to our premium stationery and tech drops.",
      image: "https://images.unsplash.com/photo-1677530410699-f692c94cf806?w=600"
    },
    weekly: {
      subject: "Weekly Inspiration from Steve O Bizz Team 💡",
      title: "This Week's Curated Picks",
      body: "Check out our new artisanal collection. High quality, limited stock, uniquely yours.",
      image: "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=600"
    }
  };

  const content = templates[type];

  const html = `
     <html>
          <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; color: #333; padding: 20px; margin: 0;">
            <div style="max-width: 600px; margin: auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
              <h2 style="text-align: center; color: #4b70f5;">Welcome to Steve-Obizz-Store!</h2>
              <p style="font-size: 16px; line-height: 1.6;">Dear New Customer,</p>
              <p style="font-size: 16px; line-height: 1.6;">
                We are genuinely delighted to welcome you to the Steve-Obizz-Store. Your subscription marks the beginning of an exciting journey, and we couldn't be more thrilled to have you join us.
              </p>
              <div style="margin-top: 20px; text-align: center;">
                <img src="https://images.unsplash.com/photo-1677530410699-f692c94cf806?w=600&amp;auto=format&amp;fit=crop&amp;q=60&amp;ixlib=rb-4.1.0&amp;ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8c3RhdGlvbmVyeSUyMHVpJTIwaW1hZ2VzJTIwcHJvZHVjdHN8ZW58MHx8MHx8fDA%3D">
              </div>
              <p style="font-size: 16px; line-height: 1.6;">
                As a valued member, you can look forward to receiving carefully curated content, exclusive offers, and first access to our latest product launches—directly in your inbox. Our goal is to enrich your experience, bringing you not only premium stationery but also creative inspiration that elevates your day-to-day.
                <div>
                  <img src="https://media.istockphoto.com/id/2167050759/photo/matching-colors-of-pen-scalpel-screwdriver-pencil-sharpener-and-3m-post-it-sticky-notes-a.jpg?s=612x612&w=0&k=20&c=z-FfG2r56YsiFLxDuWJYPgXbEWhYek7-qWUL5A6VLF8=">
                </div>
              </p>
              <p style="font-size: 16px; line-height: 1.6;">
                Your welcome email has been sent to ${email}.
              </p>
              <p style="font-size: 16px; line-height: 1.6;">
                With each communication, we aim to bring you closer to products that embody the highest standards of quality, craftsmanship, and innovation. Whether you are seeking practical solutions, elegant designs, or unique gifts, we’re committed to ensuring that your time with us is nothing short of exceptional.
              </p>
              <div style="margin-top: 20px; text-align: center;">
                <a href="https://www.steveobizzstore.com" style="display: inline-block; background-color: #4b70f5; color: white; padding: 12px 20px; border-radius: 5px; text-decoration: none; font-weight: bold;">Shop Now</a>
              </div>
              <footer style="margin-top: 30px; text-align: center; font-size: 14px; color: #666;">
                <p>Warm regards,<br>The Steve-Obizz-Store Team</p>
                <p>No 69 Obafemi Awolowo Way, Ikeja, Lagos, Nigeria</p>
                <p>+234 803 304 8352<br>${process.env.EMAIL_USER}</p>
              </footer>
            </div>
          </body>
        </html>
  `;

  return transporter.sendMail({
    from: `"Steve O Bizz Store" <${env.MAIL_USER}>`,
    to: email,
    subject: content.subject,
    html
  });
};

// 3. REAL Weekly Cron Job (Runs every Monday at 9:00 AM)
cron.schedule('0 9 * * 1', async () => {
  logger.info("Running Weekly Newsletter Cron...");
  
  try {
    // FIX: Use await db.execute instead of db.prepare().all()
    const result = await db.execute("SELECT email FROM subscribers");
    const subscribers = result.rows; // Turso returns rows here
    
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