import { Scenes, Markup } from 'telegraf';
import { BotContext } from '../../types/context';
import { WarehouseService } from '../../services/warehouse.service';
import { warehouseMenuKeyboard } from '../../keyboards/warehouse.keyboard';
import { formatCurrency } from '../../utils/format';
import { paginate, paginationKeyboard } from '../../utils/pagination';

// ─── Warehouse List Scene ───
export const warehouseListScene = new Scenes.BaseScene<BotContext>('warehouse_list');

warehouseListScene.enter(async (ctx) => {
    const products = await WarehouseService.getAllProducts();
    if (products.length === 0) {
        await ctx.reply('📦 Omborxona bo\'sh.\n\nYangi mahsulot qo\'shing.', warehouseMenuKeyboard);
        return ctx.scene.leave();
    }

    ctx.session.currentPage = 1;
    await showProductPage(ctx, products, 1);
});

async function showProductPage(ctx: BotContext, products: any[], page: number) {
    const { data, totalPages } = paginate(products, page, 8);

    const lines = data.map(
        (p, i) =>
            `${(page - 1) * 8 + i + 1}. *${p.name}*\n   📏 O'lchov: ${p.unit} | 💰 Narx: ${formatCurrency(p.costPerUnit)} UZS\n   📊 Zaxira: ${p.quantity} | ⚠️ Chegara: ${p.lowStockThreshold}${p.quantity <= p.lowStockThreshold ? ' 🔴' : ' 🟢'}`
    );

    const message = `📦 *OMBORXONA MAHSULOTLARI (Sahifa ${page}/${totalPages})*\n\n${lines.join('\n\n')}`;

    const buttons: string[][] = data.map((p) => [`📝 ${p.name}`]);

    const nav = [];
    if (page > 1) nav.push('⬅️ Oldingi');
    if (page < totalPages) nav.push('Keyingi ➡️');
    if (nav.length > 0) buttons.push(nav);

    buttons.push(['🔙 Orqaga']);

    await ctx.reply(message, {
        parse_mode: 'Markdown',
        ...Markup.keyboard(buttons).resize(),
    });
}

warehouseListScene.hears('Keyingi ➡️', async (ctx) => {
    const page = (ctx.session.currentPage || 1) + 1;
    const products = await WarehouseService.getAllProducts();
    ctx.session.currentPage = page;
    await showProductPage(ctx, products, page);
});

warehouseListScene.hears('⬅️ Oldingi', async (ctx) => {
    const page = Math.max((ctx.session.currentPage || 1) - 1, 1);
    const products = await WarehouseService.getAllProducts();
    ctx.session.currentPage = page;
    await showProductPage(ctx, products, page);
});

warehouseListScene.hears(/^📝 (.*)$/, async (ctx) => {
    const productName = ctx.match[1];
    const products = await WarehouseService.getAllProducts();
    const product = products.find(p => p.name === productName);
    if (!product) {
        return;
    }

    const productId = product.id;
    const history = await WarehouseService.getProductHistory(productId, 5);
    const historyLines = history.length > 0
        ? history.map((h) =>
            `  ${h.reason}: ${h.quantityChange > 0 ? '+' : ''}${h.quantityChange} — ${h.user.name} (${h.createdAt.toLocaleDateString()})`
        ).join('\n')
        : '  Tarix yo\'q';

    const message = [
        `📦 *${product.name}*\n`,
        `📏 O'lchov: ${product.unit}`,
        `💰 Narx (dona/litr): ${formatCurrency(product.costPerUnit)} UZS`,
        `📊 Zaxirada: ${product.quantity}`,
        `⚠️ Kamayish chegarasi: ${product.lowStockThreshold}`,
        `${product.quantity <= product.lowStockThreshold ? '🔴 KAM QOLDI!' : '🟢 Zaxira yetarli'}`,
        `\n📜 *So'nggi tarix:*\n${historyLines}`,
    ].join('\n');

    ctx.session.warehouseProductId = productId;

    await ctx.reply(message, {
        parse_mode: 'Markdown',
        ...Markup.keyboard([
            ['🗑️ O\'chirish'],
            ['🔙 Orqaga (Ro\'yxat)'],
        ]).resize(),
    });
});

warehouseListScene.hears('🔙 Orqaga', async (ctx) => {
    await ctx.scene.leave();
    await ctx.reply('📦 *OMBOR*\n\nVariantni tanlang:', {
        parse_mode: 'Markdown',
        ...warehouseMenuKeyboard,
    });
});

