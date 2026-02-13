import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendOrderReceipt = async (order, items) => {
  const itemsHtml = items.map(i => `<li>${i.qty}x ${i.product_name} - ₦${i.price}</li>`).join('');
  
  const mailOptions = {
    from: '"Steve O Bizz Store" <noreply@steveobizz.com>',
    to: order.customer_email,
    subject: `Order Confirmed: ${order.order_id}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd;">
        <h2 style="color: #000;">Thank you for your order!</h2>
        <p>Hello ${order.customer_name},</p>
        <p>We have received your payment. Your Tracking ID is: <strong>${order.order_id}</strong></p>
        
        <h3>Order Details:</h3>
        <ul>${itemsHtml}</ul>
        
        <p><strong>Total: ₦${order.amount.toLocaleString()}</strong></p>
        <p>Address: ${order.address}, ${order.state}</p>
        
        <br/>
        <a href="${process.env.FRONTEND_URL}/track" style="background: black; color: white; padding: 10px 20px; text-decoration: none;">Track Order</a>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Receipt sent to ${order.customer_email}`);
  } catch (error) {
    console.error("Email Error:", error);
  }
};