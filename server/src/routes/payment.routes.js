import express from 'express';
import { startPayment } from '../controllers/payment.controller.js';
const router = express.Router();
router.post('/init', startPayment);
export default router;