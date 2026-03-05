import prisma from '../config/prisma';
import { Role } from '../middleware/auth';
import { AuditService } from '../middleware/audit';

export class EmployeeService {
    static async getAllEmployees(includeDeleted = false) {
        return prisma.user.findMany({
            where: {
                role: { in: [Role.EMPLOYEE, Role.WAITER, Role.CHEF] as any[] },
                ...(includeDeleted ? {} : { deletedAt: null }),
            },
            orderBy: { name: 'asc' },
        });
    }

    static async getEmployeeById(id: number) {
        return prisma.user.findFirst({
            where: { id, deletedAt: null },
        });
    }

    static async addEmployee(data: {
        telegramId: bigint;
        name: string;
        salary: number;
        username?: string;
        role?: string;
    }, addedByUserId: number) {
        // If using username-based registration, check by username
        if (data.username) {
            const existingByUsername = await prisma.user.findFirst({
                where: { username: data.username as any, deletedAt: null },
            });
            if (existingByUsername) {
                throw new Error('Bu username bilan xodim allaqachon mavjud');
            }
        }

        if (data.telegramId !== BigInt(0)) {
            const existing = await prisma.user.findUnique({
                where: { telegramId: data.telegramId },
            });

            if (existing) {
                if (existing.deletedAt) {
                    const user = await prisma.user.update({
                        where: { id: existing.id },
                        data: {
                            name: data.name,
                            salary: data.salary,
                            isActive: true,
                            deletedAt: null,
                            username: (data.username || existing.username) as any,
                            role: (data.role || existing.role) as any,
                        },
                    });
                    await AuditService.log(addedByUserId, 'REACTIVATE_EMPLOYEE', 'User', user.id, { name: data.name });
                    return user;
                }
                throw new Error('Bu Telegram ID bilan xodim allaqachon mavjud');
            }
        }

        // For username-based registration, generate a unique negative placeholder telegramId
        // It will be replaced with the real one when the employee sends /start
        const finalTelegramId = data.telegramId === BigInt(0)
            ? BigInt(-Date.now())
            : data.telegramId;

        const user = await prisma.user.create({
            data: {
                telegramId: finalTelegramId,
                username: (data.username || null) as any,
                name: data.name,
                role: (data.role || Role.EMPLOYEE) as any,
                salary: data.salary,
            },
        });

        await AuditService.log(addedByUserId, 'ADD_EMPLOYEE', 'User', user.id, { name: data.name });
        return user;
    }

    static async removeEmployee(id: number, removedByUserId: number) {
        const user = await prisma.user.update({
            where: { id },
            data: { isActive: false, deletedAt: new Date() },
        });

        await AuditService.log(removedByUserId, 'REMOVE_EMPLOYEE', 'User', id, { name: user.name });
        return user;
    }

    static async updateSalary(id: number, salary: number, updatedByUserId: number) {
        const user = await prisma.user.update({
            where: { id },
            data: { salary },
        });

        await AuditService.log(updatedByUserId, 'UPDATE_SALARY', 'User', id, {
            name: user.name,
            salary,
        });

        return user;
    }
}

export class AttendanceService {
    static async markAttendance(userId: number, date: Date, present: boolean) {
        const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        return prisma.attendance.upsert({
            where: {
                userId_date: { userId, date: dateOnly },
            },
            create: { userId, date: dateOnly, present },
            update: { present },
        });
    }

    static async getAttendance(userId: number, from: Date, to: Date) {
        return prisma.attendance.findMany({
            where: {
                userId,
                date: { gte: from, lte: to },
            },
            orderBy: { date: 'desc' },
        });
    }

    static async getWorkingDays(userId: number, from: Date, to: Date): Promise<number> {
        const count = await prisma.attendance.count({
            where: {
                userId,
                date: { gte: from, lte: to },
                present: true,
            },
        });
        return count;
    }

    static async calculateSalary(userId: number, month: number, year: number) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('Employee not found');

        const from = new Date(year, month - 1, 1);
        const to = new Date(year, month, 0); // last day of month
        const totalDaysInMonth = to.getDate();

        const workingDays = await this.getWorkingDays(userId, from, to);
        const dailyRate = user.salary / totalDaysInMonth;
        const calculatedSalary = dailyRate * workingDays;

        return {
            employee: user,
            month,
            year,
            totalDaysInMonth,
            workingDays,
            monthlySalary: user.salary,
            dailyRate,
            calculatedSalary: Math.round(calculatedSalary * 100) / 100,
        };
    }

    static async getTodayAttendance() {
        const today = new Date();
        const dateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        return prisma.attendance.findMany({
            where: { date: dateOnly },
            include: { user: { select: { name: true, role: true } } },
        });
    }
}
