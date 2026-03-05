import { NotificationService } from '../src/services/notification.service';
import { createBot } from '../src/bot';

export default async function handler(req: any, res: any) {
    try {
        // We need to initialize the bot to get access to Telegram API for NotificationService
        const bot = createBot();
        NotificationService.init(bot);

        await NotificationService.sendDailySummary();
        res.status(200).json({ success: true, message: 'Daily summary sent' });
    } catch (error: any) {
        console.error('Cron daily error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}
