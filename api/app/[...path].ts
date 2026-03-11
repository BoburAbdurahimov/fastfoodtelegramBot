import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../../src/config/prisma';
import { validateInitData } from '../../src/utils/validate-init-data';
import { WarehouseService } from '../../src/services/warehouse.service';
import { MenuService, RecipeService } from '../../src/services/menu.service';
import { OrderService } from '../../src/services/order.service';
import { ExpenseService } from '../../src/services/expense.service';
import { EmployeeService, AttendanceService } from '../../src/services/employee.service';
import { StatisticsService } from '../../src/services/statistics.service';
import { TableService } from '../../src/services/table.service';
interface DbUser {
    id: number;
    telegramId: bigint;
    name: string;
    role: string;
    isActive: boolean;
}

/**
 * Authenticate request: validate Telegram initData OR dev fallback.
 */
async function authenticate(req: VercelRequest): Promise<DbUser | null> {
    const initData = req.headers['x-telegram-init-data'] as string;
    const botToken = process.env.BOT_TOKEN!;

    if (initData) {
        const result = validateInitData(initData, botToken);
        if (!result) return null;
        const user = await prisma.user.findUnique({ where: { telegramId: result.telegramId } });
        if (!user || !user.isActive || user.deletedAt) return null;
        return { id: user.id, telegramId: user.telegramId, name: user.name, role: user.role, isActive: user.isActive };
    }

    // Dev fallback
    const devId = req.headers['x-dev-telegram-id'] as string;
    if (process.env.NODE_ENV !== 'production' && devId) {
        const user = await prisma.user.findUnique({ where: { telegramId: BigInt(devId) } });
        if (user && user.isActive && !user.deletedAt) {
            return { id: user.id, telegramId: user.telegramId, name: user.name, role: user.role, isActive: user.isActive };
        }
    }

    return null;
}

function requireRole(user: DbUser, ...roles: string[]): boolean {
    return roles.includes(user.role);
}

