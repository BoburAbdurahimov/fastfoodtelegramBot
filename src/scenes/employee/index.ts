import { Scenes, Markup } from 'telegraf';
import { BotContext } from '../../types/context';
import { EmployeeService, AttendanceService } from '../../services/employee.service';
import { employeeMenuKeyboard } from '../../keyboards/employee.keyboard';
import { formatCurrency } from '../../utils/format';

// ─── Employee List Scene ───
export const employeeListScene = new Scenes.BaseScene<BotContext>('employee_list');

employeeListScene.enter(async (ctx) => {
    const employees = await EmployeeService.getAllEmployees();
    if (employees.length === 0) {
        await ctx.reply('👥 Xodimlar topilmadi.', employeeMenuKeyboard);
        return ctx.scene.leave();
    }

    const lines = employees.map(
        (e) => `👤 *${e.name}*\n   📱 TG ID: ${e.telegramId}\n   💰 Maosh: ${formatCurrency(e.salary)} UZS\n   ${e.isActive ? '🟢 Faol' : '🔴 Nofaol'}`
    );

    const buttons: string[][] = [];
    let row: string[] = [];
    employees.forEach((e) => {
        row.push(`\ud83d\udcdd ${e.name}`);
        if (row.length === 2) {
            buttons.push(row);
            row = [];
        }
    });
    if (row.length > 0) buttons.push(row);
    buttons.push(['\ud83d\udd19 Orqaga']);

    await ctx.reply(`\ud83d\udc65 *XODIMLAR*\n\n${lines.join('\n\n')}`, {
        parse_mode: 'Markdown',
        ...Markup.keyboard(buttons).resize(),
    });
});

employeeListScene.hears(/^\ud83d\udcdd (.+)$/, async (ctx) => {
    const name = ctx.match[1].trim();
    const employees = await EmployeeService.getAllEmployees();
    const emp = employees.find(e => e.name === name);
    if (!emp) { await ctx.reply('Topilmadi'); return; }

    ctx.session.employeeData = { telegramId: emp.id.toString() }; // Storing employee PK ID in telegramId session field for temporary use

    await ctx.reply(
        `\ud83d\udc64 *${emp.name}*\n\ud83d\udcf1 TG: ${emp.telegramId}\n\ud83d\udcb0 Maosh: ${formatCurrency(emp.salary)} UZS\n${emp.isActive ? '\ud83d\udfe2 Faol' : '\ud83d\udd34 Nofaol'}`, {
        parse_mode: 'Markdown',
        ...Markup.keyboard([
            ['\ud83d\udcb0 Maosh belgilash'],
            ['\ud83d\udde1\ufe0f O\'chirish'],
            ['\ud83d\udd19 Orqaga'],
        ]).resize(),
    }
    );
});

employeeListScene.hears('\ud83d\udde1\ufe0f O\'chirish', async (ctx) => {
    const empId = parseInt(ctx.session.employeeData?.telegramId || '0');
    if (!empId) return;
    try {
        await EmployeeService.removeEmployee(empId, ctx.dbUser!.id);
        await ctx.reply('\u2705 O\'chirildi');
    } catch (err: any) {
        await ctx.reply(`\u274c Xatolik: ${err.message}`);
    }
    ctx.session.employeeData = undefined;
    await ctx.scene.reenter();
});

employeeListScene.hears('\ud83d\udcb0 Maosh belgilash', async (ctx) => {
    if (!ctx.session.employeeData?.telegramId) return;
    ctx.session.menuAction = 'set_salary';
    await ctx.reply('Yangi oylik maoshni kiriting (UZS):', Markup.keyboard([['\ud83d\udd19 Orqaga']]).resize());
});

employeeListScene.hears(/^\d+\.?\d*$/, async (ctx) => {
    if (ctx.session.menuAction === 'set_salary') {
        const salary = parseFloat(ctx.message.text);
        if (isNaN(salary) || salary < 0) { await ctx.reply('Noto\'g\'ri summa.'); return; }
        const empId = parseInt(ctx.session.employeeData?.telegramId || '0');
        await EmployeeService.updateSalary(empId, salary, ctx.dbUser!.id);
        ctx.session.menuAction = undefined;
        await ctx.reply(`✅ Maosh yangilandi: ${formatCurrency(salary)} UZS`);
        await ctx.scene.reenter();
    }
});

