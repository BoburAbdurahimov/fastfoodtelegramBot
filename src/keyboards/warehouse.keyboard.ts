import { Markup } from 'telegraf';

export const warehouseMenuKeyboard = Markup.keyboard([
    ['📋 Barcha Mahsulotlar', '➕ Mahsulot Qo\'shish'],
    ['📥 Zaxira Qo\'shish', '📤 Zaxiradan Olish'],
    ['⚠️ Kam Qolganlar'],
    ['🔙 Bosh Menyu'],
]).resize();
