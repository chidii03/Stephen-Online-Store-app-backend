import express from 'express';
import { subscribe } from '../controllers/newsletter.controller.js';

const router = express.Router();

// This creates: POST /api/newsletter/subscribe
router.post('/subscribe', subscribe);

export default router;