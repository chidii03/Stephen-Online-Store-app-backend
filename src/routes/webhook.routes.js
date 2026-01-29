import express from 'express';
import { paystackWebhook } from '../controllers/webhook.controller.js';
const router = express.Router();
router.post('/', paystackWebhook);
export default router;