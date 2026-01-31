import express from 'express';
// FIXED: Import the correct function name
import { handleContactForm } from '../controllers/contact.controller.js'; 

const router = express.Router();

// This creates: POST /api/contact
router.post('/', handleContactForm); 

export default router;