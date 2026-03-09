import { Scenes, Markup } from 'telegraf';
import { BotContext } from '../../types/context';
import { MenuService } from '../../services/menu.service';

export const chefBatchScene = new Scenes.WizardScene<BotContext>(
    'chef_batch',
    async (ctx) => {
        const items = await MenuService.getAllMenuItems();
        const tracked = items.filter((i: any) => i.isTracked);

        if (tracked.length === 0) {
            await ctx.reply('✅ Hozircha maxsus kuzatiladigan taomlar (Ovqat qoldig\'i) yo\'q.', Markup.keyboard([
                ['🔙 Bosh Menyu'],
            ]).resize());
            return ctx.scene.leave();
        }

        const lines = tracked.map((i: any) => {
            let status = `📦 Qoldiq: ${i.stockQuantity} ta`;
            if (i.isPreparing) {
                status += ` | ⏳ Tayyorlanmoqda: ${i.prepWaitTime ? i.prepWaitTime + ' daqiqa' : 'Noma\'lum'}`;
            }
            return `🥘 *${i.name}* (ID: ${i.id})\n   ${status}`;
        });

        const buttons: string[][] = tracked.map((i: any) => [`🥘 Tayyorlash #${i.id}`]);
        buttons.push(['🔙 Bosh Menyu']);

        await ctx.reply(`🥘 *KATTA HAJMDA TAYYORLASH*\n\nTaomni tanlang:\n\n${lines.join('\n\n')}`, {
            parse_mode: 'Markdown',
            ...Markup.keyboard(buttons).resize(),
        });
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) return;
        const text = ctx.message.text.trim();

        if (text === '🔙 Bosh Menyu') {
            await ctx.scene.enter('main_menu');
            return;
        }

        const match = text.match(/^🥘 Tayyorlash #(\d+)$/);
        if (!match) {
            await ctx.reply('Iltimos, tugmalardan birini tanlang.');
            return;
        }

        const id = parseInt(match[1]);
        ctx.session.menuItemId = id;

        await ctx.reply('Nima harakat bajaramiz?', Markup.keyboard([
            ['⏳ Kutish vaqtini belgilash'],
            ['✅ Tayyor bo\'ldi (Omborga qo\'shish)'],
            ['🔙 Orqaga'],
        ]).resize());
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) return;
        const text = ctx.message.text.trim();

        if (text === '🔙 Orqaga') {
            return ctx.scene.enter('chef_batch');
        }

        if (text === '⏳ Kutish vaqtini belgilash') {
            await ctx.reply('Necha daqiqa kutish kerak? (Faqat raqam kiriting)', Markup.removeKeyboard());
            ctx.session.batchAction = 'WAIT_TIME';
            return ctx.wizard.next();
        }

        if (text === '✅ Tayyor bo\'ldi (Omborga qo\'shish)') {
            await ctx.reply('Necha porsiya (ta) tayyor bo\'ldi?', Markup.removeKeyboard());
            ctx.session.batchAction = 'FINISH';
            return ctx.wizard.next();
        }

        await ctx.reply('Noto\'g\'ri tanlov.');
    },
    async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) return;
        const text = ctx.message.text.trim();

        if (text === '🔙 Orqaga' || text === '🔙 Bosh Menyu') {
            return ctx.scene.enter('chef_batch');
        }

        const amount = parseInt(text);
        if (isNaN(amount) || amount <= 0) {
            await ctx.reply('Iltimos, to\'g\'ri raqam kiriting.');
            return;
        }

        const itemId = ctx.session.menuItemId!;

        try {
            if (ctx.session.batchAction === 'WAIT_TIME') {
                await MenuService.setPreparingStatus(itemId, true, amount);
                await ctx.reply(`✅ Kutish vaqti ${amount} daqiqa etib belgilandi.`);
            } else if (ctx.session.batchAction === 'FINISH') {
                await MenuService.finishBatch(itemId, amount, ctx.dbUser!.id);
                await ctx.reply(`✅ ${amount} ta porsiya qoldiqqa qo'shildi! Xom ashyo ombordan yechildi.`);
            }
        } catch (e: any) {
            await ctx.reply(`❌ Xatolik: ${e.message}`);
        }

        return ctx.scene.enter('chef_batch');
    }
);
