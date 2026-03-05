import prisma from '../config/prisma';
import { BotContext } from '../types/context';

export function auditMiddleware() {
    return async (ctx: BotContext, next: () => Promise<void>): Promise<void> => {
        await next();
        // audit logging is done by individual services, this middleware is for tracking
    };
}

export class AuditService {
    static async log(
        userId: number,
        action: string,
        entity: string,
        entityId?: number,
        details?: Record<string, unknown>
    ): Promise<void> {
        try {
            await prisma.auditLog.create({
                data: {
                    userId,
                    action,
                    entity,
                    entityId,
                    details: details ? JSON.stringify(details) : undefined,
                },
            });
        } catch (err) {
            console.error('Failed to write audit log:', err);
        }
    }

    static async getRecentLogs(limit: number = 50, offset: number = 0) {
        return prisma.auditLog.findMany({
            include: { user: { select: { name: true, role: true } } },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });
    }
}
