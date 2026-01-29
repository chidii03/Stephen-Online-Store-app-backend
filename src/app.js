import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import paymentRoutes from './routes/payment.routes.js';
import newsletterRoutes from './routes/newsletter.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import adminRoutes from './routes/admin.routes.js';
import orderRoutes from './routes/order.routes.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/payment', paymentRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/newsletter', newsletterRoutes);

app.get('/', (req, res) => {
  res.send('🚀 Stephen Online Store API is running smoothly!');
});

export default app;

