import { Scenes, Markup } from 'telegraf';
import { BotContext } from '../../types/context';
import { StatisticsService } from '../../services/statistics.service';
import { statisticsMenuKeyboard } from '../../keyboards/statistics.keyboard';
import { formatCurrency } from '../../utils/format';
import { getToday, getThisWeek, getThisMonth, getThisYear, formatDate } from '../../utils/date-helpers';
import { exportToCsv } from '../../utils/csv-export';
import fs from 'fs';

export const statisticsScene = new Scenes.BaseScene<BotContext>('statistics');

statisticsScene.enter(async (ctx) => {
    await ctx.reply('📊 *STATISTIKA*\n\nDavrni tanlang:', {
        parse_mode: 'Markdown',
        ...statisticsMenuKeyboard,
    });
});

async function showStats(ctx: BotContext, from: Date, to: Date, label: string) {
    const stats = await StatisticsService.getDashboard(from, to);

    const msg = [
        `📊 *STATISTIKA — ${label}*`,
        `📅 ${formatDate(from)} — ${formatDate(to)}\n`,
        `💰 Daromad: ${formatCurrency(stats.totalRevenue)} UZS`,
        `💵 Buyurtma xarajati: ${formatCurrency(stats.totalCost)} UZS`,
        `📈 Buyurtma foydasi: ${formatCurrency(stats.orderProfit)} UZS`,
        `💸 Xarajatlar: ${formatCurrency(stats.totalExpenses)} UZS`,
        `📊 *Sof foyda: ${formatCurrency(stats.netProfit)} UZS*\n`,
        `📋 Buyurtmalar: ${stats.totalOrders}`,
        `  ✅ Bajarilgan: ${stats.completedOrders}`,
        `  ❌ Bekor qilingan: ${stats.cancelledOrders}`,
        `  🔄 Qaytarilgan: ${stats.returnedOrders}`,
        `👥 Mijozlar: ${stats.uniqueClients}`,
        `🍔 Taomlar: ${stats.totalMeals}\n`,
        stats.mostSoldItem ? `🏆 Eng ko'p sotilgan: ${stats.mostSoldItem.name} (${stats.mostSoldItem.quantity})` : '',
        stats.leastSoldItem ? `📉 Eng kam sotilgan: ${stats.leastSoldItem.name} (${stats.leastSoldItem.quantity})` : '',
        stats.mostProfitableItem ? `💰 Eng foydali: ${stats.mostProfitableItem.name} (${formatCurrency(stats.mostProfitableItem.profit)} UZS)` : '',
        stats.mostUsedProduct ? `📦 Eng ko'p ishlatilgan: ${stats.mostUsedProduct.name} (${stats.mostUsedProduct.total} ${stats.mostUsedProduct.unit})` : '',
        stats.returnedCostImpact > 0 ? `\n⚠️ Qaytarish zarari: ${formatCurrency(stats.returnedCostImpact)} UZS` : '',
    ].filter(Boolean).join('\n');

    await ctx.reply(msg, { parse_mode: 'Markdown', ...statisticsMenuKeyboard });
}

statisticsScene.hears('📊 Bugun', async (ctx) => {
    const { from, to } = getToday();
    await showStats(ctx, from, to, 'Bugun');
});

statisticsScene.hears('📊 Shu Hafta', async (ctx) => {
    const { from, to } = getThisWeek();
    await showStats(ctx, from, to, 'Shu Hafta');
});

statisticsScene.hears('📊 Shu Oy', async (ctx) => {
    const { from, to } = getThisMonth();
    await showStats(ctx, from, to, 'Shu Oy');
});

statisticsScene.hears('📊 Shu Yil', async (ctx) => {
    const { from, to } = getThisYear();
    await showStats(ctx, from, to, 'Shu Yil');
});

statisticsScene.hears('📅 Boshqa Sana', async (ctx) => {
    ctx.session.menuAction = 'custom_from';
    await ctx.reply('Boshlanish sanasini kiriting (YYYY-MM-DD):', Markup.keyboard([['🔙 Bosh Menyu']]).resize());
});

statisticsScene.hears('📥 CSV formatda yuklash', async (ctx) => {
    const { from, to } = getThisMonth();
    const stats = await StatisticsService.getDashboard(from, to);

    const filePath = await exportToCsv('statistics', [
        { id: 'metric', title: 'Ko\'rsatkich' },
        { id: 'value', title: 'Qiymat' },
    ], [
        { metric: 'Daromad', value: stats.totalRevenue },
        { metric: 'Buyurtma xarajati', value: stats.totalCost },
        { metric: 'Buyurtma foydasi', value: stats.orderProfit },
        { metric: 'Xarajatlar', value: stats.totalExpenses },
        { metric: 'Sof foyda', value: stats.netProfit },
        { metric: 'Jami buyurtmalar', value: stats.totalOrders },
        { metric: 'Bajarilgan', value: stats.completedOrders },
        { metric: 'Bekor qilingan', value: stats.cancelledOrders },
        { metric: 'Qaytarilgan', value: stats.returnedOrders },
        { metric: 'Taomlar', value: stats.totalMeals },
        { metric: 'Mijozlar', value: stats.uniqueClients },
    ]);

    await ctx.replyWithDocument({ source: filePath, filename: 'statistika.csv' });
    fs.unlinkSync(filePath);
});

statisticsScene.hears('🔙 Bosh Menyu', async (ctx) => {
    await ctx.scene.enter('main_menu');
});

statisticsScene.on('text', async (ctx) => {
    if (ctx.session.menuAction === 'custom_from') {
        const from = new Date(ctx.message.text.trim());
        if (isNaN(from.getTime())) { await ctx.reply('Noto\'g\'ri sana. YYYY-MM-DD formatda kiriting:'); return; }
        ctx.session.statsDateRange = { from, to: new Date() };
        ctx.session.menuAction = 'custom_to';
        await ctx.reply('Tugash sanasini kiriting (YYYY-MM-DD):');
    } else if (ctx.session.menuAction === 'custom_to') {
        const to = new Date(ctx.message.text.trim());
        if (isNaN(to.getTime())) { await ctx.reply('Noto\'g\'ri sana. YYYY-MM-DD formatda kiriting:'); return; }
        ctx.session.statsDateRange!.to = to;
        ctx.session.menuAction = undefined;
        await showStats(ctx, ctx.session.statsDateRange!.from, to, 'Maxsus davr');
    }
});
