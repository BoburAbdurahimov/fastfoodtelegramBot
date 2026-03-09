import prisma from '../config/prisma';

export const OrderStatus = {
    NEW: 'NEW',
    PREPARING: 'PREPARING',
    READY: 'READY',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    RETURNED: 'RETURNED'
} as const;
export type OrderStatus = typeof OrderStatus[keyof typeof OrderStatus];

import { WarehouseService } from './warehouse.service';
import { RecipeService } from './menu.service';
import { AuditService } from '../middleware/audit';

export class OrderService {
    static async createOrder(
        userId: number,
        clientName: string | undefined,
        items: Array<{ menuItemId: number; quantity: number }>,
        tableNumber?: number,
        orderType: string = 'DINEIN'
    ) {
        // 1. Check availability for all items
        for (const item of items) {
            const { available, missing } = await RecipeService.checkAvailability(item.menuItemId, item.quantity);
            if (!available) {
                throw new Error(`Insufficient stock:\n${missing.join('\n')}`);
            }
        }

        // 2. Calculate totals
        let totalPrice = 0;
        let totalCost = 0;
        const orderItemsData: Array<{
            menuItemId: number;
            quantity: number;
            unitPrice: number;
            unitCost: number;
        }> = [];

        for (const item of items) {
            const menuItem = await prisma.menuItem.findUnique({ where: { id: item.menuItemId } });
            if (!menuItem) throw new Error(`Menu item ${item.menuItemId} not found`);

            const unitCost = await RecipeService.calculateCost(item.menuItemId, 1);
            totalPrice += menuItem.price * item.quantity;
            totalCost += unitCost * item.quantity;

            orderItemsData.push({
                menuItemId: item.menuItemId,
                quantity: item.quantity,
                unitPrice: menuItem.price,
                unitCost,
            });
        }

        const profit = totalPrice - totalCost;

        // 3. Generate sequential order number (daily or absolute)
        const orderModel = (prisma as any).order;
        const lastOrder = await orderModel.findFirst({ orderBy: { id: 'desc' } });
        const nextOrderNumber = lastOrder ? lastOrder.orderNumber + 1 : 1;

        // 4. Create order
        const order = await orderModel.create({
            data: {
                orderNumber: nextOrderNumber,
                userId,
                clientName,
                orderType,
                tableNumber: orderType === 'DINEIN' ? (tableNumber || null) : null,
                totalPrice,
                totalCost,
                profit,
                status: OrderStatus.NEW,
                items: {
                    create: orderItemsData,
                },
            },
            include: {
                items: { include: { menuItem: true } },
                user: { select: { name: true, telegramId: true } },
            },
        });

        // 4. Deduct stock
        for (const item of items) {
            const menuItem = await prisma.menuItem.findUnique({ where: { id: item.menuItemId } }) as any;
            if (menuItem.isTracked) {
                await (prisma as any).menuItem.update({
                    where: { id: item.menuItemId },
                    data: { stockQuantity: { decrement: item.quantity } }
                });
            } else {
                const deductions = await RecipeService.getDeductionItems(item.menuItemId, item.quantity);
                await WarehouseService.deductForOrder(deductions, userId, order.id);
            }
        }

        await AuditService.log(userId, 'CREATE_ORDER', 'Order', order.id, {
            totalPrice,
            totalCost,
            profit,
            itemCount: items.length,
        });

        return order;
    }

    static async getOrderById(id: number) {
        return prisma.order.findFirst({
            where: { id, deletedAt: null },
            include: {
                items: { include: { menuItem: true } },
                user: { select: { name: true, telegramId: true } },
            },
        });
    }

    static async getOrders(options: {
        status?: OrderStatus;
        userId?: number;
        from?: Date;
        to?: Date;
        limit?: number;
        offset?: number;
    }) {
        const { status, userId, from, to, limit = 20, offset = 0 } = options;

        return prisma.order.findMany({
            where: {
                deletedAt: null,
                ...(status ? { status: status as any } : {}),
                ...(userId ? { userId } : {}),
                ...(from || to
                    ? {
                        createdAt: {
                            ...(from ? { gte: from } : {}),
                            ...(to ? { lte: to } : {}),
                        },
                    }
                    : {}),
            },
            include: {
                items: { include: { menuItem: true } },
                user: { select: { name: true, telegramId: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });
    }

    static async getOrderCount(options: {
        status?: OrderStatus;
        from?: Date;
        to?: Date;
    }) {
        const { status, from, to } = options;
        return prisma.order.count({
            where: {
                deletedAt: null,
                ...(status ? { status: status as any } : {}),
                ...(from || to
                    ? {
                        createdAt: {
                            ...(from ? { gte: from } : {}),
                            ...(to ? { lte: to } : {}),
                        },
                    }
                    : {}),
            },
        });
    }

    static async updateStatus(id: number, status: OrderStatus, userId: number) {
        const order = await prisma.order.findUnique({
            where: { id },
            include: { items: true },
        });

        if (!order) throw new Error('Order not found');

        // If cancelling or returning, restore stock
        if (
            (status === OrderStatus.CANCELLED || status === OrderStatus.RETURNED) &&
            order.status !== OrderStatus.CANCELLED &&
            order.status !== OrderStatus.RETURNED
        ) {
            for (const item of order.items) {
                const menuItem = await prisma.menuItem.findUnique({ where: { id: item.menuItemId } }) as any;
                if (menuItem.isTracked) {
                    await (prisma as any).menuItem.update({
                        where: { id: item.menuItemId },
                        data: { stockQuantity: { increment: item.quantity } }
                    });
                } else {
                    const deductions = await RecipeService.getDeductionItems(item.menuItemId, item.quantity);
                    await WarehouseService.restoreForOrder(deductions, userId, order.id);
                }
            }
        }

        const updated = await prisma.order.update({
            where: { id },
            data: {
                status: status as any,
                ...(status === OrderStatus.COMPLETED ? { completedAt: new Date() } : {}),
            },
            include: {
                items: { include: { menuItem: true } },
                user: { select: { name: true, telegramId: true } },
            },
        });

        await AuditService.log(userId, `ORDER_${status}`, 'Order', id, {
            previousStatus: order.status,
            newStatus: status,
        });

        return updated;
    }

    static async markAsPaid(id: number, method: 'CASH' | 'CARD', userId: number) {
        const order = await prisma.order.findUnique({ where: { id } });
        if (!order) throw new Error('Order not found');

        const updated = await (prisma.order as any).update({
            where: { id },
            data: {
                isPaid: true,
                paymentMethod: method,
            },
            include: {
                user: { select: { name: true } },
            },
        });

        await AuditService.log(userId, 'PAY_ORDER', 'Order', id, {
            method,
            totalPrice: order.totalPrice,
        });

        return updated;
    }


    static async getTodayOrders(userId?: number) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return this.getOrders({
            userId,
            from: today,
            to: tomorrow,
        });
    }
}
