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

    console.log('🚀 Starting Fast Food Bot (Local Polling)...');
    console.log(`📌 Environment: ${env.NODE_ENV}`);

    await bot.launch();
    console.log('✅ Bot is running locally!');
}

main().catch((err) => {
    console.error('❌ Failed to start bot:', err);
    process.exit(1);
});