employeeListScene.hears('\ud83d\udd19 Orqaga', async (ctx) => {
    if (ctx.session.menuAction === 'set_salary' || ctx.session.employeeData) {
        ctx.session.menuAction = undefined;
        ctx.session.employeeData = undefined;
        await ctx.scene.reenter();
        return;
    }
    await ctx.reply('Bosh menyu', employeeMenuKeyboard);
    await ctx.scene.leave();
});

// ─── Add Employee Scene ───
export const employeeAddScene = new Scenes.WizardScene<BotContext>(
    'employee_add',
    async (ctx) => {
        await ctx.reply('👤 *Xodim Qo\'shish*\n\nXodimning Telegram username\'ini kiriting (masalan: @ism):', {
            parse_mode: 'Markdown',
            ...Markup.keyboard([['🔙 Bekor qilish']]).resize()
        });
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) return;
        if (ctx.message.text === '🔙 Bekor qilish') {
            await ctx.reply('Bekor qilindi.', employeeMenuKeyboard);
            return ctx.scene.leave();
        }
        let username = ctx.message.text.trim();
        if (username.startsWith('@')) username = username.substring(1);
        if (!username) { await ctx.reply('Noto\'g\'ri username. Qaytadan kiriting:'); return; }
        (ctx.wizard.state as any).username = username;
        await ctx.reply('Xodim ismini kiriting:');
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) return;
        if (ctx.message.text === '🔙 Bekor qilish') {
            await ctx.reply('Bekor qilindi.', employeeMenuKeyboard);
            return ctx.scene.leave();
        }
        (ctx.wizard.state as any).name = ctx.message.text.trim();
        await ctx.reply('Rolni tanlang:', Markup.keyboard([
            ['🧑‍🍳 Ofitsiant', '👨‍🍳 Oshpaz'],
            ['👤 Xodim', '🔙 Bekor qilish'],
        ]).resize());
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) return;
        if (ctx.message.text === '🔙 Bekor qilish') {
            await ctx.reply('Bekor qilindi.', employeeMenuKeyboard);
            return ctx.scene.leave();
        }
        const roleMap: Record<string, string> = {
            '🧑‍🍳 Ofitsiant': 'WAITER',
            '👨‍🍳 Oshpaz': 'CHEF',
            '👤 Xodim': 'EMPLOYEE',
        };
        const role = roleMap[ctx.message.text];
        if (!role) { await ctx.reply('Iltimos, tugmalardan tanlang:'); return; }
        (ctx.wizard.state as any).role = role;
        await ctx.reply('Oylik maoshni kiriting (UZS):', Markup.keyboard([['🔙 Bekor qilish']]).resize());
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) return;
        if (ctx.message.text === '🔙 Bekor qilish') {
            await ctx.reply('Bekor qilindi.', employeeMenuKeyboard);
            return ctx.scene.leave();
        }
        const salary = parseFloat(ctx.message.text);
        if (isNaN(salary) || salary < 0) { await ctx.reply('Noto\'g\'ri summa.'); return; }
        const s = ctx.wizard.state as any;
        s.salary = salary;
        try {
            const emp = await EmployeeService.addEmployee(
                { telegramId: BigInt(0), name: s.name, salary, username: s.username, role: s.role },
                ctx.dbUser!.id
            );
            const roleNames: Record<string, string> = { WAITER: 'Ofitsiant', CHEF: 'Oshpaz', EMPLOYEE: 'Xodim' };
            await ctx.reply(`✅ Xodim *${emp.name}* qo'shildi!\n👤 Rol: ${roleNames[s.role] || s.role}\n💰 Maosh: ${formatCurrency(s.salary)} UZS\n\nℹ️ Xodim @${s.username} botga /start yozganda avtomatik ro'yxatga olinadi.`, {
                parse_mode: 'Markdown', ...employeeMenuKeyboard,
            });
        } catch (err: any) {
            await ctx.reply(`❌ ${err.message}`, employeeMenuKeyboard);
        }
        return ctx.scene.leave();
    }
);

