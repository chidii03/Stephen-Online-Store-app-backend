import crypto from 'crypto';
import db from '../db/database.js';
import { sendOrderReceipt } from '../services/email.service.js';

export const paystackWebhook = async (req, res) => {
  // 1. Verify Signature
  const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(400).send('Invalid Signature');
  }

  // 2. Process Event
  const event = req.body;
  if (event.event === 'charge.success') {
    const reference = event.data.reference;
    
    try {
        // Update Order to PAID
        const updateResult = await db.execute({
            sql: "UPDATE orders SET status = 'PAID' WHERE reference = ? OR order_id = ?",
            args: [reference, reference]
        });

        if (updateResult.rowsAffected > 0) {
          // Fetch details to send email
          const orderRes = await db.execute({
              sql: "SELECT * FROM orders WHERE reference = ? OR order_id = ?",
              args: [reference, reference]
          });
          const order = orderRes.rows[0];

          const itemsRes = await db.execute({
              sql: "SELECT * FROM order_items WHERE order_id = ?",
              args: [order.order_id]
          });
          
          await sendOrderReceipt(order, itemsRes.rows);
          console.log(`💰 Payment Confirmed: ${reference}`);
        }
    } catch (dbError) {
        console.error("Webhook DB Error:", dbError.message);
    }
  }

  res.sendStatus(200);
};