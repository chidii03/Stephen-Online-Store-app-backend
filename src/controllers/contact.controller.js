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

    // 1. Twilio WhatsApp - Initialize client
    const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    
    // 2. Transporter - Use same config as Newsletter for consistency
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: env.MAIL_USER,
        pass: env.MAIL_PASS,
      },
    });

    // 3. Define Tasks
    const whatsappPromise = client.messages.create({
      from: `whatsapp:${env.TWILIO_PHONE_NUMBER}`, 
      to: `whatsapp:+2348079379510`,
      body: `🚀 New Web Inquiry\n\nName: ${name}\nPhone: ${phone}\nEmail: ${email}\nMessage: ${message}`
    });

    const mailOptions = {
      from: `"Steve O'Bizz Store" <${env.MAIL_USER}>`,
      to: email, 
      subject: `We received your inquiry, ${name}!`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #4b70f5; padding: 20px; border-radius: 10px;">
          <h2 style="color: #4b70f5;">Hello ${name},</h2>
          <p>Thank you for reaching out to <strong>Steve O'Bizz Store</strong>. We have received your message and our team will get back to you shortly.</p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Your Message Summary:</strong></p>
            <p style="font-style: italic; color: #4b5563;">"${message}"</p>
          </div>
          <p>Immediate assistance: +234 803 304 8352</p>
          <footer style="font-size: 12px; color: #9ca3af; border-top: 1px solid #eee; margin-top: 20px; padding-top: 10px;">
            Steve O'Bizz Store - No 69 Obafemi Awolowo Way, Ikeja Lagos.
          </footer>
        </div>
      `,
    };

    // Execute both (WhatsApp and Email)
    await Promise.all([whatsappPromise, transporter.sendMail(mailOptions)]);

    logger.info(`Contact form processed for: ${email}`);
    return res.status(200).json({ message: "Success" });

  } catch (error) {
    logger.error("Contact Form Backend Error:", error);
    return res.status(500).json({ error: "Failed to process request. Please try again." });
  }
};