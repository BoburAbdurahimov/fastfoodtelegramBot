import { Scenes, Markup } from 'telegraf';
import { BotContext } from '../../types/context';
import { OrderService, OrderStatus } from '../../services/order.service';
import { formatCurrency } from '../../utils/format';

// ─── Waiter: My Orders Scene ───
export const waiterOrdersScene = new Scenes.BaseScene<BotContext>('waiter_orders');

waiterOrdersScene.enter(async (ctx) => {
    const orders = await OrderService.getOrders({
        userId: ctx.dbUser!.id,
        limit: 20,
    });

    if (orders.length === 0) {
        await ctx.reply('📋 Sizda hali buyurtmalar yo\'q.', Markup.keyboard([
            ['🔙 Bosh Menyu'],
        ]).resize());
        return ctx.scene.leave();
    }

    const statusEmoji: Record<string, string> = {
        NEW: '🆕',
        PREPARING: '🔄',
        READY: '✅',
        COMPLETED: '🏁',
        CANCELLED: '❌',
        RETURNED: '↩️',
    };

    const lines = orders.map((o: any) =>
        `${statusEmoji[o.status] || '❓'} #${o.id} | 🏗 Stol: ${o.tableNumber || '-'}\n   💰 ${formatCurrency(o.totalPrice)} UZS${o.clientName ? ` | 🧑 ${o.clientName}` : ''}`
    );

    const buttons: string[][] = [];

    // Show action buttons for READY orders (waiter can mark as COMPLETED/served)
    const readyOrders = orders.filter((o: any) => o.status === OrderStatus.READY);
    for (const order of readyOrders) {
        buttons.push([`🏁 Topshirildi #${order.id}`]);
    }

    buttons.push(['🔙 Bosh Menyu']);

    await ctx.reply(`📋 *MENING BUYURTMALARIM*\n\n${lines.join('\n\n')}`, {
        parse_mode: 'Markdown',
        ...Markup.keyboard(buttons).resize(),
    });
});

waiterOrdersScene.hears(/^🏁 Topshirildi #(\d+)$/, async (ctx) => {
    const orderId = parseInt(ctx.match[1]);
    try {
        await OrderService.updateStatus(orderId, OrderStatus.COMPLETED, ctx.dbUser!.id);
        await ctx.reply(`✅ Buyurtma #${orderId} topshirildi!`);
        await ctx.scene.reenter();
    } catch (err: any) {
        await ctx.reply(`❌ Xatolik: ${err.message}`);
    }
});

waiterOrdersScene.hears('🔙 Bosh Menyu', async (ctx) => {
    await ctx.scene.enter('main_menu');
});
