import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

// El access token dura poco (1 hora); el refresh token dura 7 días
export const generateAccessToken = (payload: TokenPayload): string =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

export const generateRefreshToken = (payload: TokenPayload): string =>
  jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });

export const verifyAccessToken = (token: string): TokenPayload =>
  jwt.verify(token, JWT_SECRET) as TokenPayload;

export const verifyRefreshToken = (token: string): TokenPayload =>
  jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
