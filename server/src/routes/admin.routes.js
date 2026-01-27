import express from 'express';
import { getAllOrders, updateOrderStatus } from '../controllers/admin.controller.js';
const router = express.Router();
router.get('/orders', getAllOrders);
router.post('/update-status', updateOrderStatus);
export default router;