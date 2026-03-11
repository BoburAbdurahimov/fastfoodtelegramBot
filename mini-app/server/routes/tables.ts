import { Router, Request, Response } from 'express';
import { TableService } from '../../src/services/table.service.js';
import { requireRole } from '../auth.js';

const router = Router();

// GET /api/tables
router.get('/', async (_req: Request, res: Response) => {
    try {
        const tables = await TableService.getAllTables();
        res.json(tables);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/tables
router.post('/', requireRole('EMPLOYER'), async (req: Request, res: Response) => {
    try {
        const table = await TableService.addTable(req.body.number, req.body.name);
        res.json(table);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE /api/tables/:number
router.delete('/:number', requireRole('EMPLOYER'), async (req: Request, res: Response) => {
    try {
        await TableService.removeTable(parseInt(req.params.number));
        res.json({ success: true });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
