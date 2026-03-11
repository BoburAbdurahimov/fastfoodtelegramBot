import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface DbUser {
    id: number;
    telegramId: bigint;
    name: string;
    role: string;
    isActive: boolean;
}

declare global {
    namespace Express {
        interface Request {
            dbUser?: DbUser;
        }
    }
}

/**
 * Validate Telegram WebApp initData and attach user to request.
 * In development mode, allows a fallback header for testing.
 */
export async function telegramAuthMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
        const initData = req.headers['x-telegram-init-data'] as string;

        if (!initData) {
            // Dev fallback: allow direct telegramId header
            const devTelegramId = req.headers['x-dev-telegram-id'] as string;
            if (process.env.NODE_ENV !== 'production' && devTelegramId) {
                const user = await prisma.user.findUnique({
                    where: { telegramId: BigInt(devTelegramId) },
                });
                if (user && user.isActive && !user.deletedAt) {
                    req.dbUser = {
                        id: user.id,
                        telegramId: user.telegramId,
                        name: user.name,
                        role: user.role,
                        isActive: user.isActive,
                    };
                    return next();
                }
            }
            return res.status(401).json({ error: 'Missing initData' });
        }

        // Parse initData
        const params = new URLSearchParams(initData);
        const hash = params.get('hash');
        if (!hash) {
            return res.status(401).json({ error: 'Missing hash in initData' });
        }

        // Validate HMAC
        params.delete('hash');
        const entries = Array.from(params.entries());
        entries.sort(([a], [b]) => a.localeCompare(b));
        const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

        const botToken = process.env.BOT_TOKEN!;
        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
        const checkHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

        if (checkHash !== hash) {
            return res.status(401).json({ error: 'Invalid initData signature' });
        }

        // Extract user
        const userJson = params.get('user');
        if (!userJson) {
            return res.status(401).json({ error: 'No user in initData' });
        }

        const telegramUser = JSON.parse(userJson);
        const telegramId = BigInt(telegramUser.id);

        const user = await prisma.user.findUnique({
            where: { telegramId },
        });

        if (!user || !user.isActive || user.deletedAt) {
            return res.status(403).json({ error: 'User not registered or inactive' });
        }

        req.dbUser = {
            id: user.id,
            telegramId: user.telegramId,
            name: user.name,
            role: user.role,
            isActive: user.isActive,
        };

        next();
    } catch (err) {
        console.error('Auth error:', err);
        res.status(500).json({ error: 'Auth failed' });
    }
}

/** Middleware to require specific roles */
export function requireRole(...roles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.dbUser) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        if (!roles.includes(req.dbUser.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
}
