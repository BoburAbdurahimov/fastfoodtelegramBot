import prisma from '../config/prisma';

export const Unit = {
    PCS: 'PCS',
    KG: 'KG',
    GRAM: 'GRAM',
    LITER: 'LITER',
    ML: 'ML'
} as const;
export type Unit = typeof Unit[keyof typeof Unit];

export const WarehouseLogReason = {
    MANUAL_ADD: 'MANUAL_ADD',
    MANUAL_REMOVE: 'MANUAL_REMOVE',
    ORDER_DEDUCT: 'ORDER_DEDUCT',
    ORDER_RESTORE: 'ORDER_RESTORE'
} as const;
export type WarehouseLogReason = typeof WarehouseLogReason[keyof typeof WarehouseLogReason];

import { AuditService } from '../middleware/audit';

export class WarehouseService {
    static async getAllProducts(includeDeleted = false) {
        return prisma.warehouseProduct.findMany({
            where: includeDeleted ? {} : { deletedAt: null },
            orderBy: { name: 'asc' },
        });
    }

    static async getProductById(id: number) {
        return prisma.warehouseProduct.findFirst({
            where: { id, deletedAt: null },
        });
    }

    static async createProduct(data: {
        name: string;
        unit: Unit;
        costPerUnit: number;
        quantity: number;
        lowStockThreshold: number;
    }) {
        return prisma.warehouseProduct.create({ data });
    }

    static async updateProduct(
        id: number,
        data: Partial<{
            name: string;
            unit: Unit;
            costPerUnit: number;
            lowStockThreshold: number;
        }>
    ) {
        return prisma.warehouseProduct.update({ where: { id }, data });
    }

    static async softDelete(id: number) {
        return prisma.warehouseProduct.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }

    static async addStock(productId: number, quantity: number, userId: number, note?: string) {
        const product = await prisma.warehouseProduct.update({
            where: { id: productId },
            data: { quantity: { increment: quantity } },
        });

        await prisma.warehouseLog.create({
            data: {
                productId,
                userId,
                quantityChange: quantity,
                reason: WarehouseLogReason.MANUAL_ADD,
                note,
            },
        });

        await AuditService.log(userId, 'ADD_STOCK', 'WarehouseProduct', productId, {
            quantity,
            note,
        });

        return product;
    }

    static async removeStock(productId: number, quantity: number, userId: number, note?: string) {
        const product = await prisma.warehouseProduct.findUnique({ where: { id: productId } });
        if (!product) throw new Error('Product not found');
        if (product.quantity < quantity) throw new Error('Insufficient stock');

        const updated = await prisma.warehouseProduct.update({
            where: { id: productId },
            data: { quantity: { decrement: quantity } },
        });

        await prisma.warehouseLog.create({
            data: {
                productId,
                userId,
                quantityChange: -quantity,
                reason: WarehouseLogReason.MANUAL_REMOVE,
                note,
            },
        });

        await AuditService.log(userId, 'REMOVE_STOCK', 'WarehouseProduct', productId, {
            quantity,
            note,
        });

        return updated;
    }

    static async deductForOrder(
        items: Array<{ warehouseProductId: number; quantity: number }>,
        userId: number,
        orderId: number
    ) {
        for (const item of items) {
            const product = await prisma.warehouseProduct.findUnique({
                where: { id: item.warehouseProductId },
            });
            if (!product) throw new Error(`Product ID ${item.warehouseProductId} not found`);
            if (product.quantity < item.quantity) {
                throw new Error(`Insufficient stock for "${product.name}". Available: ${product.quantity} ${product.unit}, Required: ${item.quantity}`);
            }
        }

        for (const item of items) {
            await prisma.warehouseProduct.update({
                where: { id: item.warehouseProductId },
                data: { quantity: { decrement: item.quantity } },
            });

            await prisma.warehouseLog.create({
                data: {
                    productId: item.warehouseProductId,
                    userId,
                    quantityChange: -item.quantity,
                    reason: WarehouseLogReason.ORDER_DEDUCT,
                    note: `Order #${orderId}`,
                },
            });
        }
    }

    static async restoreForOrder(
        items: Array<{ warehouseProductId: number; quantity: number }>,
        userId: number,
        orderId: number
    ) {
        for (const item of items) {
            await prisma.warehouseProduct.update({
                where: { id: item.warehouseProductId },
                data: { quantity: { increment: item.quantity } },
            });

            await prisma.warehouseLog.create({
                data: {
                    productId: item.warehouseProductId,
                    userId,
                    quantityChange: item.quantity,
                    reason: WarehouseLogReason.ORDER_RESTORE,
                    note: `Order #${orderId} cancelled/returned`,
                },
            });
        }
    }

    static async getLowStockProducts() {
        const products = await prisma.warehouseProduct.findMany({
            where: { deletedAt: null },
        });
        return products.filter((p) => p.quantity <= p.lowStockThreshold);
    }

    static async getProductHistory(productId: number, limit = 20, offset = 0) {
        return prisma.warehouseLog.findMany({
            where: { productId },
            include: { user: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });
    }
}

