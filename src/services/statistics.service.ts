import prisma from '../config/prisma';
import { OrderStatus } from './order.service';
import { ExpenseService } from './expense.service';

export class StatisticsService {
    static async getDashboard(from: Date, to: Date) {
        // Order stats
        const orders = await prisma.order.findMany({
            where: {
                deletedAt: null,
                createdAt: { gte: from, lte: to },
            },
            include: {
                items: { include: { menuItem: true } },
            },
        });

        const completedOrders = orders.filter((o) => o.status === OrderStatus.COMPLETED);
        const cancelledOrders = orders.filter((o) => o.status === OrderStatus.CANCELLED);
        const returnedOrders = orders.filter((o) => o.status === OrderStatus.RETURNED);
        const paidOrders = completedOrders.filter((o: any) => o.isPaid === true);

        const totalRevenue = paidOrders.reduce((sum, o) => sum + o.totalPrice, 0);
        const totalCost = paidOrders.reduce((sum, o) => sum + o.totalCost, 0);
        const orderProfit = totalRevenue - totalCost;

        // Expenses
        const recordedExpenses = await ExpenseService.getTotalExpenses(from, to);
        const expensesByType = await ExpenseService.getExpensesByType(from, to) as Array<{ type: string, _sum: { amount: number | null } }>;

        // Employee Salaries based on attendance
        const attendances = await prisma.attendance.findMany({
            where: {
                date: { gte: from, lte: to },
                present: true,
            },
            include: { user: { select: { salary: true } } },
        });

        let salaryExpense = 0;
        for (const record of attendances) {
            const date = record.date;
            const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
            const dailyRate = record.user.salary / daysInMonth;
            salaryExpense += dailyRate;
        }

        const totalExpenses = recordedExpenses + salaryExpense;
        if (salaryExpense > 0) {
            expensesByType.push({ type: 'Xodimlar maoshi', _sum: { amount: salaryExpense } });
        }

        // Net profit
        const netProfit = orderProfit - totalExpenses;

        // Unique clients
        const uniqueClients = new Set(
            orders.filter((o) => o.clientName).map((o) => o.clientName)
        ).size;

        // Total meals prepared
        const totalMeals = completedOrders.reduce(
            (sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0),
            0
        );

        // Most/least sold items
        const itemSales = new Map<string, { quantity: number; revenue: number; cost: number; profit: number }>();
        for (const order of completedOrders) {
            for (const item of order.items) {
                const name = item.menuItem.name;
                const existing = itemSales.get(name) || { quantity: 0, revenue: 0, cost: 0, profit: 0 };
                existing.quantity += item.quantity;
                existing.revenue += item.unitPrice * item.quantity;
                existing.cost += item.unitCost * item.quantity;
                existing.profit += (item.unitPrice - item.unitCost) * item.quantity;
                itemSales.set(name, existing);
            }
        }

        const sortedBySales = [...itemSales.entries()].sort((a, b) => b[1].quantity - a[1].quantity);
        const sortedByProfit = [...itemSales.entries()].sort((a, b) => b[1].profit - a[1].profit);

        // Most used warehouse product
        const warehouseLogs = await prisma.warehouseLog.findMany({
            where: {
                createdAt: { gte: from, lte: to },
                reason: 'ORDER_DEDUCT',
            },
            include: { product: { select: { name: true, unit: true } } },
        });

        const productUsage = new Map<string, { name: string; unit: string; total: number }>();
        for (const log of warehouseLogs) {
            const key = log.productId.toString();
            const existing = productUsage.get(key) || {
                name: log.product.name,
                unit: log.product.unit,
                total: 0,
            };
            existing.total += Math.abs(log.quantityChange);
            productUsage.set(key, existing);
        }
        const sortedByUsage = [...productUsage.entries()].sort((a, b) => b[1].total - a[1].total);

        // Returned cost impact
        const returnedCostImpact = returnedOrders.reduce((sum, o) => sum + o.totalCost, 0);

        return {
            // Revenue
            totalRevenue,
            totalCost,
            orderProfit,
            totalExpenses,
            netProfit,

            // Orders
            totalOrders: orders.length,
            completedOrders: completedOrders.length,
            cancelledOrders: cancelledOrders.length,
            returnedOrders: returnedOrders.length,

            // Clients & meals
            uniqueClients,
            totalMeals,

            // Items
            mostSoldItem: sortedBySales[0] ? { name: sortedBySales[0][0], ...sortedBySales[0][1] } : null,
            leastSoldItem: sortedBySales.length > 0
                ? { name: sortedBySales[sortedBySales.length - 1][0], ...sortedBySales[sortedBySales.length - 1][1] }
                : null,
            mostProfitableItem: sortedByProfit[0] ? { name: sortedByProfit[0][0], ...sortedByProfit[0][1] } : null,
            leastProfitableItem: sortedByProfit.length > 0
                ? { name: sortedByProfit[sortedByProfit.length - 1][0], ...sortedByProfit[sortedByProfit.length - 1][1] }
                : null,

            // Warehouse
            mostUsedProduct: sortedByUsage[0]
                ? { name: sortedByUsage[0][1].name, unit: sortedByUsage[0][1].unit, total: sortedByUsage[0][1].total }
                : null,

            // Expenses breakdown
            expensesByType,

            // Waste
            returnedCostImpact,
        };
    }
}
