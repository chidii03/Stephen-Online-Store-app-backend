// routes/admin.routes.js
import express from 'express';
import {
  adminLogin,
  getAllOrders,
  updateOrderStatus,
  debugOrders,
} from '../controllers/admin.controller.js';

const router = express.Router();

// ── Public ─────────────────────────────────────────────────────────────────────
// This was MISSING — frontend calls /api/admin/login but it didn't exist
router.post('/login',         adminLogin);

// Debug — open in browser to confirm DB has data (remove after fixing)
router.get('/debug',          debugOrders);

// ── Orders ────────────────────────────────────────────────────────────────────
router.get('/orders',         getAllOrders);
router.post('/update-status', updateOrderStatus);

export default router;