import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Modal } from '../components/Modal';
import { toast, ToastProvider } from '../components/Toast';
import { hapticSuccess } from '../lib/telegram';

interface Employee {
    id: number; name: string; role: string; salary: number;
    telegramId: string; username: string | null; isActive: boolean;
}

interface AttendanceRecord {
    id: number; userId: number; date: string; present: boolean;
    user?: { name: string; role: string };
}

const ROLE_LABELS: Record<string, string> = {
    EMPLOYER: '👑 Egasi', WAITER: '🧑‍🍳 Ofitsiant', CHEF: '👨‍🍳 Oshpaz', EMPLOYEE: '👤 Xodim',
};

export default function Employees() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'list' | 'attendance' | 'salary'>('list');
    const [showAdd, setShowAdd] = useState(false);
    const [salaryData, setSalaryData] = useState<any>(null);
    const [selectedEmp, setSelectedEmp] = useState<number | null>(null);

    // Form
    const [empName, setEmpName] = useState('');
    const [empUsername, setEmpUsername] = useState('');
    const [empSalary, setEmpSalary] = useState('');
    const [empRole, setEmpRole] = useState('EMPLOYEE');

    const load = async () => {
        setLoading(true);
        try {
            const [emps, att] = await Promise.all([
                api.get<Employee[]>('/employees'),
                api.get<AttendanceRecord[]>('/attendance/today'),
            ]);
            setEmployees(emps);
            setAttendance(att);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleAdd = async () => {
        try {
            await api.post('/employees', {
                name: empName,
                username: empUsername || undefined,
                salary: parseFloat(empSalary),
                role: empRole,
                telegramId: '0',
            });
            hapticSuccess();
            toast('Xodim qo\'shildi!');
            setShowAdd(false);
            setEmpName(''); setEmpUsername(''); setEmpSalary('');
            load();
        } catch (err: any) {
            toast(err.message, 'error');
        }
    };

    const handleRemove = async (id: number) => {
        try {
            await api.del(`/employees/${id}`);
            hapticSuccess();
            toast('Xodim o\'chirildi');
            load();
        } catch (err: any) {
            toast(err.message, 'error');
        }
    };

    const toggleAttendance = async (userId: number, present: boolean) => {
        try {
            await api.post('/attendance', {
                userId,
                date: new Date().toISOString(),
                present,
            });
            hapticSuccess();
            load();
        } catch (err: any) {
            toast(err.message, 'error');
        }
    };

    const loadSalary = async (userId: number) => {
        try {
            const data = await api.get<any>(`/salary/${userId}`);
            setSalaryData(data);
            setSelectedEmp(userId);
        } catch (err: any) {
            toast(err.message, 'error');
        }
    };

    const isPresent = (userId: number) => {
        return attendance.some(a => a.userId === userId && a.present);
    };

    return (
        <div>
            <ToastProvider />
            <div className="page-header">
                <span className="emoji">👥</span>
                <h1>Xodimlar</h1>
            </div>

            <div className="action-bar">
                <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>➕ Qo'shish</button>
                <button className={`tab ${tab === 'list' ? 'active' : ''}`} onClick={() => setTab('list')}>Ro'yxat</button>
                <button className={`tab ${tab === 'attendance' ? 'active' : ''}`} onClick={() => setTab('attendance')}>Davomat</button>
                <button className={`tab ${tab === 'salary' ? 'active' : ''}`} onClick={() => setTab('salary')}>Maosh</button>
            </div>

            {loading ? (
                <div className="loading"><div className="spinner" /></div>
            ) : tab === 'list' ? (
                employees.length === 0 ? (
                    <div className="empty-state">
                        <span className="emoji">👥</span>
                        <p>Xodimlar topilmadi</p>
                    </div>
                ) : (
                    employees.map(emp => (
                        <div key={emp.id} className="card">
                            <div className="card-row">
                                <div>
                                    <div className="card-title">{emp.name}</div>
                                    <div className="card-subtitle">
                                        {ROLE_LABELS[emp.role] || emp.role}
                                        {emp.username && ` · @${emp.username}`}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div className="font-bold">{emp.salary.toLocaleString()}</div>
                                    <div className="text-xs text-muted">so'm/oy</div>
                                </div>
                            </div>
                            <button className="btn btn-ghost btn-sm mt-2" onClick={() => handleRemove(emp.id)}>🗑 O'chirish</button>
                        </div>
                    ))
                )
            ) : tab === 'attendance' ? (
                /* Attendance tab */
                employees.map(emp => {
                    const present = isPresent(emp.id);
                    return (
                        <div key={emp.id} className="card">
                            <div className="card-row">
                                <div>
                                    <div className="card-title">{emp.name}</div>
                                    <div className="card-subtitle">{ROLE_LABELS[emp.role]}</div>
                                </div>
                                <button
                                    className={`btn btn-sm ${present ? 'btn-success' : 'btn-danger'}`}
                                    onClick={() => toggleAttendance(emp.id, !present)}
                                >
                                    {present ? '✅ Keldi' : '❌ Kelmadi'}
                                </button>
                            </div>
                        </div>
                    );
                })
            ) : (
                /* Salary tab */
                <div>
                    {employees.map(emp => (
                        <div key={emp.id} className="card" onClick={() => loadSalary(emp.id)} style={{ cursor: 'pointer' }}>
                            <div className="card-row">
                                <div className="card-title">{emp.name}</div>
                                <span className="text-accent">→</span>
                            </div>
                        </div>
                    ))}
                    {salaryData && (
                        <div className="card mt-4 animate-pop">
                            <h3 className="mb-3">{salaryData.employee.name} — Maosh Hisoboti</h3>
                            <div className="card-row">
                                <span>Oylik maosh</span>
                                <span className="font-bold">{salaryData.monthlySalary.toLocaleString()} so'm</span>
                            </div>
                            <div className="card-row">
                                <span>Ish kunlari</span>
                                <span>{salaryData.workingDays} / {salaryData.totalDaysInMonth}</span>
                            </div>
                            <div className="card-row">
                                <span>Kunlik stavka</span>
                                <span>{Math.round(salaryData.dailyRate).toLocaleString()} so'm</span>
                            </div>
                            <div className="card-row">
                                <span className="font-bold">Hisoblangan maosh</span>
                                <span className="font-bold text-success">{salaryData.calculatedSalary.toLocaleString()} so'm</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Add Employee Modal */}
            <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Yangi Xodim">
                <div className="form-group">
                    <label className="form-label">Ism</label>
                    <input className="form-input" value={empName} onChange={e => setEmpName(e.target.value)} placeholder="Ism Familiya" />
                </div>
                <div className="form-group">
                    <label className="form-label">Telegram username (ixtiyoriy)</label>
                    <input className="form-input" value={empUsername} onChange={e => setEmpUsername(e.target.value)} placeholder="username" />
                </div>
                <div className="form-group">
                    <label className="form-label">Rol</label>
                    <select className="form-select" value={empRole} onChange={e => setEmpRole(e.target.value)}>
                        <option value="EMPLOYEE">Xodim</option>
                        <option value="WAITER">Ofitsiant</option>
                        <option value="CHEF">Oshpaz</option>
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Oylik maosh (so'm)</label>
                    <input className="form-input" type="number" value={empSalary} onChange={e => setEmpSalary(e.target.value)} placeholder="0" />
                </div>
                <button className="btn btn-primary btn-block mt-3" onClick={handleAdd} disabled={!empName || !empSalary}>
                    ✅ Qo'shish
                </button>
            </Modal>
        </div>
    );
}