warehouseListScene.hears('🔙 Orqaga (Ro\'yxat)', async (ctx) => {
    const products = await WarehouseService.getAllProducts();
    await showProductPage(ctx, products, ctx.session.currentPage || 1);
});

warehouseListScene.hears('🗑️ O\'chirish', async (ctx) => {
    const productId = ctx.session.warehouseProductId;
    if (!productId) return;
    await WarehouseService.softDelete(productId);
    await ctx.reply('✅ Mahsulot o\'chirildi');
    const products = await WarehouseService.getAllProducts();
    if (products.length === 0) {
        await ctx.scene.leave();
        await ctx.reply('📦 Omborxona bo\'sh.', warehouseMenuKeyboard);
        return;
    }
    await showProductPage(ctx, products, 1);
});

// ─── Add Product Scene ───
export const warehouseAddScene = new Scenes.WizardScene<BotContext>(
    'warehouse_add',
    async (ctx) => {
        await ctx.reply('📦 *Yangi Mahsulot Qo\'shish*\n\nNomini kiriting:', {
            parse_mode: 'Markdown',
            ...Markup.keyboard([['🔙 Bekor qilish']]).resize()
        });
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) return;
        if (ctx.message.text === '🔙 Bekor qilish') {
            await ctx.reply('Bekor qilindi.', warehouseMenuKeyboard);
            return ctx.scene.leave();
        }
        (ctx.wizard.state as any).name = ctx.message.text.trim();
        await ctx.reply('O\'lchovni tanlang:', Markup.keyboard([
            ['PCS', 'KG'],
            ['GRAM', 'LITER'],
            ['ML', '🔙 Bekor qilish'],
        ]).resize());
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) return;
        if (ctx.message.text === '🔙 Bekor qilish') {
            await ctx.reply('Bekor qilindi.', warehouseMenuKeyboard);
            return ctx.scene.leave();
        }
        const unit = ctx.message.text.trim();
        (ctx.wizard.state as any).unit = unit;
        await ctx.reply('1 birlik uchun xarajat narxini kiriting (masalan, 2.50):', {
            ...Markup.keyboard([['🔙 Bekor qilish']]).resize()
        });
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) return;
        if (ctx.message.text === '🔙 Bekor qilish') {
            await ctx.reply('Bekor qilindi.', warehouseMenuKeyboard);
            return ctx.scene.leave();
        }
        const cost = parseFloat(ctx.message.text);
        if (isNaN(cost) || cost < 0) {
            await ctx.reply('Iltimos, yaroqli musbat son kiriting:');
            return;
        }
        (ctx.wizard.state as any).costPerUnit = cost;
        await ctx.reply('Boshlang\'ich zaxira miqdorini kiriting:');
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) return;
        if (ctx.message.text === '🔙 Bekor qilish') {
            await ctx.reply('Bekor qilindi.', warehouseMenuKeyboard);
            return ctx.scene.leave();
        }
        const qty = parseFloat(ctx.message.text);
        if (isNaN(qty) || qty < 0) {
            await ctx.reply('Iltimos, yaroqli son kiriting:');
            return;
        }
        (ctx.wizard.state as any).quantity = qty;
        await ctx.reply('Kamayish ogohlantirish chegarasini kiriting (Masalan: 10):');
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) return;
        if (ctx.message.text === '🔙 Bekor qilish') {
            await ctx.reply('Bekor qilindi.', warehouseMenuKeyboard);
            return ctx.scene.leave();
        }
        const threshold = parseFloat(ctx.message.text);
        if (isNaN(threshold) || threshold < 0) {
            await ctx.reply('Iltimos, yaroqli musbat son kiriting:');
            return;
        }

        const state = ctx.wizard.state as any;
        const product = await WarehouseService.createProduct({
            name: state.name,
            unit: state.unit,
            costPerUnit: state.costPerUnit,
            quantity: state.quantity,
            lowStockThreshold: threshold,
        });

        await ctx.reply(
            `✅ Mahsulot qo'shildi!\n\n📦 *${product.name}*\n📏 O'lchov: ${product.unit}\n💰 Narx: ${formatCurrency(product.costPerUnit)} UZS\n📊 Zaxira: ${product.quantity}\n⚠️ Chegara: ${product.lowStockThreshold}`,
            { parse_mode: 'Markdown', ...warehouseMenuKeyboard }
        );
        return ctx.scene.leave();
    }
);

