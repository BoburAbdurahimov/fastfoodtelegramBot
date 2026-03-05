import { Scenes, Markup } from 'telegraf';
import { BotContext } from '../../types/context';
import { MenuService, RecipeService } from '../../services/menu.service';
import { WarehouseService } from '../../services/warehouse.service';
import { menuManagementKeyboard } from '../../keyboards/menu.keyboard';
import { formatCurrency } from '../../utils/format';
import { paginate } from '../../utils/pagination';

// ─── Menu List Scene ───
export const menuListScene = new Scenes.BaseScene<BotContext>('menu_list');

menuListScene.enter(async (ctx) => {
    const items = await MenuService.getAllMenuItems();
    if (items.length === 0) {
        await ctx.reply('🍔 Menyu mahsulotlari topilmadi.\n\n"Taom Qo\'shish" orqali yarating.', menuManagementKeyboard);
        return ctx.scene.leave();
    }

    ctx.session.currentPage = 1;
    await showMenuPage(ctx, items, 1);
});

async function showMenuPage(ctx: BotContext, items: any[], page: number) {
    const { data, totalPages } = paginate(items, page, 6);

    const lines = data.map((item) => {
        const status = item.isActive ? '🟢' : '🔴';
        const ingredients = item.recipes.length > 0
            ? item.recipes.map((r: any) => `    • ${r.warehouseProduct.name}: ${r.quantity} ${r.warehouseProduct.unit}`).join('\n')
            : '    (retsept yo\'q)';
        return `${status} *${item.name}* — ${formatCurrency(item.price)} UZS\n📂 ${item.category.name}\n🧪 Retsept:\n${ingredients}`;
    });

    const message = `🍔 *MENYU MAHSULOTLARI (${page}/${totalPages})*\n\n${lines.join('\n\n')}`;

    const buttons: string[][] = data.map((item) => [`📝 ${item.name}`]);

    const nav = [];
    if (page > 1) nav.push('⬅️ Oldingi');
    if (page < totalPages) nav.push('Keyingi ➡️');
    if (nav.length > 0) buttons.push(nav);

    buttons.push(['🔙 Menyu Boshqaruvi']);

    await ctx.reply(message, {
        parse_mode: 'Markdown',
        ...Markup.keyboard(buttons).resize(),
    });
}

menuListScene.hears('Keyingi ➡️', async (ctx) => {
    const page = (ctx.session.currentPage || 1) + 1;
    const items = await MenuService.getAllMenuItems();
    ctx.session.currentPage = page;
    await showMenuPage(ctx, items, page);
});

menuListScene.hears('⬅️ Oldingi', async (ctx) => {
    const page = Math.max((ctx.session.currentPage || 1) - 1, 1);
    const items = await MenuService.getAllMenuItems();
    ctx.session.currentPage = page;
    await showMenuPage(ctx, items, page);
});

menuListScene.hears(/^📝 (.*)$/, async (ctx) => {
    const itemName = ctx.match[1];
    const items = await MenuService.getAllMenuItems();
    const item = items.find((i: any) => i.name === itemName);
    if (!item) return;

    const recipes = item.recipes.map(
        (r: any) => `  • ${r.warehouseProduct.name}: ${r.quantity} ${r.warehouseProduct.unit} (${formatCurrency(r.warehouseProduct.costPerUnit * r.quantity)} UZS)`
    );

    const totalCost = item.recipes.reduce(
        (sum: number, r: any) => sum + r.warehouseProduct.costPerUnit * r.quantity, 0
    );

    const message = [
        `🍔 *${item.name}*\n`,
        `💰 Narx: ${formatCurrency(item.price)} UZS`,
        `📂 Kategoriya: ${item.category.name}`,
        `${item.isActive ? '🟢 Faol' : '🔴 Nofaol'}`,
        `\n🧪 *Retsept:*`,
        recipes.length > 0 ? recipes.join('\n') : '  Ingredientlar yo\'q',
        `\n💵 Tannarx: ${formatCurrency(totalCost)} UZS`,
        `📈 Foyda: ${formatCurrency(item.price - totalCost)} UZS`,
    ].join('\n');

    ctx.session.menuItemId = item.id;

    await ctx.reply(message, {
        parse_mode: 'Markdown',
        ...Markup.keyboard([
            [item.isActive ? '🔴 O\'chirish (nofaol)' : '🟢 Yoqish (faol)'],
            ['🗑️ O\'chirish'],
            ['🔙 Ro\'yxatga Qaytish'],
        ]).resize(),
    });
});

