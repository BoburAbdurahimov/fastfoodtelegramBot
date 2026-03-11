import { Markup } from 'telegraf';
import { Role } from '../middleware/auth';

export function getMainMenuKeyboard(role: Role) {
    // All roles now only see the Mini App button as requested
    return Markup.keyboard([
        ['📱 Mini App']
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
