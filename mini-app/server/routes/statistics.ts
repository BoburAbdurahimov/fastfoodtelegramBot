import { Router, Request, Response } from 'express';
import { StatisticsService } from '../../src/services/statistics.service.js';
import { requireRole } from '../auth.js';

const router = Router();

// GET /api/statistics
router.get('/', requireRole('EMPLOYER'), async (req: Request, res: Response) => {
    try {
        const from = req.query.from
            ? new Date(req.query.from as string)
            : new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
        const to = req.query.to
            ? new Date(req.query.to as string)
            : new Date();

        const dashboard = await StatisticsService.getDashboard(from, to);
        res.json(dashboard);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
