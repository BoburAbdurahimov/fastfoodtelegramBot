import { Scenes, Markup } from 'telegraf';
import { BotContext } from '../../types/context';
import { OrderService, OrderStatus } from '../../services/order.service';
import { MenuService } from '../../services/menu.service';
import { orderMenuKeyboard } from '../../keyboards/order.keyboard';
import { formatCurrency } from '../../utils/format';
import { paginate, paginationKeyboard } from '../../utils/pagination';

import { NotificationService } from '../../services/notification.service';

// ─── Order List Scene ───
export const orderListScene = new Scenes.BaseScene<BotContext>('order_list');

orderListScene.enter(async (ctx) => {
    ctx.session.currentPage = 1;
    await showOrderList(ctx, 1);
});

async function showOrderList(ctx: BotContext, page: number, status?: OrderStatus) {
    const orders = await OrderService.getOrders({
        status,
        limit: 100,
    });

    if (orders.length === 0) {
        await ctx.reply('📋 Buyurtmalar topilmadi.', orderMenuKeyboard);
        return;
    }

    const { data, totalPages } = paginate(orders, page, 5);

    const statusEmoji: Record<string, string> = {
        NEW: '🆕',
        PREPARING: '🔄',
        READY: '✅',
        COMPLETED: '🏁',
        CANCELLED: '❌',
        RETURNED: '🔄',
    };

    const lines = data.map((o: any) =>
        `${statusEmoji[o.status] || '❓'} #${o.orderNumber || o.id} | ${o.status}\n   💰 ${formatCurrency(o.totalPrice)} UZS | 👤 ${o.user.name}${o.clientName ? ` | 🧑 ${o.clientName}` : ''}${o.orderType === 'TAKEAWAY' ? ' | 🛍 Olib ketish' : ''}${o.tableNumber ? ` | 🏗 Stol: ${o.tableNumber}` : ''}\n   📅 ${o.createdAt.toLocaleDateString()}`
    );

    const message = `📋 *BUYURTMALAR*${status ? ` (${status})` : ''}\n\n${lines.join('\n\n')}`;

    const buttons: string[][] = [];
    let row: string[] = [];

    // Filter row
    buttons.push([
        '\ud83c\udd95', '\ud83d\udd04', '\u2705', '\u274c', '\ud83d\udccb Barchasi'
    ]);

    // Orders row
    data.forEach((o: any) => {
        row.push(`\ud83d\udcdd #${o.orderNumber || o.id}`);
        if (row.length === 3) {
            buttons.push(row);
            row = [];
        }
    });
    if (row.length > 0) buttons.push(row);

    // Pagination row
    const paginationRow = [];
    if (page > 1) paginationRow.push(`\u25c0\ufe0f Sahifa ${page - 1}`);
    if (page < totalPages) paginationRow.push(`Sahifa ${page + 1} \u25b6\ufe0f`);
    if (paginationRow.length > 0) buttons.push(paginationRow);

    buttons.push(['\ud83d\udd19 Orqaga']);

    await ctx.reply(message, {
        parse_mode: 'Markdown',
        ...Markup.keyboard(buttons).resize()
    });
}

orderListScene.hears(/^\u25c0\ufe0f Sahifa (\d+)$/, async (ctx) => {
    const page = parseInt(ctx.match[1]);
    ctx.session.currentPage = page;
    await showOrderList(ctx, page, ctx.session.currentFilter as OrderStatus | undefined);
});

orderListScene.hears(/^Sahifa (\d+) \u25b6\ufe0f$/, async (ctx) => {
    const page = parseInt(ctx.match[1]);
    ctx.session.currentPage = page;
    await showOrderList(ctx, page, ctx.session.currentFilter as OrderStatus | undefined);
});

