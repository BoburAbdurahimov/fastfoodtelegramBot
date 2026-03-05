import { Markup } from 'telegraf';
import { Role } from '../middleware/auth';

export function getMainMenuKeyboard(role: Role) {
    if (role === Role.EMPLOYER) {
        return Markup.keyboard([
            ['\ud83d\udccb Buyurtmalar'],
            ['\ud83d\udce6 Ombor', '\ud83c\udf54 Menyu'],
            ['\ud83d\udc65 Xodimlar', '\ud83d\udcb8 Xarajatlar'],
            ['\ud83d\udcca Statistika', '\ud83e\ude91 Stollar'],
            ['\u2699\ufe0f Sozlamalar'],
        ]).resize();
    }

    if (role === Role.WAITER) {
        return Markup.keyboard([
            ['🆕 Yangi Buyurtma'],
            ['📋 Mening Buyurtmalarim'],
            ['📅 Mening Davomatim'],
        ]).resize();
    }

    if (role === Role.CHEF) {
        return Markup.keyboard([
            ['🔔 Yangi Buyurtmalar'],
            ['🔥 Tayyorlanayotgan'],
            ['📅 Mening Davomatim'],
        ]).resize();
    }

    // Default employee menu
    return Markup.keyboard([
        ['🆕 Yangi Buyurtma'],
        ['📋 Buyurtmalar', '📦 Ombor'],
        ['📅 Mening Davomatim'],
    ]).resize();
}

export function getMainMenuText(name: string, role: Role): string {
    const roleNames: Record<string, string> = {
        EMPLOYER: '👑 Egasi',
        WAITER: '🧑‍🍳 Ofitsiant',
        CHEF: '👨‍🍳 Oshpaz',
        EMPLOYEE: '👤 Xodim',
    };
    const emoji = role === Role.EMPLOYER ? '👑' : role === Role.WAITER ? '🧑‍🍳' : role === Role.CHEF ? '👨‍🍳' : '👤';
    return `${emoji} Xush kelibsiz, *${name}*!\n\nRol: *${roleNames[role] || role}*\n\nVariantni tanlang:`;
}
