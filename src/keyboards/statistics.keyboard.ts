import { Markup } from 'telegraf';

export const statisticsMenuKeyboard = Markup.keyboard([
    ['📊 Bugun', '📊 Shu Hafta'],
    ['📊 Shu Oy', '📊 Shu Yil'],
    ['📅 Boshqa Sana', '📥 CSV formatda yuklash'],
    ['🔙 Bosh Menyu'],
]).resize();