menuListScene.hears('🔴 O\'chirish (nofaol)', async (ctx) => {
    if (ctx.session.menuItemId) {
        await MenuService.toggleActive(ctx.session.menuItemId);
        await ctx.reply('✅ Menyu elementi nofaol qilindi.');
    }
    const items = await MenuService.getAllMenuItems();
    await showMenuPage(ctx, items, ctx.session.currentPage || 1);
});

menuListScene.hears('🟢 Yoqish (faol)', async (ctx) => {
    if (ctx.session.menuItemId) {
        await MenuService.toggleActive(ctx.session.menuItemId);
        await ctx.reply('✅ Menyu elementi faol qilindi.');
    }
    const items = await MenuService.getAllMenuItems();
    await showMenuPage(ctx, items, ctx.session.currentPage || 1);
});

menuListScene.hears('🗑️ O\'chirish', async (ctx) => {
    if (ctx.session.menuItemId) {
        await MenuService.softDeleteMenuItem(ctx.session.menuItemId);
        await ctx.reply('✅ Menyu elementi o\'chirildi.');
    }
    const items = await MenuService.getAllMenuItems();
    if (items.length === 0) {
        await ctx.reply('🍔 Menyu bo\'sh.', menuManagementKeyboard);
        return ctx.scene.leave();
    }
    await showMenuPage(ctx, items, 1);
});

menuListScene.hears('🔙 Ro\'yxatga Qaytish', async (ctx) => {
    const items = await MenuService.getAllMenuItems();
    await showMenuPage(ctx, items, ctx.session.currentPage || 1);
});

menuListScene.hears('🔙 Menyu Boshqaruvi', async (ctx) => {
    await ctx.scene.leave();
    await ctx.reply('🍔 *MENYU BOSHQARUVI*\n\nVariantni tanlang:', {
        parse_mode: 'Markdown',
        ...menuManagementKeyboard,
    });
});

// ─── Add Menu Item Scene ───
export const menuAddScene = new Scenes.WizardScene<BotContext>(
    'menu_add',
    // Step 1: Select category
    async (ctx) => {
        const categories = await MenuService.getAllCategories();
        if (categories.length === 0) {
            await ctx.reply('Kategoriyalar topilmadi. Avval kategoriya yarating.', menuManagementKeyboard);
            return ctx.scene.leave();
        }

        const buttons = categories.map((c) => [c.name]);
        buttons.push(['🔙 Bekor qilish']);

        await ctx.reply('🍔 *Taom Qo\'shish*\n\nKategoriyani tanlang:', {
            parse_mode: 'Markdown',
            ...Markup.keyboard(buttons).resize(),
        });
        (ctx.wizard.state as any).categories = categories;
        return ctx.wizard.next();
    },
    // Step 2: Name
    async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) return;
        if (ctx.message.text === '🔙 Bekor qilish') {
            await ctx.reply('Bekor qilindi.', menuManagementKeyboard);
            return ctx.scene.leave();
        }

        const categories = (ctx.wizard.state as any).categories || [];
        const cat = categories.find((c: any) => c.name === (ctx.message as any)!.text);
        if (!cat) {
            await ctx.reply('Iltimos, tugmalardan kategoriyani tanlang:');
            return;
        }
        (ctx.wizard.state as any).categoryId = cat.id;
        await ctx.reply('Taom nomini kiriting:', Markup.keyboard([['🔙 Bekor qilish']]).resize());
        return ctx.wizard.next();
    },
    // Step 3: Price
    async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) return;
        if (ctx.message.text === '🔙 Bekor qilish') {
            await ctx.reply('Bekor qilindi.', menuManagementKeyboard);
            return ctx.scene.leave();
        }
        (ctx.wizard.state as any).name = ctx.message.text.trim();
        await ctx.reply('Sotish narxini kiriting (masalan, 15000):');
        return ctx.wizard.next();
    },
    // Step 4: Save
    async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) return;
        if (ctx.message.text === '🔙 Bekor qilish') {
            await ctx.reply('Bekor qilindi.', menuManagementKeyboard);
            return ctx.scene.leave();
        }
        const price = parseFloat(ctx.message.text);
        if (isNaN(price) || price <= 0) {
            await ctx.reply('Iltimos, yaroqli musbat son kiriting:');
            return;
        }

        const state = ctx.wizard.state as any;
        const item = await MenuService.createMenuItem({
            name: state.name,
            price,
            categoryId: state.categoryId,
        });

        await ctx.reply(
            `✅ Taom yaratildi!\n\n🍔 *${item.name}*\n💰 Narx: ${formatCurrency(item.price)} UZS\n📂 Kategoriya: ${item.category.name}\n\n💡 Retsept ingredientlarini qo'shishni unutmang!`,
            { parse_mode: 'Markdown', ...menuManagementKeyboard }
        );
        return ctx.scene.leave();
    }
);

