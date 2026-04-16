import type { NextFunction, Request, Response } from 'express';
import crypto from 'node:crypto';
import { incRequestCount } from '../services/metrics.js';

export const requestContext = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id']?.toString() ?? crypto.randomUUID();
  res.setHeader('x-request-id', requestId);
  incRequestCount();
  console.log(`[${requestId}] ${req.method} ${req.path}`);
  next();
};
