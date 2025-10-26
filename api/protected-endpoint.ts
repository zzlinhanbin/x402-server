import express, { Request, Response } from 'express';
import axios from 'axios';
import { base64 } from 'rfc4648';
import serverless from 'serverless-http';
import 'dotenv/config';

const app = express();
app.use(express.json());

// 驟咲ｽｮ
const RECEIVER_ADDRESS = process.env.RECEIVER_ADDRESS || '0xYourReceiverAddress';
const PAYMENT_AMOUNT = '1000000000'; // 1 USDC (6 菴榊ｰ乗焚�詣ei)
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const FACILITATOR_URL = process.env.FACILITATOR_URL || 'https://x402.org/facilitator';

// 謾ｯ莉倩ｦ∵ｱらｻ捺桷
interface PaymentRequirements {
  x402Version: number;
  scheme: string;
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra: { name: string; version: string };
}

// 謾ｯ莉倅ｸｭ髣ｴ莉?
const paymentMiddleware = async (req: Request, res: Response, next: Function) => {
  const paymentHeader = req.get('X-PAYMENT');

  if (!paymentHeader) {
    const paymentReq: PaymentRequirements = {
      x402Version: 1,
      scheme: 'exact',
      network: 'eip155:1',
      maxAmountRequired: PAYMENT_AMOUNT,
      resource: `https://${req.headers.host}${req.originalUrl}`,
      description: 'Access to protected resource',
      mimeType: 'application/json',
      payTo: RECEIVER_ADDRESS,
      maxTimeoutSeconds: 30,
      asset: USDC_ADDRESS,
      extra: { name: 'USDC', version: '2' },
    };
    return res.status(402).json({
      x402Version: 1,
      accepts: [paymentReq],
      error: 'Payment required',
    });
  }

  try {
    const verifyResponse = await axios.post(`${FACILITATOR_URL}/verify`, {
      x402Version: 1,
      paymentHeader,
      paymentRequirements: {
        scheme: 'exact',
        network: 'eip155:1',
        maxAmountRequired: PAYMENT_AMOUNT,
        asset: USDC_ADDRESS,
        payTo: RECEIVER_ADDRESS,
      },
    });

    if (!verifyResponse.data.isValid) {
      return res.status(402).json({ error: verifyResponse.data.invalidReason || 'Invalid payment' });
    }

    next();
  } catch (error: any) {
    return res.status(402).json({ error: 'Payment verification failed' });
  }
};

// API 霍ｯ逕ｱ
app.get('/api/protected-endpoint', paymentMiddleware, (req: Request, res: Response) => {
  res.json({ message: 'Payment successful! Here is your resource.' });
});

// 蟇ｼ蜃ｺ荳?Serverless 蜃ｽ謨ｰ
export default serverless(app);
