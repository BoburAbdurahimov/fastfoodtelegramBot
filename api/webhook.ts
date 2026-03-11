import { createBot } from '../src/bot';

let bot: any;
let startupError: any = null;

try {
    bot = createBot();
} catch (e: any) {
    startupError = e;
}

export default async function handler(req: any, res: any) {
    if (startupError) {
        console.error('--- STARTUP ERROR ---', startupError.message || startupError);
        return res.status(200).json({ error: startupError.message || String(startupError) });
    }

    if (req.method === 'GET') {
        return res.status(200).json({ status: 'ok' });
    }

    try {
        await bot.handleUpdate(req.body);
    } catch (err: any) {
        console.error('--- ERROR CAUGHT IN WEBHOOK ---', err);
    }

    // Always return 200 explicitly to satisfy Telegram and release the HTTP connection
    return res.status(200).send('OK');
}
