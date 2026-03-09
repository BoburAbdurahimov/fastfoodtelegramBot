import { env } from './config/env';
import { createBot } from './bot';

async function main() {
    const bot = createBot();

    // Local long-polling logic for development ONLY!
    // Production will use Vercel Serverless Webhooks via /api/webhook.ts
    const shutdown = (signal: string) => {
        console.log(`\n${signal} received. Shutting down gracefully...`);
        bot.stop(signal);
        process.exit(0);
    };

    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));

    console.log('🚀 Starting Fast Food Bot (Local Polling/Railway)...');
    console.log(`📌 Environment: ${env.NODE_ENV}`);

    // Schedule crons
    const cron = require('node-cron');
    const { NotificationService } = require('./services/notification.service');
    // Daily summary at 23:00
    cron.schedule('0 23 * * *', async () => {
        try { await NotificationService.sendDailySummary(); }
        catch (e) { console.error('Daily cron error:', e); }
    });
    // Low stock check at 8:00
    cron.schedule('0 8 * * *', async () => {
        try { await NotificationService.sendLowStockAlert(); }
        catch (e) { console.error('Stock cron error:', e); }
    });

    await bot.launch();
    console.log('✅ Bot is running locally!');
}

main().catch((err) => {
    console.error('❌ Failed to start bot:', err);
    process.exit(1);
});
