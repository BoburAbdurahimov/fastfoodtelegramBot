import { env } from './config/env';

async function main() {
    console.log('🚀 Fast Food Bot is now running on Vercel Serverless Webhooks!');
    console.log('You can safely delete this project from Railway.');
    
    // Prevent the script from exiting immediately so Railway doesn't think it crashed
    // (until the user manually deletes the Railway project)
    setInterval(() => {}, 1000 * 60 * 60); 
}

main().catch((err) => {
    console.error('❌ Failed to start bot:', err);
    process.exit(1);
});
