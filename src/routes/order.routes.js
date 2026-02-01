import express from 'express';
import { createOrder, handleWebhook, trackOrder } from '../controllers/order.controller.js';

const router = express.Router();

// POST: https://steveobizzstore.onrender.com/api/orders/create
router.post('/create', createOrder);

// POST: https://steveobizzstore.onrender.com/api/orders/webhook (Point Paystack here via Ngrok)
router.post('/webhook', handleWebhook);

// GET: https://steveobizzstore.onrender.com/api/orders/track/:trackingId
router.get('/track/:trackingId', trackOrder);

export default router;