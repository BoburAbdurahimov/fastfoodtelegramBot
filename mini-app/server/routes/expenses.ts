import { Router, Request, Response } from 'express';
import { ExpenseService } from '../../src/services/expense.service.js';
import { requireRole } from '../auth.js';

const router = Router();

// GET /api/expenses
router.get('/', requireRole('EMPLOYER'), async (req: Request, res: Response) => {
    try {
        const options: any = {};
        if (req.query.from) options.from = new Date(req.query.from as string);
        if (req.query.to) options.to = new Date(req.query.to as string);
        if (req.query.type) options.type = req.query.type;
        options.limit = parseInt(req.query.limit as string) || 20;
        options.offset = parseInt(req.query.offset as string) || 0;

        const expenses = await ExpenseService.getAllExpenses(options);
        res.json(expenses);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/expenses/summary
router.get('/summary', requireRole('EMPLOYER'), async (req: Request, res: Response) => {
    try {
        const from = req.query.from ? new Date(req.query.from as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const to = req.query.to ? new Date(req.query.to as string) : new Date();

        const total = await ExpenseService.getTotalExpenses(from, to);
        const byType = await ExpenseService.getExpensesByType(from, to);
        res.json({ total, byType, from, to });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/expenses
router.post('/', requireRole('EMPLOYER'), async (req: Request, res: Response) => {
    try {
        const data = {
            ...req.body,
            date: new Date(req.body.date),
            userId: req.dbUser!.id,
        };
        const expense = await ExpenseService.createExpense(data);
        res.json(expense);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE /api/expenses/:id
router.delete('/:id', requireRole('EMPLOYER'), async (req: Request, res: Response) => {
    try {
        await ExpenseService.deleteExpense(parseInt(req.params.id), req.dbUser!.id);
        res.json({ success: true });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
