// controllers/admin.controller.js
import db from '../db/database.js';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "steveadmin2024";

// ── POST /api/admin/login ─────────────────────────────────────────────────────
export const adminLogin = async (req, res) => {
  const { password } = req.body ?? {};
  if (!password) return res.status(400).json({ error: "Password required" });
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, error: "Invalid credentials" });
  }
  return res.json({ success: true });
};

// ── GET /api/admin/orders ─────────────────────────────────────────────────────
export const getAllOrders = async (req, res) => {
  try {
    const result = await db.execute("SELECT * FROM orders ORDER BY created_at DESC");
    console.log("[getAllOrders] rows:", result.rows?.length ?? 0);
    // Turso returns { rows: [...] } — always send a plain array
    return res.json(result.rows ?? []);
  } catch (e) {
    console.error("[getAllOrders] DB error:", e.message);
    return res.status(500).json({ error: "DB Error", detail: e.message });
  }
};

// ── POST /api/admin/update-status ─────────────────────────────────────────────
export const updateOrderStatus = async (req, res) => {
  const { orderId, status } = req.body ?? {};
  if (!orderId || !status) {
    return res.status(400).json({ error: "orderId and status are required" });
  }
  try {
    await db.execute({
      sql:  "UPDATE orders SET status = ? WHERE order_id = ?",
      args: [status, orderId],
    });
    return res.json({ success: true });
  } catch (e) {
    console.error("[updateOrderStatus] DB error:", e.message);
    return res.status(500).json({ error: "Update failed", detail: e.message });
  }
};

// ── GET /api/admin/debug ──────────────────────────────────────────────────────
// Open this URL in your browser to verify DB is working:
// https://steveobizzstore.onrender.com/api/admin/debug
export const debugOrders = async (req, res) => {
  try {
    const count  = await db.execute("SELECT COUNT(*) as total FROM orders");
    const sample = await db.execute(
      "SELECT order_id, customer_name, amount, status, created_at FROM orders LIMIT 5"
    );
    return res.json({
      total:  count.rows?.[0]?.total  ?? 0,
      sample: sample.rows ?? [],
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};