// ─── Add Stock Scene ───
export const warehouseAddStockScene = new Scenes.WizardScene<BotContext>(
    'warehouse_add_stock',
    async (ctx) => {
        const products = await WarehouseService.getAllProducts();
        if (products.length === 0) {
            await ctx.reply('Mahsulot topilmadi.', warehouseMenuKeyboard);
            return ctx.scene.leave();
        }

        const buttons = products.map((p) => [`📝 ${p.name}`]);
        buttons.push(['🔙 Bekor qilish']);

        await ctx.reply('📥 *Zaxira Qo\'shish*\n\nQaysi mahsulotni qo\'shasiz?', {
            parse_mode: 'Markdown',
            ...Markup.keyboard(buttons).resize(),
        });
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) return;
        const text = ctx.message.text;

        if (text === '🔙 Bekor qilish') {
            await ctx.reply('Bekor qilindi.', warehouseMenuKeyboard);
            return ctx.scene.leave();
        }

        const productName = text.replace(/^📝 /, '');
        const products = await WarehouseService.getAllProducts();
        const product = products.find(p => p.name === productName);

        if (!product) {
            await ctx.reply('Iltimos, tugmalardan birini tanlang yoki Bekor qilish ni so\'rang.');
            return;
        }

        (ctx.wizard.state as any).productId = product.id;
        await ctx.reply('Qo\'shiladigan miqdorni kiriting:', Markup.keyboard([['🔙 Bekor qilish']]).resize());
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) return;
        if (ctx.message.text === '🔙 Bekor qilish') {
            await ctx.reply('Bekor qilindi.', warehouseMenuKeyboard);
            return ctx.scene.leave();
        }

        const qty = parseFloat(ctx.message.text);
        if (isNaN(qty) || qty <= 0) {
            await ctx.reply('Iltimos, noldan katta butun/o\'nli son kiriting:');
            return;
        }

        const state = ctx.wizard.state as any;
        const product = await WarehouseService.addStock(state.productId, qty, ctx.dbUser!.id);

        await ctx.reply(
            `✅ Zaxira qo'shildi!\n\n📦 *${product.name}*\n📊 Yangi zaxira: ${product.quantity} ${product.unit}`,
            { parse_mode: 'Markdown', ...warehouseMenuKeyboard }
        );
        return ctx.scene.leave();
    }
);

// ─── Remove Stock Scene ───
export const warehouseRemoveStockScene = new Scenes.WizardScene<BotContext>(
    'warehouse_remove_stock',
    async (ctx) => {
        const products = await WarehouseService.getAllProducts();
        if (products.length === 0) {
            await ctx.reply('Mahsulot topilmadi.', warehouseMenuKeyboard);
            return ctx.scene.leave();
        }

        const buttons = products.map((p) => [`📝 ${p.name}`]);
        buttons.push(['🔙 Bekor qilish']);

        await ctx.reply('📤 *Zaxiradan Olish*\n\nMahsulot tanlang:', {
            parse_mode: 'Markdown',
            ...Markup.keyboard(buttons).resize(),
        });
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) return;
        const text = ctx.message.text;

        if (text === '🔙 Bekor qilish') {
            await ctx.reply('Bekor qilindi.', warehouseMenuKeyboard);
            return ctx.scene.leave();
        }

        const productName = text.replace(/^📝 /, '');
        const products = await WarehouseService.getAllProducts();
        const product = products.find(p => p.name === productName);

        if (!product) {
            await ctx.reply('Iltimos, ro\'yhatdagi tugmalardan tanlang.');
            return;
        }

        (ctx.wizard.state as any).productId = product.id;
        await ctx.reply('Olinadigan miqdorni kiriting:', Markup.keyboard([['🔙 Bekor qilish']]).resize());
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) return;
        if (ctx.message.text === '🔙 Bekor qilish') {
            await ctx.reply('Bekor qilindi.', warehouseMenuKeyboard);
            return ctx.scene.leave();
        }

        const qty = parseFloat(ctx.message.text);
        if (isNaN(qty) || qty <= 0) {
            await ctx.reply('Iltimos, yaroqli musbat son kiriting:');
            return;
        }

        try {
            const state = ctx.wizard.state as any;
            const product = await WarehouseService.removeStock(state.productId, qty, ctx.dbUser!.id);

            await ctx.reply(
                `✅ Zaxiradan olindi!\n\n📦 *${product.name}*\n📊 Yangi zaxira: ${product.quantity} ${product.unit}`,
                { parse_mode: 'Markdown', ...warehouseMenuKeyboard }
            );
        } catch (err: any) {
            await ctx.reply(`❌ ${err.message}`, warehouseMenuKeyboard);
        }
        return ctx.scene.leave();
    }
);
