import { createBot } from '../src/bot';

export default async function handler(req: any, res: any) {
    try {
        const bot = createBot();

        // Only handle POST requests from Telegram
        if (req.method === 'POST') {
            await bot.handleUpdate(req.body, res);
            return;
        }

        // Ping check
        res.status(200).json({ status: 'ok', message: 'Bot webhook is active' });
    } catch (err) {
        console.error('Webhook error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
