import prisma from '../config/prisma';
import { AuditService } from '../middleware/audit';

export class MenuService {
    // Categories
    static async getAllCategories() {
        return prisma.menuCategory.findMany({
            where: { deletedAt: null },
            orderBy: { name: 'asc' },
            include: { menuItems: { where: { deletedAt: null } } },
        });
    }

    static async createCategory(name: string) {
        return prisma.menuCategory.create({ data: { name } });
    }

    static async updateCategory(id: number, name: string) {
        return prisma.menuCategory.update({ where: { id }, data: { name } });
    }

    static async softDeleteCategory(id: number) {
        return prisma.menuCategory.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }

    // Menu Items
    static async getAllMenuItems(categoryId?: number) {
        return prisma.menuItem.findMany({
            where: {
                deletedAt: null,
                ...(categoryId ? { categoryId } : {}),
            },
            include: {
                category: true,
                recipes: {
                    include: { warehouseProduct: true },
                },
            },
            orderBy: { name: 'asc' },
        });
    }

    static async getActiveMenuItems(categoryId?: number) {
        return prisma.menuItem.findMany({
            where: {
                deletedAt: null,
                isActive: true,
                ...(categoryId ? { categoryId } : {}),
            },
            include: {
                category: true,
                recipes: {
                    include: { warehouseProduct: true },
                },
            },
            orderBy: { name: 'asc' },
        });
    }

    static async getMenuItemById(id: number) {
        return prisma.menuItem.findFirst({
            where: { id, deletedAt: null },
            include: {
                category: true,
                recipes: {
                    include: { warehouseProduct: true },
                },
            },
        });
    }

    static async createMenuItem(data: {
        name: string;
        price: number;
        categoryId: number;
    }) {
        return prisma.menuItem.create({
            data,
            include: { category: true },
        });
    }

    static async updateMenuItem(
        id: number,
        data: Partial<{
            name: string;
            price: number;
            categoryId: number;
            isActive: boolean;
        }>
    ) {
        return prisma.menuItem.update({
            where: { id },
            data,
            include: { category: true },
        });
    }

    static async softDeleteMenuItem(id: number) {
        return prisma.menuItem.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }

    static async toggleActive(id: number) {
        const item = await prisma.menuItem.findUnique({ where: { id } });
        if (!item) throw new Error('Menu item not found');
        return prisma.menuItem.update({
            where: { id },
            data: { isActive: !item.isActive },
        });
    }
}

export class RecipeService {
    static async addIngredient(menuItemId: number, warehouseProductId: number, quantity: number) {
        return prisma.recipe.upsert({
            where: {
                menuItemId_warehouseProductId: { menuItemId, warehouseProductId },
            },
            create: { menuItemId, warehouseProductId, quantity },
            update: { quantity },
            include: { warehouseProduct: true },
        });
    }

    static async removeIngredient(menuItemId: number, warehouseProductId: number) {
        return prisma.recipe.delete({
            where: {
                menuItemId_warehouseProductId: { menuItemId, warehouseProductId },
            },
        });
    }

    static async getRecipe(menuItemId: number) {
        return prisma.recipe.findMany({
            where: { menuItemId },
            include: { warehouseProduct: true },
        });
    }

    static async calculateCost(menuItemId: number, quantity: number = 1): Promise<number> {
        const recipes = await prisma.recipe.findMany({
            where: { menuItemId },
            include: { warehouseProduct: true },
        });

        return recipes.reduce((total, r) => {
            return total + r.quantity * r.warehouseProduct.costPerUnit * quantity;
        }, 0);
    }

    static async checkAvailability(
        menuItemId: number,
        quantity: number = 1
    ): Promise<{ available: boolean; missing: string[] }> {
        const recipes = await prisma.recipe.findMany({
            where: { menuItemId },
            include: { warehouseProduct: true },
        });

        const missing: string[] = [];
        for (const r of recipes) {
            const needed = r.quantity * quantity;
            if (r.warehouseProduct.quantity < needed) {
                missing.push(
                    `${r.warehouseProduct.name}: need ${needed} ${r.warehouseProduct.unit}, have ${r.warehouseProduct.quantity}`
                );
            }
        }

        return { available: missing.length === 0, missing };
    }

    static async getDeductionItems(
        menuItemId: number,
        quantity: number
    ): Promise<Array<{ warehouseProductId: number; quantity: number }>> {
        const recipes = await prisma.recipe.findMany({
            where: { menuItemId },
        });

        return recipes.map((r) => ({
            warehouseProductId: r.warehouseProductId,
            quantity: r.quantity * quantity,
        }));
    }
}
