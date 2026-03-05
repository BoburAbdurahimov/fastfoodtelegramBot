import prisma from '../config/prisma';

const tableModel = (prisma as any).table;

export class TableService {
    static async getAllTables(onlyActive = true) {
        return tableModel.findMany({
            where: onlyActive ? { isActive: true } : {},
            orderBy: { number: 'asc' },
        });
    }

    static async addTable(number: number, name?: string) {
        const existing = await tableModel.findUnique({ where: { number } });
        if (existing) {
            if (!existing.isActive) {
                return tableModel.update({
                    where: { id: existing.id },
                    data: { isActive: true, name: name || existing.name },
                });
            }
            throw new Error(`${number}-stol allaqachon mavjud`);
        }
        return tableModel.create({
            data: { number, name: name || `Stol ${number}` },
        });
    }

    static async removeTable(number: number) {
        const table = await tableModel.findUnique({ where: { number } });
        if (!table) throw new Error('Stol topilmadi');
        return tableModel.update({
            where: { id: table.id },
            data: { isActive: false },
        });
    }

    static async getTableByNumber(number: number) {
        return tableModel.findFirst({
            where: { number, isActive: true },
        });
    }
}

