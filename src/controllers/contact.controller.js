import nodemailer from "nodemailer";
import twilio from "twilio";
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const handleContactForm = async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // --- WhatsApp notification (optional) – never fail the whole request ---
    let whatsappResult = null;
    if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_WHATSAPP_NUMBER && env.ADMIN_PHONE) {
      try {
        const twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
        const fromNumber = env.TWILIO_WHATSAPP_NUMBER.startsWith('whatsapp:')
          ? env.TWILIO_WHATSAPP_NUMBER
          : `whatsapp:${env.TWILIO_WHATSAPP_NUMBER}`;

        whatsappResult = await twilioClient.messages.create({
          from: fromNumber,
          to: `whatsapp:${env.ADMIN_PHONE.replace(/^whatsapp:/, '')}`, // ensure no double prefix
          body: `🚀 New Web Inquiry\n\nName: ${name}\nPhone: ${phone}\nEmail: ${email}\nMessage: ${message}`
        });
        logger.info(`WhatsApp sent to admin for ${email}`);
      } catch (twilioError) {
        // Log but continue – don't break the request
        logger.warn(`WhatsApp failed for ${email}: ${twilioError.message}`);
      }
    } else {
      logger.info("Twilio credentials missing – WhatsApp notification skipped");
    }

    // --- Email confirmation to customer – with retry and timeout ---
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,                // Use 587 with STARTTLS (more reliable on Render)
      secure: false,             // false for 587
      auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
        ciphers: 'SSLv3'
      },
      connectionTimeout: 10000,  // 10 seconds
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    const mailOptions = {
      from: `"Steve O'Bizz Store" <${env.EMAIL_USER}>`,
      to: email,
      subject: `We received your inquiry, ${name}!`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #1e3a8a; padding: 20px; border-radius: 10px;">
          <h2 style="color: #1e3a8a;">Hello ${name},</h2>
          <p>Thank you for reaching out to <strong>Steve O'Bizz Store</strong>. We have received your message.</p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Your Message:</strong></p>
            <p style="font-style: italic; color: #4b5563;">"${message}"</p>
          </div>
          <p>Immediate assistance: +234 803 304 8352</p>
        </div>`
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Contact email sent to ${email}`);

    return res.status(200).json({ 
      message: "Success",
      whatsapp: whatsappResult ? "sent" : "skipped" 
    });

  } catch (error) {
    logger.error("Contact Form Backend Error:", error);
    return res.status(500).json({ error: "Service temporarily unavailable. Please try again." });
  }
};