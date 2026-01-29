import db from '../db/database.js';
import twilio from 'twilio';
import axios from 'axios';
import nodemailer from 'nodemailer';

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// --- 1. EMAIL CONFIGURATION ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS 
    }
});

// --- 2. INITIALIZE ORDER ---
export const createOrder = async (req, res) => {
    const { email, phone, firstName, lastName, address, state, cart, amount } = req.body;    
    const orderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    const fullName = `${firstName} ${lastName}`;

    try {
        console.log(`Initializing Paystack for ${orderId} with amount: ₦${amount}`);

        const paystackRes = await axios.post(
            'https://api.paystack.co/transaction/initialize',
            {
                email: email,
                amount: Math.round(amount * 100), // Kobo conversion
                reference: orderId,
                callback_url: `http://localhost:3000/order-success?id=${orderId}`,
                metadata: { fullName, phone }
            },
            {
                headers: {
                    // CHANGED: Must use SECRET_KEY for backend calls
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // 2. Save to DB
        const insertOrder = db.prepare(`
            INSERT INTO orders (order_id, email, phone, customer_name, address, state, total_amount, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
        `);
        insertOrder.run(orderId, email, phone, fullName, address, state, amount);

        const insertItem = db.prepare(`INSERT INTO order_items (order_id, product_name, qty, price) VALUES (?, ?, ?, ?)`);
        const transaction = db.transaction((items) => {
            for (const item of items) { insertItem.run(orderId, item.name, item.qty, item.price); }
        });
        transaction(cart);

        res.status(201).json({ success: true, checkoutUrl: paystackRes.data.data.authorization_url });

    } catch (error) {
        // Detailed logging to see why Paystack fails
        console.error("Paystack Error Detail:", error.response?.data || error.message);
        res.status(500).json({ 
            error: "Failed to initialize order", 
            details: error.response?.data?.message || error.message 
        });
    }
};

// --- 3. PAYSTACK WEBHOOK & NEW EMAIL TEXT ---
export const handleWebhook = async (req, res) => {
    const event = req.body;

    if (event.event === 'charge.success') {
        const reference = event.data.reference;
        const paidAt = new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' });
        
        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + 3);
        const deliveryString = deliveryDate.toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        try {
            db.prepare("UPDATE orders SET status = 'PAID' WHERE order_id = ?").run(reference);

            const order = db.prepare("SELECT * FROM orders WHERE order_id = ?").get(reference);
            const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(reference);

            if (!order) return res.sendStatus(404);

            const itemsHtml = items.map(item => `
                <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #edf2f7;">
                        <p style="margin: 0; font-weight: bold; color: #2d3748;">${item.product_name}</p>
                        <p style="margin: 0; font-size: 12px; color: #718096;">Qty: ${item.qty}</p>
                    </td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #edf2f7; text-align: right; color: #2d3748;">
                        ₦${item.price.toLocaleString()}
                    </td>
                </tr>
            `).join('');

            const mailOptions = {
                from: `"Steve O Bizz Store" <${process.env.EMAIL_USER}>`,
                to: order.email,
                subject: `Order Confirmed: #${reference}`,
                html: `
                    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f9; padding: 20px;">
                        <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                            <div style="background: #2563eb; padding: 30px; text-align: center; color: white;">
                                <h1 style="margin: 0; font-size: 24px;">Order Confirmed!</h1>
                                <p style="margin-top: 10px; opacity: 0.9;">Thank you for shopping with Steve O Bizz.</p>
                            </div>
                            
                            <div style="padding: 30px;">
                                <p style="font-size: 16px; color: #4a5568;">Hi <strong>${order.customer_name}</strong>,</p>
                                <p style="color: #4a5568; line-height: 1.6;">Your payment was successful and we are now processing your order. Below is your official receipt.</p>
                                
                                <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 20px; margin: 25px 0;">
                                    <p style="margin: 0; font-size: 14px; color: #64748b;">Order Number</p>
                                    <p style="margin: 0; font-size: 18px; font-weight: bold; color: #1e293b;">#${reference}</p>
                                    <p style="margin: 15px 0 0 0; font-size: 14px; color: #64748b;">Estimated Delivery</p>
                                    <p style="margin: 0; font-size: 16px; font-weight: bold; color: #16a34a;">${deliveryString}</p>
                                </div>

                                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                                    <thead>
                                        <tr>
                                            <th style="text-align: left; font-size: 12px; text-transform: uppercase; color: #94a3b8; padding-bottom: 10px;">Item</th>
                                            <th style="text-align: right; font-size: 12px; text-transform: uppercase; color: #94a3b8; padding-bottom: 10px;">Price</th>
                                        </tr>
                                    </thead>
                                    <tbody>${itemsHtml}</tbody>
                                </table>

                                <div style="text-align: right; border-top: 2px solid #edf2f7; padding-top: 20px;">
                                    <p style="margin: 0; color: #64748b;">Total Amount Paid</p>
                                    <h2 style="margin: 0; color: #2563eb; font-size: 28px;">₦${order.total_amount.toLocaleString()}</h2>
                                </div>

                                <div style="margin-top: 40px; padding: 20px; border: 1px dashed #cbd5e1; border-radius: 8px;">
                                    <h4 style="margin: 0 0 10px 0; color: #475569;">Delivery Details</h4>
                                    <p style="margin: 0; font-size: 14px; color: #64748b;">${order.address}, ${order.state}</p>
                                    <p style="margin: 5px 0 0 0; font-size: 14px; color: #64748b;">Phone: ${order.phone}</p>
                                </div>

                                <div style="text-align: center; margin-top: 40px;">
                                    <a href="https://wa.me/${process.env.ADMIN_PHONE}" style="background: #25d366; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold;">Chat with Us on WhatsApp</a>
                                </div>
                            </div>
                            
                            <div style="background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
                                <p>&copy; ${new Date().getFullYear()} Steve O Bizz Store. All rights reserved.</p>
                            </div>
                        </div>
                    </div>
                `
            };

            await transporter.sendMail(mailOptions);
            console.log(`Receipt sent to ${order.email}`);

        } catch (err) {
            console.error("Webhook Logic Error:", err.message);
        }
    }
    res.sendStatus(200);
};

// --- 4. TRACK ORDER ---
export const trackOrder = (req, res) => {
    const { trackingId } = req.params;
    try {
        const order = db.prepare("SELECT * FROM orders WHERE order_id = ?").get(trackingId);
        if (!order) return res.status(404).json({ error: "Order not found" });
        const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(trackingId);
        res.json({ ...order, items });
    } catch (error) {
        res.status(500).json({ error: "Tracking failed" });
    }
};