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

    // 1. Twilio - Logic fix for undefined variable
    const twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    
    // Ensure the number has the 'whatsapp:' prefix correctly
    const fromNumber = env. TWILIO_WHATSAPP_NUMBER.startsWith('whatsapp:') 
      ? env. TWILIO_WHATSAPP_NUMBER
      : `whatsapp:${env. TWILIO_WHATSAPP_NUMBER}`;

    const whatsappPromise = twilioClient.messages.create({
      from: fromNumber, 
      to: `whatsapp:+2348079379510`,
      body: `🚀 New Web Inquiry\n\nName: ${name}\nPhone: ${phone}\nEmail: ${email}\nMessage: ${message}`
    });

    // 2. Nodemailer - Port 465 is more stable on Render for Gmail
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // Use SSL
      auth: {
        user: env.MAIL_USER,
        pass: env.MAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false 
      }
    });

    const mailOptions = {
      from: `"Steve O'Bizz Store" <${env.MAIL_USER}>`,
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

    await Promise.all([whatsappPromise, transporter.sendMail(mailOptions)]);
    
    logger.info(`Contact form success: ${email}`);
    return res.status(200).json({ message: "Success" });

  } catch (error) {
    logger.error("Contact Form Backend Error:", error);
    return res.status(500).json({ error: "Service temporarily unavailable. Please try again." });
  }
};