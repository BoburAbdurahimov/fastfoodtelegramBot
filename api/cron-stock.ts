import { NotificationService } from '../src/services/notification.service';
import { createBot } from '../src/bot';

export default async function handler(req: any, res: any) {
    try {
        const bot = createBot();
        NotificationService.init(bot);

        await NotificationService.sendLowStockAlert();
        res.status(200).json({ success: true, message: 'Stock alert checked' });
    } catch (error: any) {
        console.error('Cron stock check error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}
