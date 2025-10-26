import express, { Request, Response } from 'express';
import axios from 'axios';
import { base64 } from 'rfc4648';
import serverless from 'serverless-http';
import 'dotenv/config';

const app = express();
app.use(express.json());

// 配置
const RECEIVER_ADDRESS = process.env.RECEIVER_ADDRESS || '0xYourReceiverAddress';
const PAYMENT_AMOUNT = '1000000000'; // 1 USDC (6 位小数，wei)
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const FACILITATOR_URL = process.env.FACILITATOR_URL || 'https://facilitator.example.com';

// 支付要求结构
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

// 支付中间�?
const paymentMiddleware = async (req: Request, res: Response, next: Function) => {
  // 检查请求头是否为空
  if (!req.headers || Object.keys(req.headers).length === 0) {
    return res.status(400).json({ error: 'Request headers cannot be empty' });
  }

  // 检查请求URL是否为空
  if (!req.url || req.url.trim() === '') {
    return res.status(400).json({ error: 'Request URL cannot be empty' });
  }

  const paymentHeader = req.get('X-PAYMENT');

  // 检查请求是否为空
  if (req.method === 'GET') {
    // 对于GET请求，检查查询参数是否为空
    if (!req.query || Object.keys(req.query).length === 0) {
      return res.status(400).json({ error: 'Request query parameters cannot be empty' });
    }
  } else if (req.method === 'POST') {
    // 对于POST请求，检查请求体是否为空
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: 'Request body cannot be empty' });
    }
  }

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

    // 检查响应数据是否为空
    if (!verifyResponse.data) {
      return res.status(500).json({ error: 'Payment verification service returned empty response' });
    }

    if (!verifyResponse.data.isValid) {
      return res.status(402).json({ error: verifyResponse.data.invalidReason || 'Invalid payment' });
    }

    next();
  } catch (error: any) {
    return res.status(402).json({ error: 'Payment verification failed' });
  }
};

// API 路由
app.get('/api/protected-endpoint', paymentMiddleware, (req: Request, res: Response) => {
  // 模拟获取受保护的内容
  const protectedContent = getProtectedContent();
  
  // 检查内容是否为空
  if (!protectedContent || protectedContent.trim() === '') {
    return res.status(404).json({ error: 'Protected content is empty or not found' });
  }
  
  res.json({ 
    message: 'Payment successful! Here is your resource.',
    content: protectedContent
  });
});

// 模拟获取受保护内容的函数
function getProtectedContent(): string {
  // 这里可以是从数据库、文件系统或其他服务获取的内容
  // 如果内容为空，返回空字符串
  const content = process.env.PROTECTED_CONTENT || 'This is the protected content that requires payment to access.';
  return content;
}

// 导出�?Serverless 函数
export default serverless(app);