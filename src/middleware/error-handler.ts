import { BotContext } from '../types/context';

export async function errorHandler(err: unknown, ctx: BotContext): Promise<void> {
    console.error('❌ Bot error:', err);

    const message = err instanceof Error ? err.message : 'Unknown error';

    try {
        if (ctx.callbackQuery) {
            await ctx.answerCbQuery(`❌ Error: ${message.substring(0, 200)}`);
        } else {
            await ctx.reply(`❌ An error occurred: ${message.substring(0, 200)}\n\nPlease try again.`);
        }
    } catch (e) {
        console.error('Failed to send error message to user:', e);
    }
}

export function errorHandlerMiddleware() {
    return async (ctx: BotContext, next: () => Promise<void>): Promise<void> => {
        try {
            await next();
        } catch (err) {
            await errorHandler(err, ctx);
        }
    };
}
