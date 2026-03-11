import { Router, Request, Response } from 'express';
import { OrderService } from '../../src/services/order.service.js';
import { requireRole } from '../auth.js';

const router = Router();

// GET /api/orders
router.get('/', async (req: Request, res: Response) => {
    try {
        const options: any = {};
        if (req.query.status) options.status = req.query.status;
        if (req.query.from) options.from = new Date(req.query.from as string);
        if (req.query.to) options.to = new Date(req.query.to as string);
        options.limit = parseInt(req.query.limit as string) || 20;
        options.offset = parseInt(req.query.offset as string) || 0;

        // Waiters only see their own orders
        if (req.dbUser!.role === 'WAITER') {
            options.userId = req.dbUser!.id;
        }

        const orders = await OrderService.getOrders(options);
        const count = await OrderService.getOrderCount(options);
        res.json({ orders, total: count });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/orders/today
router.get('/today', async (req: Request, res: Response) => {
    try {
        const userId = req.dbUser!.role === 'WAITER' ? req.dbUser!.id : undefined;
        const orders = await OrderService.getTodayOrders(userId);
        res.json(orders);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/orders/:id
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const order = await OrderService.getOrderById(parseInt(req.params.id));
        if (!order) return res.status(404).json({ error: 'Not found' });
        res.json(order);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/orders
router.post('/', async (req: Request, res: Response) => {
    try {
        const { clientName, items, tableNumber, orderType } = req.body;
        const order = await OrderService.createOrder(
            req.dbUser!.id,
            clientName,
            items,
            tableNumber,
            orderType
        );
        res.json(order);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// POST /api/orders/:id/status
router.post('/:id/status', async (req: Request, res: Response) => {
    try {
        const order = await OrderService.updateStatus(
            parseInt(req.params.id),
            req.body.status,
            req.dbUser!.id
        );
        res.json(order);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// POST /api/orders/:id/pay
router.post('/:id/pay', async (req: Request, res: Response) => {
    try {
        const order = await OrderService.markAsPaid(
            parseInt(req.params.id),
            req.body.method,
            req.dbUser!.id
        );
        res.json(order);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