orderListScene.hears(/^(\ud83c\udd95|\ud83d\udd04|\u2705|\u274c|\ud83d\udccb Barchasi)$/, async (ctx) => {
    const filterMap: Record<string, OrderStatus | undefined> = {
        '\ud83c\udd95': OrderStatus.NEW,
        '\ud83d\udd04': OrderStatus.PREPARING,
        '\u2705': OrderStatus.COMPLETED,
        '\u274c': OrderStatus.CANCELLED,
        '\ud83d\udccb Barchasi': undefined
    };
    const status = filterMap[ctx.match[1]];
    ctx.session.currentFilter = status;
    ctx.session.currentPage = 1;
    await showOrderList(ctx, 1, status);
});

orderListScene.hears(/^\ud83d\udcdd #(\d+)$/, async (ctx) => {
    const orderIdStr = ctx.match[1];

    // We need to find the real orderId based on the sequential orderNumber
    // The match[1] gives us the sequential orderNumber displayed on the UI.
    const orders = await OrderService.getOrders({ limit: 500 });
    const order = orders.find((o: any) => o.orderNumber === parseInt(orderIdStr) || o.id === parseInt(orderIdStr));

    if (!order) {
        await ctx.reply('Topilmadi');
        return;
    }

    ctx.session.selectedOrderId = order.id;

    const itemLines = order.items.map(
        (i) => `  • ${i.menuItem.name} x${i.quantity} = ${formatCurrency(i.unitPrice * i.quantity)} UZS`
    );

    const message = [
        `📋 *Buyurtma #${(order as any).orderNumber || order.id}*\n`,
        `📊 Holat: ${order.status}`,
        `🛍 Tur: ${(order as any).orderType === 'TAKEAWAY' ? 'Olib ketish' : 'Stolda'}`,
        `👤 Xodim: ${order.user.name}`,
        order.clientName ? `🧑 Mijoz: ${order.clientName}` : '',
        (order as any).tableNumber ? `🏗 Stol: ${(order as any).tableNumber}` : '',
        `\n🍔 *Taomlar:*`,
        ...itemLines,
        `\n💰 Jami narx: ${formatCurrency(order.totalPrice)} UZS`,
        `💵 Tannarx: ${formatCurrency(order.totalCost)} UZS`,
        `📈 Foyda: ${formatCurrency(order.profit)} UZS`,
        `\n📅 Yaratildi: ${order.createdAt.toLocaleString()}`,
        order.completedAt ? `✅ Bajarildi: ${order.completedAt.toLocaleString()}` : '',
    ].filter(Boolean).join('\n');

    const buttons: string[][] = [];

    if (order.status === OrderStatus.NEW) {
        buttons.push(['\ud83d\udd04 Tayyorlash', '\u274c Bekor qilish']);
    }
    if (order.status === OrderStatus.PREPARING) {
        buttons.push(['\u2705 Tayyor', '\u274c Bekor qilish']);
    }
    if (order.status === OrderStatus.READY) {
        buttons.push(['\ud83c\udfc1 Topshirildi']);
    }
    if (order.status === OrderStatus.COMPLETED) {
        buttons.push(['\ud83d\udd04 Qaytarish']);
    }
    buttons.push(['\ud83d\udd19 Ro\'yxatga qaytish']);

    await ctx.reply(message, {
        parse_mode: 'Markdown',
        ...Markup.keyboard(buttons).resize(),
    });
});

import { TableService } from '../../services/table.service';

