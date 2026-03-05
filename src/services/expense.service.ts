import prisma from '../config/prisma';
import { AuditService } from '../middleware/audit';

export class ExpenseService {
    static async getAllExpenses(options: {
        from?: Date;
        to?: Date;
        type?: string;
        limit?: number;
        offset?: number;
    }) {
        const { from, to, type, limit = 20, offset = 0 } = options;

        return prisma.expense.findMany({
            where: {
                deletedAt: null,
                ...(type ? { type } : {}),
                ...(from || to
                    ? {
                        date: {
                            ...(from ? { gte: from } : {}),
                            ...(to ? { lte: to } : {}),
                        },
                    }
                    : {}),
            },
            include: { user: { select: { name: true } } },
            orderBy: { date: 'desc' },
            take: limit,
            skip: offset,
        });
    }

    static async createExpense(data: {
        type: string;
        amount: number;
        date: Date;
        recurring: boolean;
        description?: string;
        userId: number;
    }) {
        const expense = await prisma.expense.create({ data });

        await AuditService.log(data.userId, 'CREATE_EXPENSE', 'Expense', expense.id, {
            type: data.type,
            amount: data.amount,
        });

        return expense;
    }

    static async deleteExpense(id: number, userId: number) {
        const expense = await prisma.expense.update({
            where: { id },
            data: { deletedAt: new Date() },
        });

        await AuditService.log(userId, 'DELETE_EXPENSE', 'Expense', id);

        return expense;
    }

    static async getTotalExpenses(from: Date, to: Date): Promise<number> {
        const result = await prisma.expense.aggregate({
            where: {
                deletedAt: null,
                date: { gte: from, lte: to },
            },
            _sum: { amount: true },
        });
        return result._sum.amount || 0;
    }

    static async getExpensesByType(from: Date, to: Date) {
        const expenses = await prisma.expense.groupBy({
            by: ['type'],
            where: {
                deletedAt: null,
                date: { gte: from, lte: to },
            },
            _sum: { amount: true },
            orderBy: { _sum: { amount: 'desc' } },
        });
        return expenses;
    }
}
