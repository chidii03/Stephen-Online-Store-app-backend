import db from '../db/database.js';
import { createOrder } from './order.controller.js';

export const startPayment = async (req, res) => {
  const { customer, cart, totalAmount } = req.body;
  
  if (!customer || !cart || cart.length === 0) {
    return res.status(400).json({ error: "Invalid Order Data" });
  }

  req.body = {
    email: customer.email, phone: customer.phone, firstName: customer.name,
    lastName: "", address: customer.address, state: customer.state,
    cart, amount: totalAmount,
  };
  return createOrder(req, res);
};