// ─── New Order Scene ───
export const orderNewScene = new Scenes.WizardScene<BotContext>(
    'order_new',
    // Step 1: Order Type (Takeaway vs Dine-in)
    async (ctx) => {
        ctx.session.orderItems = [];
        await ctx.reply('🆕 *Yangi Buyurtma*\n\nBuyurtma turini tanlang:', {
            parse_mode: 'Markdown',
            ...Markup.keyboard([
                ['🍽 Stolda', '🛍 Olib ketish'],
                ['🔙 Bekor qilish'],
            ]).resize()
        });
        return ctx.wizard.next();
    },
    // Step 2: Table number (if Dine-in) or skip to Client name (if Takeaway)
    async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) return;
        const text = ctx.message.text.trim();
        if (text === '🔙 Bekor qilish') {
            await ctx.reply('Bekor qilindi.', orderMenuKeyboard);
            return ctx.scene.leave();
        }

        if (text === '🍽 Stolda') {
            (ctx.wizard.state as any).orderType = 'DINEIN';
            const tables = await TableService.getAllTables();
            if (tables.length === 0) {
                await ctx.reply('⚠️ Faol stollar topilmadi. Avval "Stollar" bo\'limidan stol qo\'shing.');
                return;
            }

            // Create nice keyboard layout for tables
            const buttons: string[][] = [];
            let row: string[] = [];
            for (const table of tables) {
                row.push(table.number.toString());
                if (row.length === 4) {
                    buttons.push(row);
                    row = [];
                }
            }
            if (row.length > 0) buttons.push(row);
            buttons.push(['🔙 Bekor qilish']);

            await ctx.reply('🏗 Stol raqamini tanlang:', Markup.keyboard(buttons).resize());
            return ctx.wizard.next();
        } else if (text === '🛍 Olib ketish') {
            (ctx.wizard.state as any).orderType = 'TAKEAWAY';
            await showMenuForOrder(ctx);
            return ctx.wizard.selectStep(3); // Jump to menu selection
        } else {
            await ctx.reply('Iltimos, tugmalardan birini tanlang.');
        }
    },
    // Step 3: Handle Table Selection (for Dine-in)
    async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) return;
        const text = ctx.message.text.trim();
        if (text === '🔙 Bekor qilish') {
            await ctx.reply('Bekor qilindi.', orderMenuKeyboard);
            return ctx.scene.leave();
        }

        const tableNum = parseInt(text);
        if (isNaN(tableNum) || tableNum <= 0) {
            await ctx.reply('Iltimos, tugmalardan stolni tanlang:');
            return;
        }

        (ctx.wizard.state as any).tableNumber = tableNum;
        await showMenuForOrder(ctx);
        return ctx.wizard.next();
    },
    // Step 4: Handle item selection and quantity
    async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) return;
        const text = ctx.message.text.trim();

        if (text === '\ud83d\udd19 Bekor qilish' || text === '\u274c Bekor qilish') {
            ctx.session.orderItems = [];
            await ctx.reply('\u274c Buyurtma bekor qilindi.', orderMenuKeyboard);
            return ctx.scene.leave();
        }

        if (text === '\u2705 Buyurtmani tasdiqlash') {
            if (!ctx.session.orderItems || ctx.session.orderItems.length === 0) {
                await ctx.reply('Kamida bitta mahsulot qo\'shing!');
                return;
            }

            try {
                const state = ctx.wizard.state as any;
                const tableNumber = state.tableNumber;
                const orderType = state.orderType || 'DINEIN';

                const order = await OrderService.createOrder(
                    ctx.dbUser!.id,
                    undefined, // Removed client name
                    ctx.session.orderItems!.map((i) => ({
                        menuItemId: i.menuItemId,
                        quantity: i.quantity,
                    })),
                    tableNumber,
                    orderType
                );

                const itemLines = (order as any).items.map(
                    (i: any) => `  \u2022 ${i.menuItem.name} x${i.quantity} = ${formatCurrency(i.unitPrice * i.quantity)} UZS`
                );

                await ctx.reply(
                    [
                        `\u2705 *Buyurtma #${(order as any).orderNumber || order.id} yaratildi!*\n`,
                        `\ud83d\udecd Tur: ${orderType === 'TAKEAWAY' ? 'Olib ketish' : 'Stolda'}`,
                        orderType === 'DINEIN' && tableNumber ? `\ud83c\udfd7 Stol: ${tableNumber}` : '',
                        `\n\ud83c\udf54 *Taomlar:*`,
                        ...itemLines,
                        `\n\ud83d\udcb0 Jami: ${formatCurrency(order.totalPrice)} UZS`,
                    ].filter(Boolean).join('\n'),
                    {
                        parse_mode: 'Markdown',
                        ...orderMenuKeyboard
                    }
                );

                // Notify all chefs
                await NotificationService.notifyChefs(order);
                // Check low stock
                await NotificationService.sendLowStockAlert();

                ctx.session.orderItems = [];
                return ctx.scene.leave();
            } catch (err: any) {
                await ctx.reply(`\u274c Xatolik: ${err.message}`);
                return ctx.scene.leave();
            }
        }

        // If the user typed a number and we previously had selected an item
        const selectedId = (ctx.wizard.state as any).selectedMenuItemId;
        if (selectedId) {
            const qty = parseInt(text);
            if (isNaN(qty) || qty <= 0) {
                await ctx.reply('Iltimos, musbat son kiriting (yoki Bekor qilish ni bosing):');
                return;
            }

            const menuItem = await MenuService.getMenuItemById(selectedId);
            if (!menuItem) {
                await ctx.reply('Menyu elementi topilmadi.');
                (ctx.wizard.state as any).selectedMenuItemId = undefined;
                await showMenuForOrder(ctx);
                return;
            }

            const existing = ctx.session.orderItems!.find((i) => i.menuItemId === selectedId);
            if (existing) {
                existing.quantity += qty;
            } else {
                ctx.session.orderItems!.push({
                    menuItemId: selectedId,
                    name: menuItem.name,
                    quantity: qty,
                    price: menuItem.price,
                });
            }

            (ctx.wizard.state as any).selectedMenuItemId = undefined;
            await showMenuForOrder(ctx);
            return;
        }

        // Check if they tapped a menu item button
        const items = await MenuService.getActiveMenuItems();
        const matchedItem = items.find(i => text === i.name || text.includes(i.name));

        if (matchedItem) {
            (ctx.wizard.state as any).selectedMenuItemId = matchedItem.id;
            await ctx.reply(`${matchedItem.name} dan necha dona qo'shmoqchisiz?\nMiqdorni kiriting (masalan 1, 2, 3...):`, Markup.keyboard([['\ud83d\udd19 Bekor qilish']]).resize());
        } else {
            await ctx.reply('Iltimos, pastdagi menyudan mahsulot tanlang yoki xatosiz kiriting.');
        }
    }
);

