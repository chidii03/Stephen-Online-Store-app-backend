import express from 'express';
import { createOrder, handleWebhook, trackOrder } from '../controllers/order.controller.js';

const router = express.Router();

// POST: http://localhost:5000/api/orders/create
router.post('/create', createOrder);

// POST: http://localhost:5000/api/orders/webhook (Point Paystack here via Ngrok)
router.post('/webhook', handleWebhook);

// GET: http://localhost:5000/api/orders/track/:trackingId
router.get('/track/:trackingId', trackOrder);

export default router;