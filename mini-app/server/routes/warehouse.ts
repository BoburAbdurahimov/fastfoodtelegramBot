import { Router, Request, Response } from 'express';
import { WarehouseService } from '../../src/services/warehouse.service.js';
import { requireRole } from '../auth.js';

const router = Router();

// GET /api/warehouse — list all products
router.get('/', async (req: Request, res: Response) => {
    try {
        const products = await WarehouseService.getAllProducts();
        res.json(products);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/warehouse/low-stock
router.get('/low-stock', async (_req: Request, res: Response) => {
    try {
        const products = await WarehouseService.getLowStockProducts();
        res.json(products);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/warehouse/:id/history
router.get('/:id/history', async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = parseInt(req.query.offset as string) || 0;
        const history = await WarehouseService.getProductHistory(
            parseInt(req.params.id), limit, offset
        );
        res.json(history);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/warehouse — create product
router.post('/', requireRole('EMPLOYER'), async (req: Request, res: Response) => {
    try {
        const product = await WarehouseService.createProduct(req.body);
        res.json(product);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /api/warehouse/:id — update product
router.put('/:id', requireRole('EMPLOYER'), async (req: Request, res: Response) => {
    try {
        const product = await WarehouseService.updateProduct(parseInt(req.params.id), req.body);
        res.json(product);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE /api/warehouse/:id — soft delete
router.delete('/:id', requireRole('EMPLOYER'), async (req: Request, res: Response) => {
    try {
        await WarehouseService.softDelete(parseInt(req.params.id));
        res.json({ success: true });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// POST /api/warehouse/:id/add-stock
router.post('/:id/add-stock', async (req: Request, res: Response) => {
    try {
        const product = await WarehouseService.addStock(
            parseInt(req.params.id),
            req.body.quantity,
            req.dbUser!.id,
            req.body.note
        );
        res.json(product);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// POST /api/warehouse/:id/remove-stock
router.post('/:id/remove-stock', async (req: Request, res: Response) => {
    try {
        const product = await WarehouseService.removeStock(
            parseInt(req.params.id),
            req.body.quantity,
            req.dbUser!.id,
            req.body.note
        );
        res.json(product);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
