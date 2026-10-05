import axios from "axios";
import db from "../db/database.js";
import { initializeTransaction, verifyTransaction } from "../services/paystack.service.js";
import { sendOrderReceipt } from "../services/email.service.js";

const money = (value) => Number(value || 0);

export const createOrder = async (req, res) => {
  const { email, phone, firstName, lastName, address, state, cart, amount } = req.body ?? {};
  if (!email || !phone || !firstName || !lastName || !Array.isArray(cart) || cart.length === 0 || !Number.isFinite(money(amount)) || money(amount) <= 0) {
    return res.status(400).json({ error: "Invalid order data" });
  }
  const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const fullName = `${firstName} ${lastName}`.trim();
  try {
    await db.batch([
      { sql: `INSERT INTO orders (order_id, reference, email, phone, customer_name, address, state, total_amount, status, paystack_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 'pending')`, args: [orderId, orderId, email, phone, fullName, address || "", state || "", money(amount)] },
      ...cart.map((item) => ({ sql: `INSERT INTO order_items (order_id, product_name, qty, price, image) VALUES (?, ?, ?, ?, ?)`, args: [orderId, String(item.name || ""), Math.max(1, Number(item.qty || 1)), money(item.price), item.image || null] })),
    ], "write");
    const payment = await initializeTransaction(email, money(amount), orderId);
    return res.status(201).json({ success: true, checkoutUrl: payment.authorization_url, reference: orderId });
  } catch (error) {
    await db.execute({ sql: "UPDATE orders SET status = 'FAILED', paystack_status = 'failed' WHERE order_id = ? AND status = 'PENDING'", args: [orderId] }).catch(() => {});
    console.error("Order initialization error:", error.message);
    return res.status(500).json({ error: "Failed to initialize order" });
  }
};

export const processSuccessfulPayment = async (reference, paymentData = null) => {
  const verification = paymentData || await verifyTransaction(reference);
  if (verification.status !== "success" || verification.reference !== reference) return { verified: false, reason: "Payment is not successful" };
  const orderResult = await db.execute({ sql: "SELECT * FROM orders WHERE reference = ? OR order_id = ?", args: [reference, reference] });
  const order = orderResult.rows[0];
  if (!order) return { verified: false, reason: "Order not found" };
  if (Number(verification.amount) !== Math.round(Number(order.total_amount) * 100)) return { verified: false, reason: "Payment amount mismatch" };

  const paidAt = verification.paid_at || new Date().toISOString();
  const update = await db.execute({ sql: `UPDATE orders SET status = 'PAID', paystack_status = 'success', payment_verified_at = CURRENT_TIMESTAMP, paid_at = ? WHERE order_id = ? AND status <> 'PAID'`, args: [paidAt, order.order_id] });
  const duplicate = update.rowsAffected === 0;

  const itemsResult = await db.execute({ sql: "SELECT * FROM order_items WHERE order_id = ? ORDER BY id", args: [order.order_id] });
  if (!itemsResult.rows.length) throw new Error("Verified order has no items");
  const claim = await db.execute({ sql: "UPDATE orders SET receipt_sent_at = CURRENT_TIMESTAMP WHERE order_id = ? AND status = 'PAID' AND paystack_status = 'success' AND receipt_sent_at IS NULL", args: [order.order_id] });
  if (claim.rowsAffected > 0) {
    try {
      await sendOrderReceipt({ ...order, paid_at: paidAt }, itemsResult.rows);
    } catch (error) {
      await db.execute({ sql: "UPDATE orders SET receipt_sent_at = NULL WHERE order_id = ? AND receipt_sent_at IS NOT NULL", args: [order.order_id] }).catch(() => {});
      throw error;
    }
  }
  return { verified: true, duplicate, order: { ...order, status: "PAID", paystack_status: "success" } };
};

export const verifyOrderPayment = async (req, res) => {
  const reference = String(req.params.reference || "");
  if (!reference) return res.status(400).json({ error: "Reference required" });
  try {
    const result = await processSuccessfulPayment(reference);
    if (!result.verified) return res.status(400).json(result);
    return res.json({ success: true, status: "PAID", duplicate: Boolean(result.duplicate) });
  } catch (error) {
    console.error("Payment verification error:", error.message);
    return res.status(502).json({ error: "Payment could not be verified" });
  }
};

export const handleWebhook = async (req, res) => {
  if (req.body?.event !== "charge.success") return res.sendStatus(200);
  try {
    const result = await processSuccessfulPayment(req.body.data.reference, req.body.data);
    if (!result.verified) return res.status(400).json(result);
    return res.sendStatus(200);
  } catch (error) {
    console.error("Webhook processing error:", error.message);
    return res.sendStatus(500);
  }
};

export const trackOrder = async (req, res) => {
  try {
    const orderResult = await db.execute({ sql: "SELECT * FROM orders WHERE order_id = ?", args: [req.params.trackingId] });
    const order = orderResult.rows[0];
    if (!order) return res.status(404).json({ error: "Order not found" });
    const items = await db.execute({ sql: "SELECT * FROM order_items WHERE order_id = ? ORDER BY id", args: [order.order_id] });
    return res.json({ ...order, items: items.rows });
  } catch { return res.status(500).json({ error: "Tracking failed" }); }
};
