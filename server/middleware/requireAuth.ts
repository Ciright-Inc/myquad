import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../authTokens.js';
import { prisma } from '../db.js';

export type AuthedRequest = Request & {
  userId?: string;
  userEmail?: string;
  user?: Awaited<ReturnType<typeof prisma.user.findUnique>>;
};

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    req.userId = user.id;
    req.userEmail = user.email;
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
