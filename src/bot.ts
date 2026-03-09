import { Telegraf, Scenes, session } from 'telegraf';
import { BotContext } from './types/context';
import { env } from './config/env';
import { authMiddleware, requireRole } from './middleware/auth';
import { errorHandlerMiddleware } from './middleware/error-handler';
import { rateLimiterMiddleware } from './middleware/rate-limiter';
import { NotificationService } from './services/notification.service';


// Scenes
import { mainMenuScene } from './scenes/main-menu';
import {
    warehouseListScene,
    warehouseAddScene,
    warehouseAddStockScene,
    warehouseRemoveStockScene,
} from './scenes/warehouse';
import { menuListScene, menuAddScene, categoryScene, recipeScene } from './scenes/menu';
import { orderListScene, orderNewScene } from './scenes/order';
import { expenseListScene, expenseAddScene, expenseSummaryScene } from './scenes/expense';
import {
    employeeListScene,
    employeeAddScene,
    attendanceScene,
    salaryReportScene,
    myAttendanceScene,
} from './scenes/employee';
import { statisticsScene } from './scenes/statistics';
import { chefOrdersScene, chefPreparingScene, chefBatchScene } from './scenes/chef';
import { waiterOrdersScene } from './scenes/waiter';
import { tableManageScene } from './scenes/table';

