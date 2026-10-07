import axios from "axios";
import db from "../db/database.js";
import { initializeTransaction, verifyTransaction } from "../services/paystack.service.js";
import { sendOrderReceipt } from "../services/email.service.js";

const money = (value) => Number(value || 0);

export const createOrder = async (req, res) => {
  const { email, phone, firstName = "", lastName = "", address = "", state = "", cart, amount, deliveryMethod = "ship", pickupInfo = null, deliveryFee = 0, lagosArea = null, discountAmount = 0 } = req.body ?? {};
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedPhone = String(phone || "").trim();
  const isPickup = deliveryMethod === "pickup";
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
  const validPhone = /^[+\d][\d\s().-]{6,}$/.test(normalizedPhone);
  if (!validEmail || !validPhone || !Array.isArray(cart) || cart.length === 0 || !Number.isFinite(money(amount)) || money(amount) <= 0 || (!isPickup && (!String(firstName).trim() || !String(lastName).trim() || !String(address).trim() || !String(state).trim()))) {
    return res.status(400).json({ error: "Invalid order data" });
  }
  const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const fullName = `${firstName} ${lastName}`.trim() || `Pickup customer (${normalizedPhone})`;
  try {
    await db.batch([
      { sql: `INSERT INTO orders (order_id, reference, email, phone, customer_name, address, state, total_amount, status, paystack_status, delivery_method, pickup_info, delivery_fee, lagos_area, discount_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 'pending', ?, ?, ?, ?, ?)`, args: [orderId, orderId, normalizedEmail, normalizedPhone, fullName, address, state || (isPickup ? "Lagos" : ""), money(amount), isPickup ? "pickup" : "ship", pickupInfo || (isPickup ? address : null), money(deliveryFee), lagosArea, money(discountAmount)] },
      ...cart.map((item) => ({ sql: `INSERT INTO order_items (order_id, product_id, product_name, qty, price, image) VALUES (?, ?, ?, ?, ?, ?)`, args: [orderId, item._id || item.id || null, String(item.name || ""), Math.max(1, Number(item.qty || 1)), money(item.price), item.image || null] })),
    ], "write");
    const payment = await initializeTransaction(normalizedEmail, money(amount), orderId);
    return res.status(201).json({ success: true, checkoutUrl: payment.authorization_url, reference: orderId, orderId });
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
  const paymentReference = String(verification.reference);
  const amountPaid = Number(verification.amount) / 100;
  await db.batch([
    { sql: `UPDATE orders SET status = 'PAID', paystack_status = 'success', payment_verified_at = CURRENT_TIMESTAMP, paid_at = ?, payment_reference = ?, paystack_transaction_id = ?, amount_paid = ?, payment_channel = ?, currency = ? WHERE order_id = ? AND status <> 'PAID'`, args: [paidAt, paymentReference, verification.id ? String(verification.id) : null, amountPaid, verification.channel || null, verification.currency || "NGN", order.order_id] },
    { sql: `INSERT OR IGNORE INTO payment_transactions (order_id, reference, paystack_transaction_id, amount, currency, status, channel, paid_at, raw_data) VALUES (?, ?, ?, ?, ?, 'success', ?, ?, ?)`, args: [order.order_id, paymentReference, verification.id ? String(verification.id) : null, amountPaid, verification.currency || "NGN", verification.channel || null, paidAt, JSON.stringify(verification)] },
  ], "write");
  const duplicate = order.status === "PAID" && order.paystack_status === "success";

  const itemsResult = await db.execute({ sql: "SELECT * FROM order_items WHERE order_id = ? ORDER BY id", args: [order.order_id] });
  if (!itemsResult.rows.length) throw new Error("Verified order has no items");
  const claim = await db.execute({ sql: "UPDATE orders SET receipt_sent_at = CURRENT_TIMESTAMP WHERE order_id = ? AND status = 'PAID' AND paystack_status = 'success' AND receipt_sent_at IS NULL", args: [order.order_id] });
  if (claim.rowsAffected > 0) {
    try {
      await sendOrderReceipt({ ...order, paid_at: paidAt }, itemsResult.rows);
    } catch (error) {
      await db.execute({ sql: "UPDATE orders SET receipt_sent_at = NULL WHERE order_id = ? AND receipt_sent_at IS NOT NULL", args: [order.order_id] }).catch(() => {});
      console.error("Receipt delivery failed after payment was persisted:", error.message);
    }
  }
  return { verified: true, duplicate, order: { ...order, status: "PAID", paystack_status: "success", payment_reference: paymentReference, amount_paid: amountPaid } };
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
