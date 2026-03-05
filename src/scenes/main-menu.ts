import { Scenes, Markup } from 'telegraf';
import { BotContext } from '../types/context';
import { getMainMenuKeyboard, getMainMenuText } from '../keyboards/main-menu.keyboard';
import { Role } from '../middleware/auth';

export const mainMenuScene = new Scenes.BaseScene<BotContext>('main_menu');

mainMenuScene.enter(async (ctx) => {
    if (!ctx.dbUser) return;
    const text = getMainMenuText(ctx.dbUser.name, ctx.dbUser.role as Role);
    const keyboard = getMainMenuKeyboard(ctx.dbUser.role as Role);

    await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
});
