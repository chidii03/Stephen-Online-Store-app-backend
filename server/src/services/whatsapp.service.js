import twilio from "twilio";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const client = twilio(env.TWILIO_SID, env.TWILIO_AUTH_TOKEN);

export const notifySeller = async (order) => {
  const message =
    `🔔 *NEW ORDER - STEVE OBIZZ Store* \n\n` +
    `*ID:* ${order.order_id}\n` +
    `*Amount:* ₦${order.amount.toLocaleString()}\n` +
    `*Customer:* ${order.customer_name}\n` +
    `*Phone:* ${order.customer_phone}\n\n` +
    `Check Admin Dashboard for details.`;

  try {
    await client.messages.create({
      from: `whatsapp:${env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${env.ADMIN_PHONE}`,
      body: message,
    });
    logger.success(`Real WhatsApp notification sent to Admin.`);
    return true;
  } catch (error) {
    logger.error("Failed to send real WhatsApp notification", error);
    return false;
  }
};