// ─── Attendance Scene ───
export const attendanceScene = new Scenes.BaseScene<BotContext>('attendance');

attendanceScene.enter(async (ctx) => {
    const employees = await EmployeeService.getAllEmployees();
    if (employees.length === 0) {
        await ctx.reply('Xodimlar yo\'q.', employeeMenuKeyboard);
        return ctx.scene.leave();
    }

    const today = await AttendanceService.getTodayAttendance();
    const presentIds = new Set(today.filter((a) => a.present).map((a) => a.userId));

    const buttons: string[][] = [];
    let row: string[] = [];
    employees.forEach((e) => {
        row.push(`${presentIds.has(e.id) ? '\u2705' : '\u2b1c'} ${e.name}`);
        if (row.length === 2) {
            buttons.push(row);
            row = [];
        }
    });
    if (row.length > 0) buttons.push(row);

    buttons.push(['\ud83d\udd19 Orqaga']);

    await ctx.reply('\ud83d\udcc5 *BUGUNGI DAVOMAT*\n\nO\'zgartirish uchun ismini bosing:', {
        parse_mode: 'Markdown',
        ...Markup.keyboard(buttons).resize(),
    });
});

attendanceScene.hears(/^(?:\u2705|\u2b1c) (.+)$/, async (ctx) => {
    const name = ctx.match[1].trim();
    const employees = await EmployeeService.getAllEmployees();
    const emp = employees.find(e => e.name === name);
    if (!emp) return;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const existing = await AttendanceService.getAttendance(emp.id, today, today);
    const currentlyPresent = existing.length > 0 && existing[0].present;
    await AttendanceService.markAttendance(emp.id, today, !currentlyPresent);

    await ctx.scene.reenter();
});

attendanceScene.hears('\ud83d\udd19 Orqaga', async (ctx) => {
    await ctx.reply('Bosh menyu', employeeMenuKeyboard);
    await ctx.scene.leave();
});

// ─── Salary Report Scene ───
export const salaryReportScene = new Scenes.BaseScene<BotContext>('salary_report');

salaryReportScene.enter(async (ctx) => {
    const employees = await EmployeeService.getAllEmployees();
    const now = new Date();
    const reports = await Promise.all(
        employees.map((e) => AttendanceService.calculateSalary(e.id, now.getMonth() + 1, now.getFullYear()))
    );

    const lines = reports.map(
        (r) => `👤 *${r.employee.name}*\n   📅 Ish kunlari: ${r.workingDays}/${r.totalDaysInMonth}\n   💰 Asosiy maosh: ${formatCurrency(r.employee.salary)} UZS\n   💵 Hisoblangan: ${formatCurrency(r.calculatedSalary)} UZS`
    );

    await ctx.reply(`💰 *MAOSH HISOBOTI*\n📅 ${now.toLocaleString('uz-UZ', { month: 'long', year: 'numeric' })}\n\n${lines.join('\n\n')}`, {
        parse_mode: 'Markdown', ...employeeMenuKeyboard,
    });
    return ctx.scene.leave();
});

// ─── My Attendance Scene (for employees) ───
export const myAttendanceScene = new Scenes.BaseScene<BotContext>('my_attendance');

myAttendanceScene.enter(async (ctx) => {
    if (!ctx.dbUser) return ctx.scene.leave();
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const records = await AttendanceService.getAttendance(ctx.dbUser.id, from, to);
    const presentDays = records.filter((r) => r.present).length;

    const lines = records.map(
        (r) => `${r.present ? '✅' : '❌'} ${r.date.toLocaleDateString()}`
    );

    await ctx.reply(
        `📅 *MENING DAVOMATIM*\n📅 ${now.toLocaleString('uz-UZ', { month: 'long' })}\n\n✅ Kelgan: ${presentDays} kun\n❌ Kelmagan: ${records.length - presentDays} kun\n\n${lines.join('\n')}`,
        { parse_mode: 'Markdown' }
    );
    return ctx.scene.leave();
});