/**
 * Catch-all handler for /api/app/[...path]
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Telegram-Init-Data, X-Dev-Telegram-Id');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const user = await authenticate(req);
        if (!user) return res.status(401).json({ error: 'Not authenticated' });

        // Parse path: /api/app/warehouse/1/add-stock => ["warehouse", "1", "add-stock"]
        const pathParam = req.query.path;
        const segments = Array.isArray(pathParam) ? pathParam : (pathParam ? [pathParam] : []);
        const method = req.method!;
        const body = req.body || {};

        // Route to handlers
        const resource = segments[0];

        switch (resource) {
            case 'me':
                return res.json({ user: { ...user, telegramId: user.telegramId.toString() } });

            case 'warehouse':
                return await handleWarehouse(req, res, user, segments.slice(1), method, body);

            case 'menu':
                return await handleMenu(req, res, user, segments.slice(1), method, body);

            case 'categories':
                return await handleCategories(req, res, user, segments.slice(1), method, body);

            case 'orders':
                return await handleOrders(req, res, user, segments.slice(1), method, body);

            case 'expenses':
                return await handleExpenses(req, res, user, segments.slice(1), method, body);

            case 'employees':
                return await handleEmployees(req, res, user, segments.slice(1), method, body);

            case 'attendance':
                return await handleAttendance(req, res, user, segments.slice(1), method, body);

            case 'salary':
                return await handleSalary(req, res, user, segments.slice(1), method, body);

            case 'statistics':
                return await handleStatistics(req, res, user, method);

            case 'tables':
                return await handleTables(req, res, user, segments.slice(1), method, body);

            default:
                return res.status(404).json({ error: 'Not found' });
        }
    } catch (err: any) {
        console.error('API error:', err);
        return res.status(500).json({ error: err.message || 'Internal error' });
    }
}

// ─── WAREHOUSE ───
async function handleWarehouse(req: VercelRequest, res: VercelResponse, user: DbUser, path: string[], method: string, body: any) {
    if (path.length === 0) {
        if (method === 'GET') return res.json(await WarehouseService.getAllProducts());
        if (method === 'POST') {
            if (!requireRole(user, 'EMPLOYER')) return res.status(403).json({ error: 'Forbidden' });
            return res.json(await WarehouseService.createProduct(body));
        }
    }

    if (path[0] === 'low-stock') {
        return res.json(await WarehouseService.getLowStockProducts());
    }

    const id = parseInt(path[0]);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    if (path[1] === 'add-stock' && method === 'POST') {
        return res.json(await WarehouseService.addStock(id, body.quantity, user.id, body.note));
    }
    if (path[1] === 'remove-stock' && method === 'POST') {
        return res.json(await WarehouseService.removeStock(id, body.quantity, user.id, body.note));
    }
    if (path[1] === 'history') {
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = parseInt(req.query.offset as string) || 0;
        return res.json(await WarehouseService.getProductHistory(id, limit, offset));
    }

    if (method === 'PUT') {
        if (!requireRole(user, 'EMPLOYER')) return res.status(403).json({ error: 'Forbidden' });
        return res.json(await WarehouseService.updateProduct(id, body));
    }
    if (method === 'DELETE') {
        if (!requireRole(user, 'EMPLOYER')) return res.status(403).json({ error: 'Forbidden' });
        await WarehouseService.softDelete(id);
        return res.json({ success: true });
    }

    return res.status(404).json({ error: 'Not found' });
}

// ─── MENU ───
async function handleMenu(req: VercelRequest, res: VercelResponse, user: DbUser, path: string[], method: string, body: any) {
    if (path.length === 0) {
        if (method === 'GET') {
            const catId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
            return res.json(await MenuService.getAllMenuItems(catId));
        }
        if (method === 'POST') {
            if (!requireRole(user, 'EMPLOYER')) return res.status(403).json({ error: 'Forbidden' });
            return res.json(await MenuService.createMenuItem(body));
        }
    }

    if (path[0] === 'active' && method === 'GET') {
        const catId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
        return res.json(await MenuService.getActiveMenuItems(catId));
    }

    const id = parseInt(path[0]);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    if (path[1] === 'toggle-active' && method === 'POST') {
        if (!requireRole(user, 'EMPLOYER')) return res.status(403).json({ error: 'Forbidden' });
        return res.json(await MenuService.toggleActive(id));
    }
    if (path[1] === 'toggle-tracked' && method === 'POST') {
        if (!requireRole(user, 'EMPLOYER')) return res.status(403).json({ error: 'Forbidden' });
        return res.json(await MenuService.toggleTracked(id));
    }
    if (path[1] === 'finish-batch' && method === 'POST') {
        if (!requireRole(user, 'EMPLOYER', 'CHEF')) return res.status(403).json({ error: 'Forbidden' });
        return res.json(await MenuService.finishBatch(id, body.quantity, user.id));
    }
    if (path[1] === 'recipe') {
        if (method === 'GET') return res.json(await RecipeService.getRecipe(id));
        if (method === 'POST') {
            if (!requireRole(user, 'EMPLOYER')) return res.status(403).json({ error: 'Forbidden' });
            return res.json(await RecipeService.addIngredient(id, body.warehouseProductId, body.quantity));
        }
        if (method === 'DELETE' && path[2]) {
            if (!requireRole(user, 'EMPLOYER')) return res.status(403).json({ error: 'Forbidden' });
            await RecipeService.removeIngredient(id, parseInt(path[2]));
            return res.json({ success: true });
        }
    }

    if (method === 'GET') {
        const item = await MenuService.getMenuItemById(id);
        return item ? res.json(item) : res.status(404).json({ error: 'Not found' });
    }
    if (method === 'PUT') {
        if (!requireRole(user, 'EMPLOYER')) return res.status(403).json({ error: 'Forbidden' });
        return res.json(await MenuService.updateMenuItem(id, body));
    }
    if (method === 'DELETE') {
        if (!requireRole(user, 'EMPLOYER')) return res.status(403).json({ error: 'Forbidden' });
        await MenuService.softDeleteMenuItem(id);
        return res.json({ success: true });
    }

    return res.status(404).json({ error: 'Not found' });
}

// ─── CATEGORIES ───
async function handleCategories(req: VercelRequest, res: VercelResponse, user: DbUser, path: string[], method: string, body: any) {
    if (path.length === 0) {
        if (method === 'GET') return res.json(await MenuService.getAllCategories());
        if (method === 'POST') {
            if (!requireRole(user, 'EMPLOYER')) return res.status(403).json({ error: 'Forbidden' });
            return res.json(await MenuService.createCategory(body.name));
        }
    }

    const id = parseInt(path[0]);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    if (method === 'PUT') {
        if (!requireRole(user, 'EMPLOYER')) return res.status(403).json({ error: 'Forbidden' });
        return res.json(await MenuService.updateCategory(id, body.name));
    }
    if (method === 'DELETE') {
        if (!requireRole(user, 'EMPLOYER')) return res.status(403).json({ error: 'Forbidden' });
        await MenuService.softDeleteCategory(id);
        return res.json({ success: true });
    }

    return res.status(404).json({ error: 'Not found' });
}

// ─── ORDERS ───
async function handleOrders(req: VercelRequest, res: VercelResponse, user: DbUser, path: string[], method: string, body: any) {
    if (path.length === 0) {
        if (method === 'GET') {
            const options: any = {};
            if (req.query.status) options.status = req.query.status;
            if (req.query.from) options.from = new Date(req.query.from as string);
            if (req.query.to) options.to = new Date(req.query.to as string);
            options.limit = parseInt(req.query.limit as string) || 20;
            options.offset = parseInt(req.query.offset as string) || 0;
            if (user.role === 'WAITER') options.userId = user.id;
            const orders = await OrderService.getOrders(options);
            const count = await OrderService.getOrderCount(options);
            return res.json({ orders, total: count });
        }
        if (method === 'POST') {
            const order = await OrderService.createOrder(
                user.id, body.clientName, body.items, body.tableNumber, body.orderType
            );
            return res.json(order);
        }
    }

    if (path[0] === 'today' && method === 'GET') {
        const userId = user.role === 'WAITER' ? user.id : undefined;
        return res.json(await OrderService.getTodayOrders(userId));
    }

    const id = parseInt(path[0]);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    if (path[1] === 'status' && method === 'POST') {
        return res.json(await OrderService.updateStatus(id, body.status, user.id));
    }
    if (path[1] === 'pay' && method === 'POST') {
        return res.json(await OrderService.markAsPaid(id, body.method, user.id));
    }

    if (method === 'GET') {
        const order = await OrderService.getOrderById(id);
        return order ? res.json(order) : res.status(404).json({ error: 'Not found' });
    }

    return res.status(404).json({ error: 'Not found' });
}

// ─── EXPENSES ───
async function handleExpenses(req: VercelRequest, res: VercelResponse, user: DbUser, path: string[], method: string, body: any) {
    if (!requireRole(user, 'EMPLOYER')) return res.status(403).json({ error: 'Forbidden' });

    if (path.length === 0) {
        if (method === 'GET') {
            const options: any = {};
            if (req.query.from) options.from = new Date(req.query.from as string);
            if (req.query.to) options.to = new Date(req.query.to as string);
            if (req.query.type) options.type = req.query.type;
            options.limit = parseInt(req.query.limit as string) || 20;
            options.offset = parseInt(req.query.offset as string) || 0;
            return res.json(await ExpenseService.getAllExpenses(options));
        }
        if (method === 'POST') {
            return res.json(await ExpenseService.createExpense({
                ...body, date: new Date(body.date), userId: user.id,
            }));
        }
    }

    if (path[0] === 'summary' && method === 'GET') {
        const from = req.query.from ? new Date(req.query.from as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const to = req.query.to ? new Date(req.query.to as string) : new Date();
        const total = await ExpenseService.getTotalExpenses(from, to);
        const byType = await ExpenseService.getExpensesByType(from, to);
        return res.json({ total, byType, from, to });
    }

    const id = parseInt(path[0]);
    if (method === 'DELETE' && !isNaN(id)) {
        await ExpenseService.deleteExpense(id, user.id);
        return res.json({ success: true });
    }

    return res.status(404).json({ error: 'Not found' });
}

// ─── EMPLOYEES ───
async function handleEmployees(req: VercelRequest, res: VercelResponse, user: DbUser, path: string[], method: string, body: any) {
    if (!requireRole(user, 'EMPLOYER')) return res.status(403).json({ error: 'Forbidden' });

    if (path.length === 0) {
        if (method === 'GET') {
            const employees = await EmployeeService.getAllEmployees();
            return res.json(employees.map((e: any) => ({ ...e, telegramId: e.telegramId.toString() })));
        }
        if (method === 'POST') {
            const emp = await EmployeeService.addEmployee({ ...body, telegramId: BigInt(body.telegramId || '0') }, user.id);
            return res.json({ ...emp, telegramId: emp.telegramId.toString() });
        }
    }

    const id = parseInt(path[0]);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    if (method === 'DELETE') {
        await EmployeeService.removeEmployee(id, user.id);
        return res.json({ success: true });
    }
    if (path[1] === 'salary' && method === 'PUT') {
        const emp = await EmployeeService.updateSalary(id, body.salary, user.id);
        return res.json({ ...emp, telegramId: emp.telegramId.toString() });
    }

    return res.status(404).json({ error: 'Not found' });
}

// ─── ATTENDANCE ───
async function handleAttendance(req: VercelRequest, res: VercelResponse, user: DbUser, path: string[], method: string, body: any) {
    if (path.length === 0) {
        if (method === 'POST') {
            if (!requireRole(user, 'EMPLOYER')) return res.status(403).json({ error: 'Forbidden' });
            return res.json(await AttendanceService.markAttendance(body.userId, new Date(body.date), body.present));
        }
    }

    if (path[0] === 'today' && method === 'GET') {
        if (!requireRole(user, 'EMPLOYER')) return res.status(403).json({ error: 'Forbidden' });
        return res.json(await AttendanceService.getTodayAttendance());
    }

    const userId = parseInt(path[0]);
    if (!isNaN(userId) && method === 'GET') {
        const from = req.query.from ? new Date(req.query.from as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const to = req.query.to ? new Date(req.query.to as string) : new Date();
        return res.json(await AttendanceService.getAttendance(userId, from, to));
    }

    return res.status(404).json({ error: 'Not found' });
}

// ─── SALARY ───
async function handleSalary(req: VercelRequest, res: VercelResponse, user: DbUser, path: string[], method: string, _body: any) {
    if (!requireRole(user, 'EMPLOYER')) return res.status(403).json({ error: 'Forbidden' });

    const userId = parseInt(path[0]);
    if (!isNaN(userId) && method === 'GET') {
        const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
        const year = parseInt(req.query.year as string) || new Date().getFullYear();
        const salary = await AttendanceService.calculateSalary(userId, month, year);
        return res.json({ ...salary, employee: { ...salary.employee, telegramId: salary.employee.telegramId.toString() } });
    }

    return res.status(404).json({ error: 'Not found' });
}

// ─── STATISTICS ───
async function handleStatistics(req: VercelRequest, res: VercelResponse, user: DbUser, method: string) {
    if (!requireRole(user, 'EMPLOYER')) return res.status(403).json({ error: 'Forbidden' });
    if (method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const from = req.query.from
        ? new Date(req.query.from as string)
        : new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    const to = req.query.to ? new Date(req.query.to as string) : new Date();
    return res.json(await StatisticsService.getDashboard(from, to));
}

// ─── TABLES ───
async function handleTables(req: VercelRequest, res: VercelResponse, user: DbUser, path: string[], method: string, body: any) {
    if (path.length === 0) {
        if (method === 'GET') return res.json(await TableService.getAllTables());
        if (method === 'POST') {
            if (!requireRole(user, 'EMPLOYER')) return res.status(403).json({ error: 'Forbidden' });
            return res.json(await TableService.addTable(body.number, body.name));
        }
    }

    const num = parseInt(path[0]);
    if (method === 'DELETE' && !isNaN(num)) {
        if (!requireRole(user, 'EMPLOYER')) return res.status(403).json({ error: 'Forbidden' });
        await TableService.removeTable(num);
        return res.json({ success: true });
    }

    return res.status(404).json({ error: 'Not found' });
}
