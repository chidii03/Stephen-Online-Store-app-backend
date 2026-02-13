import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import paymentRoutes from './routes/payment.routes.js';
import contactRoutes from './routes/contact.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import adminRoutes from './routes/admin.routes.js';
import orderRoutes from './routes/order.routes.js';
import newsletterRoutes from './routes/newsletter.routes.js';

const app = express();

// Security & CORS – single configuration
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'https://steveobizzstore.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// Routes
app.use('/api/payment', paymentRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/newsletter', newsletterRoutes);

app.get('/', (req, res) => {
  res.send('🚀 Stephen Online Store API is running smoothly!');
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', time: new Date().toISOString() });
});

export default app;