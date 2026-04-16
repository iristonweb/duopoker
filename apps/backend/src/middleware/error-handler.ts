import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors.js';

export const errorHandler = (error: unknown, _req: Request, res: Response, next: NextFunction) => {
  void next;
  if (error instanceof ZodError) {
    return res.status(400).json({ error: error.flatten() });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ error: error.message });
  }

  return res.status(500).json({ error: 'Internal server error' });
};
