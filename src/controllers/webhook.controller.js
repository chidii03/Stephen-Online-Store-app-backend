import crypto from "crypto";
import { processSuccessfulPayment } from "./order.controller.js";

export const paystackWebhook = async (req, res) => {
  const signature = req.headers["x-paystack-signature"];
  const raw = req.rawBody || Buffer.from(JSON.stringify(req.body));
  const expected = crypto.createHmac("sha512", process.env.PAYSTACK_SECRET_KEY).update(raw).digest("hex");
  if (!signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return res.status(400).send("Invalid Signature");
  if (req.body?.event !== "charge.success") return res.sendStatus(200);
  try {
    const result = await processSuccessfulPayment(req.body.data.reference, req.body.data);
    return result.verified ? res.sendStatus(200) : res.status(400).json(result);
  } catch (error) {
    console.error("Paystack webhook error:", error.message);
    return res.sendStatus(500);
  }
};