// ─── Categories Scene ───
export const categoryScene = new Scenes.BaseScene<BotContext>('category_manage');

categoryScene.enter(async (ctx) => {
    await showCategories(ctx);
});

async function showCategories(ctx: BotContext) {
    const categories = await MenuService.getAllCategories();
    const lines = categories.length > 0
        ? categories.map((c) => `📂 *${c.name}* (${c.menuItems.length} ta taom)`).join('\n')
        : 'Kategoriyalar hali yo\'q.';

    const buttons: string[][] = [['➕ Kategoriya Qo\'shish']];
    for (const c of categories) {
        buttons.push([`🗑️ ${c.name}`]);
    }
    buttons.push(['🔙 Menyu Boshqaruvi']);

    await ctx.reply(`📂 *KATEGORIYALAR*\n\n${lines}`, {
        parse_mode: 'Markdown',
        ...Markup.keyboard(buttons).resize(),
    });
}

categoryScene.hears('➕ Kategoriya Qo\'shish', async (ctx) => {
    ctx.session.menuAction = 'add_category';
    await ctx.reply('Yangi kategoriya nomini kiriting:', Markup.keyboard([['🔙 Bekor qilish']]).resize());
});

categoryScene.hears(/^🗑️ (.+)$/, async (ctx) => {
    const catName = ctx.match[1];
    const categories = await MenuService.getAllCategories();
    const cat = categories.find(c => c.name === catName);
    if (cat) {
        await MenuService.softDeleteCategory(cat.id);
        await ctx.reply(`✅ "${catName}" kategoriyasi o'chirildi.`);
    }
    await showCategories(ctx);
});

categoryScene.hears('🔙 Menyu Boshqaruvi', async (ctx) => {
    await ctx.scene.leave();
    await ctx.reply('🍔 *MENYU BOSHQARUVI*\n\nVariantni tanlang:', {
        parse_mode: 'Markdown',
        ...menuManagementKeyboard,
    });
});

categoryScene.hears('🔙 Bekor qilish', async (ctx) => {
    ctx.session.menuAction = undefined;
    await showCategories(ctx);
});

categoryScene.on('text', async (ctx) => {
    if (ctx.session.menuAction === 'add_category') {
        const name = ctx.message.text.trim();
        await MenuService.createCategory(name);
        ctx.session.menuAction = undefined;
        await ctx.reply(`✅ "${name}" kategoriyasi yaratildi!`);
        await showCategories(ctx);
    }
});

// ─── Recipe Management Scene ───
export const recipeScene = new Scenes.BaseScene<BotContext>('recipe_manage');

recipeScene.enter(async (ctx) => {
    const items = await MenuService.getAllMenuItems();
    if (items.length === 0) {
        await ctx.reply('Menyu mahsulotlari topilmadi. Avval taom yarating.', menuManagementKeyboard);
        return ctx.scene.leave();
    }

    const buttons: string[][] = items.map((item) => [`🍔 ${item.name}`]);
    buttons.push(['🔙 Menyu Boshqaruvi']);

    await ctx.reply('🧪 *RETSEPTLARNI BOSHQARISH*\n\nTaomni tanlang:', {
        parse_mode: 'Markdown',
        ...Markup.keyboard(buttons).resize(),
    });
});

recipeScene.hears(/^🍔 (.+)$/, async (ctx) => {
    const itemName = ctx.match[1];
    const items = await MenuService.getAllMenuItems();
    const item = items.find((i: any) => i.name === itemName);
    if (!item) return;

    ctx.session.menuItemId = item.id;
    await showRecipeDetail(ctx, item.id);
});

