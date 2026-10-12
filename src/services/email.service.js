import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: env.EMAIL_USER, pass: String(env.EMAIL_PASS).replace(/\s+/g, "") },
});

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const naira = (value) => `₦${Number(value || 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export const sendOrderReceipt = async (order, items) => {
  if (!order?.email) throw new Error("Cannot send receipt without a customer email");
  const rows = items.map((item) => `<tr><td>${escapeHtml(item.product_name)}</td><td>${escapeHtml(item.qty)}</td><td>${naira(item.price)}</td><td>${naira(Number(item.price || 0) * Number(item.qty || 0))}</td></tr>`).join("");
  const message = {
    from: `"Steve O Bizz Store" <${env.EMAIL_USER}>`,
    to: order.email,
    subject: `Order confirmed: ${order.order_id}`,
    text: `Thank you for your order, ${order.customer_name}. Your payment for order ${order.order_id} was verified successfully. Total paid: ${naira(order.total_amount)}.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto">
      <h2>Thank you for your order, ${escapeHtml(order.customer_name)}!</h2>
      <p>Your Paystack payment was verified successfully.</p>
      <p><strong>Customer email:</strong> ${escapeHtml(order.email)}<br><strong>Order:</strong> ${escapeHtml(order.order_id)}<br><strong>Payment reference:</strong> ${escapeHtml(order.reference || order.order_id)}<br><strong>Paid:</strong> ${escapeHtml(order.paid_at || "")}</p>
      <table style="width:100%;border-collapse:collapse" border="1" cellpadding="8"><thead><tr><th>Product</th><th>Qty</th><th>Unit price</th><th>Line total</th></tr></thead><tbody>${rows}</tbody></table>
      <p style="text-align:right;font-size:18px"><strong>Total paid: ${naira(order.total_amount)}</strong></p>
      <p><strong>Delivery:</strong> ${escapeHtml(order.address)}, ${escapeHtml(order.state)}<br><strong>Phone:</strong> ${escapeHtml(order.phone)}</p>
      <p><a href="${escapeHtml(env.FRONTEND_URL)}/track">Track your order</a></p>
    </div>`,
  };

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await transporter.sendMail(message);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await wait(attempt * 1000);
    }
  }

  throw lastError;
};
