import { Scenes, Markup } from 'telegraf';
import { BotContext } from '../../types/context';
import { TableService } from '../../services/table.service';

export const tableManageScene = new Scenes.BaseScene<BotContext>('table_manage');

tableManageScene.enter(async (ctx) => {
    await showTables(ctx);
});

async function showTables(ctx: BotContext) {
    const tables = await TableService.getAllTables();

    const lines = tables.length > 0
        ? tables.map((t: any) => `\ud83e\ude91 *Stol ${t.number}*${t.name && t.name !== `Stol ${t.number}` ? ` \u2014 ${t.name}` : ''}`).join('\n')
        : 'Stollar hali qo\'shilmagan.';

    const buttons: string[][] = [
        ['➕ Stol Qo\'shish'],
    ];

    if (tables.length > 0) {
        // Show tables to remove
        for (const t of tables) {
            buttons.push([`🗑️ Stol ${t.number}`]);
        }
    }

    buttons.push(['🔙 Bosh Menyu']);

    await ctx.reply(`🪑 *STOLLAR BOSHQARUVI*\n\nJami: ${tables.length} ta stol\n\n${lines}`, {
        parse_mode: 'Markdown',
        ...Markup.keyboard(buttons).resize(),
    });
}

tableManageScene.hears('➕ Stol Qo\'shish', async (ctx) => {
    ctx.session.menuAction = 'add_table';
    await ctx.reply('Yangi stol raqamini kiriting (masalan: 1, 2, 3...):', Markup.keyboard([['🔙 Bekor qilish']]).resize());
});

tableManageScene.hears(/^🗑️ Stol (\d+)$/, async (ctx) => {
    const tableNum = parseInt(ctx.match[1]);
    try {
        await TableService.removeTable(tableNum);
        await ctx.reply(`✅ Stol ${tableNum} o'chirildi.`);
    } catch (err: any) {
        await ctx.reply(`❌ ${err.message}`);
    }
    await showTables(ctx);
});

tableManageScene.hears('🔙 Bekor qilish', async (ctx) => {
    ctx.session.menuAction = undefined;
    await showTables(ctx);
});

tableManageScene.hears('🔙 Bosh Menyu', async (ctx) => {
    ctx.session.menuAction = undefined;
    await ctx.scene.enter('main_menu');
});

tableManageScene.on('text', async (ctx) => {
    if (ctx.session.menuAction === 'add_table') {
        const num = parseInt(ctx.message.text.trim());
        if (isNaN(num) || num <= 0) {
            await ctx.reply('Iltimos, yaroqli musbat son kiriting:');
            return;
        }
        try {
            await TableService.addTable(num);
            ctx.session.menuAction = undefined;
            await ctx.reply(`✅ Stol ${num} qo'shildi!`);
            await showTables(ctx);
        } catch (err: any) {
            await ctx.reply(`❌ ${err.message}`);
        }
    }
});
