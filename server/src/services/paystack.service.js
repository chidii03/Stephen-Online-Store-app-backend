import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const PAYSTACK_URL = 'https://api.paystack.co';

export const initializeTransaction = async (email, amount, reference) => {
  try {
    const response = await axios.post(
      `${PAYSTACK_URL}/transaction/initialize`,
      {
        email,
        amount: amount * 100, // Convert to Kobo
        reference,
        callback_url: `${process.env.FRONTEND_URL}/order-success` 
      },
      {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
      }
    );
    return response.data.data;
  } catch (error) {
    console.error("Paystack Init Error:", error.response?.data || error.message);
    throw new Error("Payment initialization failed");
  }
};