export function createBot(): Telegraf<BotContext> {
    const bot = new Telegraf<BotContext>(env.BOT_TOKEN);

    // Register all scenes
    const stage = new Scenes.Stage<BotContext>([
        mainMenuScene,
        warehouseListScene,
        warehouseAddScene,
        warehouseAddStockScene,
        warehouseRemoveStockScene,
        menuListScene,
        menuAddScene,
        categoryScene,
        recipeScene,
        orderListScene,
        orderNewScene,
        expenseListScene,
        expenseAddScene,
        expenseSummaryScene,
        employeeListScene,
        employeeAddScene,
        attendanceScene,
        salaryReportScene,
        myAttendanceScene,
        statisticsScene,
        chefOrdersScene,
        chefPreparingScene,
        chefBatchScene,
        waiterOrdersScene,
        tableManageScene,
    ]);

    // Middleware
    bot.use(session());
    bot.use(errorHandlerMiddleware());
    bot.use(rateLimiterMiddleware());
    bot.use(authMiddleware);
    bot.use(stage.middleware());

    // Init notification service
    NotificationService.init(bot);

    // ─── Commands ───
    bot.command('start', async (ctx) => {
        await ctx.scene.enter('main_menu');
    });

    bot.command('menu', async (ctx) => {
        await ctx.scene.enter('main_menu');
    });

    // ─── Main Menu Actions ───
    bot.hears('🔙 Bosh Menyu', async (ctx) => {
        await ctx.scene.enter('main_menu');
    });

    // Warehouse
    bot.hears('📦 Ombor', async (ctx) => {
        const { warehouseMenuKeyboard } = await import('./keyboards/warehouse.keyboard');
        await ctx.reply('📦 *OMBOR*\n\nVariantni tanlang:', {
            parse_mode: 'Markdown',
            ...warehouseMenuKeyboard,
        });
    });

    bot.hears('📋 Barcha Mahsulotlar', async (ctx) => {
        await ctx.scene.enter('warehouse_list');
    });

    bot.hears('➕ Mahsulot Qo\'shish', async (ctx) => {
        await ctx.scene.enter('warehouse_add');
    });

    bot.hears('📥 Zaxira Qo\'shish', async (ctx) => {
        await ctx.scene.enter('warehouse_add_stock');
    });

    bot.hears('📤 Zaxiradan Olish', async (ctx) => {
        await ctx.scene.enter('warehouse_remove_stock');
    });

    bot.hears('⚠️ Kam Qolganlar', async (ctx) => {
        const { WarehouseService } = await import('./services/warehouse.service');
        const products = await WarehouseService.getLowStockProducts();
        if (products.length === 0) {
            await ctx.reply('✅ Barcha zaxiralar me\'yorida!');
            return;
        }
        const lines = products.map(
            (p) => `⚠️ *${p.name}*: ${p.quantity} ${p.unit} (cheklov: ${p.lowStockThreshold})`
        );
        await ctx.reply(`⚠️ *KAM QOLGAN MAHSULOTLAR*\n\n${lines.join('\n')}`, {
            parse_mode: 'Markdown',
            ...((await import('./keyboards/warehouse.keyboard')).warehouseMenuKeyboard),
        });
    });

    // Menu Management
    bot.hears('🍔 Menyu', async (ctx) => {
        const { menuManagementKeyboard } = await import('./keyboards/menu.keyboard');
        await ctx.reply('🍔 *MENYU*\n\nVariantni tanlang:', {
            parse_mode: 'Markdown',
            ...menuManagementKeyboard,
        });
    });

    bot.hears('📋 Barcha Taomlar', async (ctx) => {
        await ctx.scene.enter('menu_list');
    });

    bot.hears('➕ Taom Qo\'shish', async (ctx) => {
        await ctx.scene.enter('menu_add');
    });

    bot.hears('📂 Kategoriyalar', async (ctx) => {
        await ctx.scene.enter('category_manage');
    });

    bot.hears('🧪 Retseptlarni Boshqarish', async (ctx) => {
        await ctx.scene.enter('recipe_manage');
    });

    // Orders
    bot.hears('📋 Buyurtmalar', async (ctx) => {
        const { orderMenuKeyboard } = await import('./keyboards/order.keyboard');
        await ctx.reply('📋 *BUYURTMALAR*\n\nVariantni tanlang:', {
            parse_mode: 'Markdown',
            ...orderMenuKeyboard,
        });
    });

    bot.hears('📋 Barcha Buyurtmalar', async (ctx) => {
        await ctx.scene.enter('order_list');
    });

    bot.hears('🆕 Yangi Buyurtma', async (ctx) => {
        await ctx.scene.enter('order_new');
    });

    bot.hears('📋 Bugungi Buyurtmalar', async (ctx) => {
        await ctx.scene.enter('order_list');
    });

    // Expenses (Employer only)
    bot.hears('💸 Xarajatlar', requireRole('EMPLOYER'), async (ctx) => {
        const { expenseMenuKeyboard } = await import('./keyboards/expense.keyboard');
        await ctx.reply('💸 *XARAJATLAR*\n\nVariantni tanlang:', {
            parse_mode: 'Markdown',
            ...expenseMenuKeyboard,
        });
    });

    bot.hears('📋 Barcha Xarajatlar', async (ctx) => {
        await ctx.scene.enter('expense_list');
    });

    bot.hears('➕ Xarajat Qo\'shish', async (ctx) => {
        await ctx.scene.enter('expense_add');
    });

    bot.hears('📊 Hisobot', async (ctx) => {
        await ctx.scene.enter('expense_summary');
    });

    // Employees (Employer only)
    bot.hears('👥 Xodimlar', requireRole('EMPLOYER'), async (ctx) => {
        const { employeeMenuKeyboard } = await import('./keyboards/employee.keyboard');
        await ctx.reply('👥 *XODIMLAR*\n\nVariantni tanlang:', {
            parse_mode: 'Markdown',
            ...employeeMenuKeyboard,
        });
    });

    bot.hears('📋 Barcha Xodimlar', async (ctx) => {
        await ctx.scene.enter('employee_list');
    });

    bot.hears('➕ Xodim Qo\'shish', async (ctx) => {
        await ctx.scene.enter('employee_add');
    });

    bot.hears('📅 Davomat', async (ctx) => {
        await ctx.scene.enter('attendance');
    });

    bot.hears('💰 Maosh Hisoboti', async (ctx) => {
        await ctx.scene.enter('salary_report');
    });

    // My Attendance (Employee)
    bot.hears('📅 Mening Davomatim', async (ctx) => {
        await ctx.scene.enter('my_attendance');
    });

    // Statistics (Employer only)
    bot.hears('📊 Statistika', requireRole('EMPLOYER'), async (ctx) => {
        await ctx.scene.enter('statistics');
    });

    // Settings
    bot.hears('⚙️ Sozlamalar', requireRole('EMPLOYER'), async (ctx) => {
        await ctx.reply(
            '⚙️ *SOZLAMALAR*\n\n• Bot ishlamoqda\n• Ma\'lumotlar bazasi ulangan\n• Barcha tizimlar joyida',
            {
                parse_mode: 'Markdown',
                ...require('telegraf').Markup.keyboard([
                    ['🔙 Bosh Menyu'],
                ]).resize(),
            }
        );
    });

    // Tables
    bot.hears('🪑 Stollar', requireRole('EMPLOYER'), async (ctx) => {
        await ctx.scene.enter('table_manage');
    });

    // Chef: View NEW orders
    bot.hears('🔔 Yangi Buyurtmalar', requireRole('CHEF'), async (ctx) => {
        await ctx.scene.enter('chef_orders');
    });

    // Chef: Batch preparations
    bot.hears('🥘 Tayyorlash (Katta hajmda)', requireRole('CHEF'), async (ctx) => {
        await ctx.scene.enter('chef_batch');
    });

    // View Tracked Stock
    bot.hears('🥘 Ovqat qoldig\'i', async (ctx) => {
        const { MenuService } = await import('./services/menu.service');
        const items = await MenuService.getAllMenuItems();
        const tracked = items.filter((i: any) => i.isTracked);

        if (tracked.length === 0) {
            return ctx.reply('✅ Hozircha maxsus kuzatiladigan taomlar (Ovqat qoldig\'i) qo\'shilmagan.');
        }

        const lines = tracked.map((i: any) => {
            let status = `📦 Qoldiq: ${i.stockQuantity} ta`;
            if (i.isPreparing) {
                status += ` | ⏳ Tayyorlanmoqda: ${i.prepWaitTime ? i.prepWaitTime + ' daqiqa' : 'Noma\'lum'}`;
            }
            return `🥘 *${i.name}*\n   ${status}`;
        });

        await ctx.reply(`📊 *OVQAT QOLDIG'I*\n\n${lines.join('\n\n')}`, { parse_mode: 'Markdown' });
    });

    // Chef: View PREPARING orders
    bot.hears('🔥 Tayyorlanayotgan', requireRole('CHEF'), async (ctx) => {
        await ctx.scene.enter('chef_preparing');
    });

    // Waiter: View my orders
    bot.hears('📋 Mening Buyurtmalarim', requireRole('WAITER'), async (ctx) => {
        await ctx.scene.enter('waiter_orders');
    });

    return bot;
}
