import { Telegraf } from 'telegraf';
import { BotContext } from '../types/context';
import { WarehouseService } from './warehouse.service';
import { StatisticsService } from './statistics.service';
import { formatCurrency } from '../utils/format';
import { getToday } from '../utils/date-helpers';
import { env } from '../config/env';
import prisma from '../config/prisma';

export class NotificationService {
    private static bot: Telegraf<BotContext>;

    static init(bot: Telegraf<BotContext>) {
        this.bot = bot;
    }

    static async sendLowStockAlert() {
        const lowStockProducts = await WarehouseService.getLowStockProducts();
        if (lowStockProducts.length === 0) return;

        const message = [
            '⚠️ *KAM QOLGAN MAHSULOTLAR*\n',
            ...lowStockProducts.map(
                (p) => `• *${p.name}*: ${p.quantity} ${p.unit} (chegara: ${p.lowStockThreshold})`
            ),
        ].join('\n');

        try {
            await this.bot.telegram.sendMessage(env.EMPLOYER_TELEGRAM_ID, message, {
                parse_mode: 'Markdown',
            });
        } catch (err) {
            console.error('Low stock alert xatolik:', err);
        }
    }

    static async sendDailySummary() {
        const { from, to } = getToday();
        const stats = await StatisticsService.getDashboard(from, to);

        const message = [
            '📊 *KUNLIK HISOBOT*\n',
            `📅 ${from.toLocaleDateString('uz-UZ')}`,
            '',
            `💰 Daromad: ${formatCurrency(stats.totalRevenue)} UZS`,
            `📦 Buyurtmalar: ${stats.totalOrders} (✅ ${stats.completedOrders} | ❌ ${stats.cancelledOrders} | 🔄 ${stats.returnedOrders})`,
            `💵 Foyda: ${formatCurrency(stats.orderProfit)} UZS`,
            `💸 Xarajatlar: ${formatCurrency(stats.totalExpenses)} UZS`,
            `📈 Sof foyda: ${formatCurrency(stats.netProfit)} UZS`,
            `🍔 Tayyorlangan taomlar: ${stats.totalMeals}`,
            `👥 Noyob mijozlar: ${stats.uniqueClients}`,
            '',
            stats.mostSoldItem ? `🏆 Eng ko'p sotilgan: ${stats.mostSoldItem.name} (${stats.mostSoldItem.quantity} dona)` : '',
        ]
            .filter(Boolean)
            .join('\n');

        try {
            await this.bot.telegram.sendMessage(env.EMPLOYER_TELEGRAM_ID, message, {
                parse_mode: 'Markdown',
            });
        } catch (err) {
            console.error('Kunlik hisobot xatolik:', err);
        }
    }

    /**
     * Notify all chefs about a new order
     */
    static async notifyChefs(order: any) {
        const chefs = await prisma.user.findMany({
            where: { role: 'CHEF' as any, isActive: true, deletedAt: null, telegramId: { not: BigInt(0) } },
        });

        const itemLines = order.items.map(
            (i: any) => `  • ${i.menuItem.name} x${i.quantity}`
        );

        const message = [
            '🔔 *YANGI BUYURTMA!*\n',
            `🏗 Stol: *${order.tableNumber || 'Ko\'rsatilmagan'}*`,
            order.clientName ? `🧑 Mijoz: ${order.clientName}` : '',
            `🧑‍🍳 Ofitsiant: ${order.user.name}`,
            `\n🍔 *Taomlar:*`,
            ...itemLines,
            `\n📍 Buyurtma raqami: #${order.id}`,
        ].filter(Boolean).join('\n');

        for (const chef of chefs) {
            try {
                await this.bot.telegram.sendMessage(chef.telegramId.toString(), message, {
                    parse_mode: 'Markdown',
                });
            } catch (err) {
                console.error(`Oshpazga xabar yuborishda xato (${chef.name}):`, err);
            }
        }
    }

    /**
     * Notify the waiter that their order is READY
     */
    static async notifyWaiter(order: any) {
        const waiterTelegramId = order.user?.telegramId;
        if (!waiterTelegramId || waiterTelegramId === BigInt(0)) return;

        const itemLines = order.items.map(
            (i: any) => `  • ${i.menuItem.name} x${i.quantity}`
        );

        const message = [
            '✅ *BUYURTMA TAYYOR!*\n',
            `🏗 Stol: *${order.tableNumber || 'Ko\'rsatilmagan'}*`,
            order.clientName ? `🧑 Mijoz: ${order.clientName}` : '',
            `\n🍔 *Taomlar:*`,
            ...itemLines,
            `\n📍 Buyurtma #${order.id}`,
        ].filter(Boolean).join('\n');

        try {
            await this.bot.telegram.sendMessage(waiterTelegramId.toString(), message, {
                parse_mode: 'Markdown',
            });
        } catch (err) {
            console.error('Ofitsiantga xabar yuborishda xato:', err);
        }
    }
}
