import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from the parent (root) project directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

import { telegramAuthMiddleware } from './auth.js';
import warehouseRouter from './routes/warehouse.js';
import menuRouter from './routes/menu.js';
import ordersRouter from './routes/orders.js';
import expensesRouter from './routes/expenses.js';
import employeesRouter from './routes/employees.js';
import statisticsRouter from './routes/statistics.js';
import tablesRouter from './routes/tables.js';

const app = express();
const PORT = process.env.MINI_APP_PORT || 3001;

app.use(cors());
app.use(express.json());

// Auth middleware for all /api routes
app.use('/api', telegramAuthMiddleware);

// Mount routes
app.use('/api/warehouse', warehouseRouter);
app.use('/api/menu', menuRouter);
app.use('/api/categories', menuRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/attendance', employeesRouter);
app.use('/api/salary', employeesRouter);
app.use('/api/statistics', statisticsRouter);
app.use('/api/tables', tablesRouter);

// /api/me — get current user info
app.get('/api/me', (req: any, res) => {
    res.json({ user: req.dbUser });
});

app.listen(PORT, () => {
    console.log(`🚀 Mini App API running on http://localhost:${PORT}`);
});
