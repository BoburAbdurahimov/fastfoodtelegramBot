import { Router, Request, Response } from 'express';
import { EmployeeService, AttendanceService } from '../../src/services/employee.service.js';
import { requireRole } from '../auth.js';

const router = Router();

// GET /api/employees
router.get('/employees', requireRole('EMPLOYER'), async (_req: Request, res: Response) => {
    try {
        const employees = await EmployeeService.getAllEmployees();
        // Serialize BigInt
        const serialized = employees.map((e: any) => ({
            ...e,
            telegramId: e.telegramId.toString(),
        }));
        res.json(serialized);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/employees
router.post('/employees', requireRole('EMPLOYER'), async (req: Request, res: Response) => {
    try {
        const data = {
            ...req.body,
            telegramId: BigInt(req.body.telegramId || '0'),
        };
        const employee = await EmployeeService.addEmployee(data, req.dbUser!.id);
        res.json({ ...employee, telegramId: employee.telegramId.toString() });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE /api/employees/:id
router.delete('/employees/:id', requireRole('EMPLOYER'), async (req: Request, res: Response) => {
    try {
        await EmployeeService.removeEmployee(parseInt(req.params.id), req.dbUser!.id);
        res.json({ success: true });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /api/employees/:id/salary
router.put('/employees/:id/salary', requireRole('EMPLOYER'), async (req: Request, res: Response) => {
    try {
        const employee = await EmployeeService.updateSalary(
            parseInt(req.params.id),
            req.body.salary,
            req.dbUser!.id
        );
        res.json({ ...employee, telegramId: employee.telegramId.toString() });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// GET /api/attendance/today
router.get('/attendance/today', requireRole('EMPLOYER'), async (_req: Request, res: Response) => {
    try {
        const attendance = await AttendanceService.getTodayAttendance();
        res.json(attendance);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/attendance
router.post('/attendance', requireRole('EMPLOYER'), async (req: Request, res: Response) => {
    try {
        const result = await AttendanceService.markAttendance(
            req.body.userId,
            new Date(req.body.date),
            req.body.present
        );
        res.json(result);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// GET /api/attendance/:userId — attendance history
router.get('/attendance/:userId', async (req: Request, res: Response) => {
    try {
        const from = req.query.from ? new Date(req.query.from as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const to = req.query.to ? new Date(req.query.to as string) : new Date();
        const attendance = await AttendanceService.getAttendance(
            parseInt(req.params.userId), from, to
        );
        res.json(attendance);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/salary/:userId
router.get('/salary/:userId', requireRole('EMPLOYER'), async (req: Request, res: Response) => {
    try {
        const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
        const year = parseInt(req.query.year as string) || new Date().getFullYear();
        const salary = await AttendanceService.calculateSalary(
            parseInt(req.params.userId), month, year
        );
        res.json({
            ...salary,
            employee: { ...salary.employee, telegramId: salary.employee.telegramId.toString() },
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