async function showRecipeDetail(ctx: BotContext, menuItemId: number) {
    const item = await MenuService.getMenuItemById(menuItemId);
    if (!item) return;

    const recipes = item.recipes.map(
        (r: any) => `  • ${r.warehouseProduct.name}: ${r.quantity} ${r.warehouseProduct.unit}`
    );

    const message = [
        `🧪 *${item.name} uchun retsept*\n`,
        recipes.length > 0 ? recipes.join('\n') : '  Ingredientlar hali qo\'shilmagan.',
    ].join('\n');

    const buttons: string[][] = [['➕ Ingredient Qo\'shish']];
    for (const r of item.recipes) {
        buttons.push([`🗑️ ${(r as any).warehouseProduct.name}`]);
    }
    buttons.push(['🔙 Taomlar Ro\'yxatiga']);

    await ctx.reply(message, {
        parse_mode: 'Markdown',
        ...Markup.keyboard(buttons).resize(),
    });
}

recipeScene.hears('➕ Ingredient Qo\'shish', async (ctx) => {
    const products = await WarehouseService.getAllProducts();
    if (products.length === 0) {
        await ctx.reply('Omborxonada mahsulot yo\'q. Avval mahsulot qo\'shing.');
        return;
    }

    const buttons: string[][] = products.map((p) => [`📦 ${p.name} (${p.unit})`]);
    buttons.push(['🔙 Retseptga Qaytish']);

    ctx.session.menuAction = 'select_ingredient';
    await ctx.reply('Ingredient tanlang:', Markup.keyboard(buttons).resize());
});

recipeScene.hears(/^📦 (.+) \((.+)\)$/, async (ctx) => {
    if (ctx.session.menuAction !== 'select_ingredient') return;
    const productName = ctx.match[1];
    const products = await WarehouseService.getAllProducts();
    const product = products.find(p => p.name === productName);
    if (!product) return;

    ctx.session.warehouseProductId = product.id;
    ctx.session.menuAction = 'add_recipe_qty';
    await ctx.reply('1 ta taom uchun kerak bo\'ladigan miqdorni kiriting (masalan: 1, 0.5, 10):', Markup.keyboard([['🔙 Bekor qilish']]).resize());
});

recipeScene.hears('🔙 Retseptga Qaytish', async (ctx) => {
    ctx.session.menuAction = undefined;
    if (ctx.session.menuItemId) {
        await showRecipeDetail(ctx, ctx.session.menuItemId);
    }
});

recipeScene.hears('🔙 Taomlar Ro\'yxatiga', async (ctx) => {
    ctx.session.menuAction = undefined;
    await ctx.scene.reenter();
});

recipeScene.hears('🔙 Menyu Boshqaruvi', async (ctx) => {
    ctx.session.menuAction = undefined;
    await ctx.scene.leave();
    await ctx.reply('🍔 *MENYU BOSHQARUVI*\n\nVariantni tanlang:', {
        parse_mode: 'Markdown',
        ...menuManagementKeyboard,
    });
});

recipeScene.hears(/^🗑️ (.+)$/, async (ctx) => {
    const prodName = ctx.match[1];
    if (!ctx.session.menuItemId) return;

    const item = await MenuService.getMenuItemById(ctx.session.menuItemId);
    if (!item) return;

    const recipe = item.recipes.find((r: any) => r.warehouseProduct.name === prodName);
    if (recipe) {
        await RecipeService.removeIngredient(ctx.session.menuItemId, (recipe as any).warehouseProductId);
        await ctx.reply(`✅ ${prodName} ingredienti o'chirildi.`);
    }
    await showRecipeDetail(ctx, ctx.session.menuItemId);
});

recipeScene.on('text', async (ctx) => {
    if (ctx.session.menuAction === 'add_recipe_qty') {
        const qty = parseFloat(ctx.message.text);
        if (isNaN(qty) || qty <= 0) {
            await ctx.reply('Iltimos, yaroqli musbat son kiriting:');
            return;
        }

        await RecipeService.addIngredient(ctx.session.menuItemId!, ctx.session.warehouseProductId!, qty);
        ctx.session.menuAction = undefined;
        await ctx.reply('✅ Ingredient qo\'shildi!');
        await showRecipeDetail(ctx, ctx.session.menuItemId!);
    }
});