async function showMenuForOrder(ctx: BotContext) {
    const items = await MenuService.getActiveMenuItems();
    const currentItems = ctx.session.orderItems || [];

    const cartLines = currentItems.length > 0
        ? currentItems.map((i) => `  🛒 ${i.name} x${i.quantity} = ${formatCurrency(i.price * i.quantity)} UZS`).join('\n')
        : '  (bo\'sh)';

    const total = currentItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const message = [
        '🍔 *Menyu mahsulotlarini tanlang:*\n',
        `🛒 *Savat:*\n${cartLines}`,
        `\n💰 *Jami: ${formatCurrency(ctx.session.orderItems!.reduce((acc, i) => acc + i.price * i.quantity, 0))} UZS*`,
    ].join('\n');

    const buttons: string[][] = [];
    let row: string[] = [];

    // Group buttons 2 per row
    for (const item of items) {
        row.push(item.name);
        if (row.length === 2) {
            buttons.push(row);
            row = [];
        }
    }
    if (row.length > 0) buttons.push(row);

    buttons.push(['✅ Buyurtmani tasdiqlash']);
    buttons.push(['❌ Bekor qilish']);

    await ctx.reply(message, {
        parse_mode: 'Markdown',
        ...Markup.keyboard(buttons).resize(),
    });
}

// Keep the wizard in step 3 for continued item selection
orderNewScene.action(/.*/, async (ctx) => {
    // Forward to step 3 handler
});
