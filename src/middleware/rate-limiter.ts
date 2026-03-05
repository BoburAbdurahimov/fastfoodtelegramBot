import { BotContext } from '../types/context';

const userRequests = new Map<number, { count: number; resetAt: number }>();
const MAX_REQUESTS = 30;
const WINDOW_MS = 60_000; // 1 minute

export function rateLimiterMiddleware() {
    return async (ctx: BotContext, next: () => Promise<void>): Promise<void> => {
        if (!ctx.from) return next();

        const userId = ctx.from.id;
        const now = Date.now();
        const userData = userRequests.get(userId);

        if (!userData || now > userData.resetAt) {
            userRequests.set(userId, { count: 1, resetAt: now + WINDOW_MS });
            return next();
        }

        userData.count++;

        if (userData.count > MAX_REQUESTS) {
            if (ctx.callbackQuery) {
                await ctx.answerCbQuery('⏳ Too many requests. Please slow down.');
            } else {
                await ctx.reply('⏳ Too many requests. Please wait a moment and try again.');
            }
            return;
        }

        return next();
    };
}
