import express from 'express';
import { createOrder, trackOrder, verifyOrderPayment } from '../controllers/order.controller.js';
import { paystackWebhook } from '../controllers/webhook.controller.js';

const router = express.Router();

// POST: https://steveobizzstore.onrender.com/api/orders/create
router.post('/create', createOrder);

// POST: https://steveobizzstore.onrender.com/api/orders/webhook (Point Paystack)
router.post('/webhook', paystackWebhook);
router.get('/verify/:reference', verifyOrderPayment);

// GET: https://steveobizzstore.onrender.com/api/orders/track/:trackingId
router.get('/track/:trackingId', trackOrder);

export default router;
