import db from '../db/database.js';

export const getAllOrders = async (req, res) => {
  try {
    const result = await db.execute("SELECT * FROM orders ORDER BY created_at DESC");
    res.json(result.rows); // Turso returns data in .rows
  } catch (e) {
    res.status(500).json({ error: "DB Error" });
  }
};

export const updateOrderStatus = async (req, res) => {
  const { orderId, status } = req.body;
  try {
    await db.execute({
      sql: "UPDATE orders SET status = ? WHERE order_id = ?",
      args: [status, orderId]
    });
    res.json({ success: true, message: "Status Updated" });
  } catch (e) {
    res.status(500).json({ error: "Update failed" });
  }
};