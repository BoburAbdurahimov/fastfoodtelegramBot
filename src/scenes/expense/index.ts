import { Scenes, Markup } from 'telegraf';
import { BotContext } from '../../types/context';
import { ExpenseService } from '../../services/expense.service';
import { expenseMenuKeyboard } from '../../keyboards/expense.keyboard';
import { formatCurrency } from '../../utils/format';
import { getThisMonth, formatDate } from '../../utils/date-helpers';

// ─── Expense List Scene ───
export const expenseListScene = new Scenes.BaseScene<BotContext>('expense_list');

expenseListScene.enter(async (ctx) => {
    const expenses = await ExpenseService.getAllExpenses({ limit: 20 });
    if (expenses.length === 0) {
        await ctx.reply('\ud83d\udcb8 Xarajatlar topilmadi.', expenseMenuKeyboard);
        return ctx.scene.leave();
    }

    const lines = expenses.map(
        (e) => `\ud83d\udcb8 *${e.type}* \u2014 ${formatCurrency(e.amount)} UZS\n   \ud83d\udcc5 ${formatDate(e.date)}${e.recurring ? ' \ud83d\udd04' : ''}${e.description ? `\n   \ud83d\udcdd ${e.description}` : ''}`
    );

    const buttons: string[][] = [];
    let row: string[] = [];

    expenses.forEach((e) => {
        row.push(`\ud83d\udde1\ufe0f O'chirish #${e.id}`);
        if (row.length === 2) {
            buttons.push(row);
            row = [];
        }
    });
    if (row.length > 0) buttons.push(row);

    buttons.push(['\ud83d\udd19 Orqaga']);

    await ctx.reply(`\ud83d\udcb8 *XARAJATLAR*\n\n${lines.join('\n\n')}`, {
        parse_mode: 'Markdown',
        ...Markup.keyboard(buttons).resize(),
    });
});

expenseListScene.hears(/^🗑️ O'chirish #(\d+)$/, async (ctx) => {
    try {
        await ExpenseService.deleteExpense(parseInt(ctx.match[1]), ctx.dbUser!.id);
        await ctx.reply('\u2705 O\'chirildi');
    } catch (err: any) {
        await ctx.reply(`\u274c Xatolik: ${err.message}`);
    }
    await ctx.scene.reenter();
});

expenseListScene.hears('\ud83d\udd19 Orqaga', async (ctx) => {
    await ctx.reply('Bosh menyu', expenseMenuKeyboard);
    await ctx.scene.leave();
});

// \u2500\u2500\u2500 Add Expense Scene \u2500\u2500\u2500
export const expenseAddScene = new Scenes.WizardScene<BotContext>(
    'expense_add',
    async (ctx) => {
        await ctx.reply('\ud83d\udcb8 *Yangi Xarajat*\n\nTurini tanlang:', {
            parse_mode: 'Markdown',
            ...Markup.keyboard([
                ['\ud83c\udfe0 Ijara', '\ud83d\udca1 Kommunal'],
                ['\ud83d\udcb0 Maosh', '\ud83d\udce2 Reklama'],
                ['\ud83d\udce6 Boshqa'],
                ['\ud83d\udd19 Bekor qilish'],
            ]).resize(),
        });
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) return;
        const text = ctx.message.text.trim();

        if (text === '\ud83d\udd19 Bekor qilish') {
            await ctx.reply('Bekor qilindi.', expenseMenuKeyboard);
            return ctx.scene.leave();
        }

        // Remove emoji prefix
        (ctx.wizard.state as any).type = text.replace(/^[^\s]+\s+/, '');
        await ctx.reply('Summani kiriting (raqamda):', Markup.keyboard([['\ud83d\udd19 Bekor qilish']]).resize());
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) return;
        const text = ctx.message.text.trim();
        if (text === '\ud83d\udd19 Bekor qilish') {
            await ctx.reply('Bekor qilindi.', expenseMenuKeyboard);
            return ctx.scene.leave();
        }

        const amount = parseFloat(text);
        if (isNaN(amount) || amount <= 0) { await ctx.reply('Iltimos, yaroqli summa kiriting:'); return; }
        (ctx.wizard.state as any).amount = amount;
        await ctx.reply('Izoh kiriting:', Markup.keyboard([
            ['\u23ed O\'tkazib yuborish'],
            ['\ud83d\udd19 Bekor qilish']
        ]).resize());
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) return;
        const text = ctx.message.text.trim();
        if (text === '\ud83d\udd19 Bekor qilish') {
            await ctx.reply('Bekor qilindi.', expenseMenuKeyboard);
            return ctx.scene.leave();
        }

        (ctx.wizard.state as any).description = text === '\u23ed O\'tkazib yuborish' ? null : text;
        await ctx.reply('Bu xarajat doimiymi (har oy takrorlanadimi)?', Markup.keyboard([
            ['\u2705 Ha', '\u274c Yo\'q'],
            ['\ud83d\udd19 Bekor qilish']
        ]).resize());
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) return;
        const text = ctx.message.text.trim();
        if (text === '\ud83d\udd19 Bekor qilish') {
            await ctx.reply('Bekor qilindi.', expenseMenuKeyboard);
            return ctx.scene.leave();
        }

        const isRecurring = text === '\u2705 Ha';

        try {
            const s = ctx.wizard.state as any;
            const expense = await ExpenseService.createExpense({
                type: s.type, amount: s.amount, date: new Date(),
                recurring: isRecurring,
                description: s.description, userId: ctx.dbUser!.id,
            });
            await ctx.reply(`\u2705 Xarajat: *${expense.type}* ${formatCurrency(expense.amount)} UZS qabul qilindi`, { parse_mode: 'Markdown', ...expenseMenuKeyboard });
            return ctx.scene.leave();
        } catch (err: any) {
            await ctx.reply(`\u274c Xatolik: ${err.message}`, expenseMenuKeyboard);
            return ctx.scene.leave();
        }
    }
);

// ─── Summary Scene ───
export const expenseSummaryScene = new Scenes.BaseScene<BotContext>('expense_summary');

expenseSummaryScene.enter(async (ctx) => {
    const { from, to } = getThisMonth();
    const total = await ExpenseService.getTotalExpenses(from, to);
    const byType = await ExpenseService.getExpensesByType(from, to);
    const lines = byType.map((t) => `  \u2022 ${t.type}: ${formatCurrency(t._sum.amount || 0)} UZS`);
    await ctx.reply(
        `\ud83d\udcca *XARAJATLAR HISOBOTI (Shu oy)*\n\n\ud83d\udcb0 Jami: ${formatCurrency(total)} UZS\n\n${lines.join('\n') || 'Xarajatlar topilmadi'}`,
        { parse_mode: 'Markdown', ...expenseMenuKeyboard }
    );
    return ctx.scene.leave();
});
