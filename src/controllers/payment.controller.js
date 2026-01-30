import db from '../db/database.js';
import { initializeTransaction } from '../services/paystack.service.js';
import { generateTrackingId } from '../utils/generateId.js';

export const startPayment = async (req, res) => {
  const { customer, cart, totalAmount } = req.body;
  
  if (!customer || !cart || cart.length === 0) {
    return res.status(400).json({ error: "Invalid Order Data" });
  }

  const orderId = generateTrackingId();
  const reference = `REF-${orderId}`; // Paystack unique ref

  try {
    // Save order and items in a batch for Turso compatibility
    await db.batch([
        {
            sql: `INSERT INTO orders (order_id, reference, customer_name, customer_email, customer_phone, address, state, amount, status)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [orderId, reference, customer.name, customer.email, customer.phone, customer.address, customer.state, totalAmount, 'PENDING']
        },
        ...cart.map(item => ({
            sql: `INSERT INTO order_items (order_id, product_name, qty, price, image) VALUES (?, ?, ?, ?, ?)`,
            args: [orderId, item.name, item.qty, item.price, item.image]
        }))
    ], "write");

    // 3. Initialize Paystack
    const paystackResponse = await initializeTransaction(customer.email, totalAmount, reference);

    // 4. Send URL back to Frontend
    res.status(200).json({ 
      authorization_url: paystackResponse.authorization_url,
      reference: reference 
    });

  } catch (error) {
    console.error("Payment Start Error:", error);
    res.status(500).json({ error: "Server Error initiating payment" });
  }
};