import db from '../db/database.js';

export const getAllOrders = (req, res) => {
  try {
    // Get all orders ordered by newest
    const orders = db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
    res.json(orders);
  } catch (e) {
    res.status(500).json({ error: "DB Error" });
  }
};

export const updateOrderStatus = (req, res) => {
  const { orderId, status } = req.body;
  try {
    const update = db.prepare("UPDATE orders SET status = ? WHERE order_id = ?");
    update.run(status, orderId);
    res.json({ success: true, message: "Status Updated" });
  } catch (e) {
    res.status(500).json({ error: "Update failed" });
  }
};