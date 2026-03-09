import { Scenes, Markup } from 'telegraf';
import { BotContext } from '../../types/context';
import { OrderService, OrderStatus } from '../../services/order.service';
import { NotificationService } from '../../services/notification.service';
import { formatCurrency } from '../../utils/format';

// ─── Chef: New Orders Scene ───
export const chefOrdersScene = new Scenes.BaseScene<BotContext>('chef_orders');

chefOrdersScene.enter(async (ctx) => {
    const orders = await OrderService.getOrders({ status: OrderStatus.NEW as any, limit: 50 });

    if (orders.length === 0) {
        await ctx.reply('✅ Hozircha yangi buyurtmalar yo\'q.', Markup.keyboard([
            ['🔙 Bosh Menyu'],
        ]).resize());
        return ctx.scene.leave();
    }

    const lines = orders.map((o: any) =>
        `🆕 #${o.id} | 🏗 Stol: ${o.tableNumber || '-'}\n   🍔 ${o.items.map((i: any) => `${i.menuItem.name} x${i.quantity}`).join(', ')}\n   🧑‍🍳 Ofitsiant: ${o.user.name}`
    );

    const buttons: string[][] = orders.map((o: any) => [`🔥 Tayyorlash #${o.id}`]);
    buttons.push(['🔙 Bosh Menyu']);

    await ctx.reply(`🔔 *YANGI BUYURTMALAR (${orders.length})*\n\n${lines.join('\n\n')}`, {
        parse_mode: 'Markdown',
        ...Markup.keyboard(buttons).resize(),
    });
});

chefOrdersScene.hears(/^🔥 Tayyorlash #(\d+)$/, async (ctx) => {
    const orderId = parseInt(ctx.match[1]);
    try {
        await OrderService.updateStatus(orderId, OrderStatus.PREPARING, ctx.dbUser!.id);
        await ctx.reply(`✅ Buyurtma #${orderId} tayyorlanmoqda!`);
        // Re-enter to refresh the list
        await ctx.scene.reenter();
    } catch (err: any) {
        await ctx.reply(`❌ Xatolik: ${err.message}`);
    }
});

chefOrdersScene.hears('🔙 Bosh Menyu', async (ctx) => {
    await ctx.scene.enter('main_menu');
});

// ─── Chef: Preparing Orders Scene ───
export const chefPreparingScene = new Scenes.BaseScene<BotContext>('chef_preparing');

chefPreparingScene.enter(async (ctx) => {
    const orders = await OrderService.getOrders({ status: OrderStatus.PREPARING as any, limit: 50 });

    if (orders.length === 0) {
        await ctx.reply('✅ Hozircha tayyorlanayotgan buyurtmalar yo\'q.', Markup.keyboard([
            ['🔙 Bosh Menyu'],
        ]).resize());
        return ctx.scene.leave();
    }

    const lines = orders.map((o: any) =>
        `🔄 #${o.id} | 🏗 Stol: ${o.tableNumber || '-'}\n   🍔 ${o.items.map((i: any) => `${i.menuItem.name} x${i.quantity}`).join(', ')}\n   🧑‍🍳 Ofitsiant: ${o.user.name}`
    );

    const buttons: string[][] = orders.map((o: any) => [`✅ Tayyor #${o.id}`]);
    buttons.push(['🔙 Bosh Menyu']);

    await ctx.reply(`🔥 *TAYYORLANAYOTGAN BUYURTMALAR (${orders.length})*\n\n${lines.join('\n\n')}`, {
        parse_mode: 'Markdown',
        ...Markup.keyboard(buttons).resize(),
    });
});

chefPreparingScene.hears(/^✅ Tayyor #(\d+)$/, async (ctx) => {
    const orderId = parseInt(ctx.match[1]);
    try {
        const order = await OrderService.updateStatus(orderId, OrderStatus.READY, ctx.dbUser!.id);
        // Notify the waiter
        await NotificationService.notifyWaiter(order);
        await ctx.reply(`✅ Buyurtma #${orderId} tayyor! Ofitsiantga xabar yuborildi.`);
        await ctx.scene.reenter();
    } catch (err: any) {
        await ctx.reply(`❌ Xatolik: ${err.message}`);
    }
});

chefPreparingScene.hears('🔙 Bosh Menyu', async (ctx) => {
    await ctx.scene.enter('main_menu');
});

export * from './batch';
