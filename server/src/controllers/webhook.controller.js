import crypto from 'crypto';
import db from '../db/database.js';
import { sendOrderReceipt } from '../services/email.service.js';

export const paystackWebhook = (req, res) => {
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
    
    // Update Order to PAID
    const update = db.prepare("UPDATE orders SET status = 'PAID' WHERE reference = ?");
    const result = update.run(reference);

    if (result.changes > 0) {
      // Fetch details to send email
      const order = db.prepare("SELECT * FROM orders WHERE reference = ?").get(reference);
      const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(order.order_id);
      
      sendOrderReceipt(order, items);
      console.log(`💰 Payment Confirmed: ${reference}`);
    }
  }

  res.sendStatus(200);
};