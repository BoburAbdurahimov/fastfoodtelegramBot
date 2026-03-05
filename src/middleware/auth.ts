import prisma from '../config/prisma';
import { BotContext } from '../types/context';
import { env } from '../config/env';

export const Role = {
    EMPLOYER: 'EMPLOYER',
    EMPLOYEE: 'EMPLOYEE',
    WAITER: 'WAITER',
    CHEF: 'CHEF',
} as const;
export type Role = typeof Role[keyof typeof Role];

export async function authMiddleware(ctx: BotContext, next: () => Promise<void>): Promise<void> {
    if (!ctx.from) {
        return;
    }

    const telegramId = BigInt(ctx.from.id);

    let user = await prisma.user.findUnique({
        where: { telegramId },
    });

    // Auto-register employer on first use
    if (!user && ctx.from.id.toString() === env.EMPLOYER_TELEGRAM_ID) {
        user = await prisma.user.create({
            data: {
                telegramId,
                username: ctx.from.username || null,
                name: ctx.from.first_name || 'Owner',
                role: Role.EMPLOYER,
            },
        });
    }

    // Auto-register staff by matching their telegram username
    if (!user && ctx.from.username) {
        const preRegistered = await prisma.user.findFirst({
            where: {
                username: ctx.from.username,
                telegramId: { lte: BigInt(0) },
                isActive: true,
                deletedAt: null,
            },
        });
        if (preRegistered) {
            user = await prisma.user.update({
                where: { id: preRegistered.id },
                data: {
                    telegramId,
                    name: ctx.from.first_name || preRegistered.name,
                },
            });
        }
    }

    if (!user || !user.isActive || user.deletedAt) {
        if (ctx.callbackQuery) {
            await ctx.answerCbQuery('⛔ Ruxsat yo\'q. Egasi bilan bog\'laning.');
        } else {
            await ctx.reply('⛔ Ruxsat yo\'q. Siz ro\'yxatga olinmagansiz. Egasi bilan bog\'laning.');
        }
        return;
    }

    ctx.dbUser = {
        id: user.id,
        telegramId: user.telegramId,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
    };

    return next();
}

export function requireRole(...roles: string[]) {
    return async (ctx: BotContext, next: () => Promise<void>): Promise<void> => {
        if (!ctx.dbUser) {
            if (ctx.callbackQuery) {
                await ctx.answerCbQuery('⛔ Not authenticated.');
            } else {
                await ctx.reply('⛔ Not authenticated.');
            }
            return;
        }

        if (!roles.includes(ctx.dbUser.role)) {
            if (ctx.callbackQuery) {
                await ctx.answerCbQuery('⛔ You do not have permission for this action.');
            } else {
                await ctx.reply('⛔ You do not have permission for this action.');
            }
            return;
        }

        return next();
    };
}
