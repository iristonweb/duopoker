import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export interface AccessTokenPayload {
  userId: string;
  email: string;
}

export const signAccessToken = (payload: AccessTokenPayload): string =>
  jwt.sign(payload, config.jwtSecret, { expiresIn: '15m' });

export const signRefreshToken = (payload: AccessTokenPayload): string =>
  jwt.sign(payload, config.jwtRefreshSecret, { expiresIn: '30d' });

export const verifyAccessToken = (token: string): AccessTokenPayload =>
  jwt.verify(token, config.jwtSecret) as AccessTokenPayload;

export const verifyRefreshToken = (token: string): AccessTokenPayload =>
  jwt.verify(token, config.jwtRefreshSecret) as AccessTokenPayload;
