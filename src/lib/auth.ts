// lib/auth.ts
import jwt from 'jsonwebtoken';

export function verifyToken(token: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!process.env.JWT_SECRET) {
      resolve(false);
      return;
    }

    jwt.verify(token, process.env.JWT_SECRET, (err) => {
      resolve(!err);
    });
  });
}