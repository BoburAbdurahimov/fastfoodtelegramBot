import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Modal } from '../components/Modal';
import { toast, ToastProvider } from '../components/Toast';
import { hapticSuccess } from '../lib/telegram';

interface Expense {
    id: number; type: string; amount: number; date: string;
    description: string | null; recurring: boolean;
    user: { name: string };
}

const EXPENSE_TYPES = ['Oziq-ovqat', 'Transport', 'Kommunal', 'Jihozlar', 'Boshqa'];

export default function Expenses() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [summary, setSummary] = useState<{ total: number; byType: any[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [tab, setTab] = useState<'list' | 'summary'>('list');

    // Form
    const [type, setType] = useState(EXPENSE_TYPES[0]);
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [recurring, setRecurring] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [exp, summ] = await Promise.all([
                api.get<Expense[]>('/expenses'),
                api.get<any>('/expenses/summary'),
            ]);
            setExpenses(exp);
            setSummary(summ);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleAdd = async () => {
        try {
            await api.post('/expenses', {
                type, amount: parseFloat(amount), description: description || undefined,
                date, recurring,
            });
            hapticSuccess();
            toast('Xarajat qo\'shildi!');
            setShowAdd(false);
            setAmount(''); setDescription(''); setRecurring(false);
            load();
        } catch (err: any) {
            toast(err.message, 'error');
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await api.del(`/expenses/${id}`);
            hapticSuccess();
            toast('Xarajat o\'chirildi');
            load();
        } catch (err: any) {
            toast(err.message, 'error');
        }
    };

    return (
        <div>
            <ToastProvider />
            <div className="page-header">
                <span className="emoji">💸</span>
                <h1>Xarajatlar</h1>
            </div>

            <div className="action-bar">
                <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>➕ Qo'shish</button>
                <button className={`tab ${tab === 'list' ? 'active' : ''}`} onClick={() => setTab('list')}>Ro'yxat</button>
                <button className={`tab ${tab === 'summary' ? 'active' : ''}`} onClick={() => setTab('summary')}>Hisobot</button>
            </div>

            {loading ? (
                <div className="loading"><div className="spinner" /></div>
            ) : tab === 'list' ? (
                expenses.length === 0 ? (
                    <div className="empty-state">
                        <span className="emoji">💸</span>
                        <p>Xarajatlar topilmadi</p>
                    </div>
                ) : (
                    expenses.map(exp => (
                        <div key={exp.id} className="card">
                            <div className="card-row">
                                <div>
                                    <div className="card-title">{exp.type}</div>
                                    <div className="card-subtitle">
                                        {new Date(exp.date).toLocaleDateString('uz')}
                                        {exp.description && ` · ${exp.description}`}
                                        {exp.recurring && ' 🔄'}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div className="font-bold text-danger">-{exp.amount.toLocaleString()}</div>
                                    <div className="text-xs text-muted">{exp.user.name}</div>
                                </div>
                            </div>
                            <button className="btn btn-ghost btn-sm mt-2" onClick={() => handleDelete(exp.id)}>🗑 O'chirish</button>
                        </div>
                    ))
                )
            ) : (
                /* Summary */
                summary && (
                    <div>
                        <div className="stat-grid">
                            <div className="stat-card">
                                <div className="stat-value text-danger">{summary.total.toLocaleString()}</div>
                                <div className="stat-label">Jami xarajat</div>
                            </div>
                        </div>
                        {summary.byType.map((bt: any, i: number) => (
                            <div key={i} className="card">
                                <div className="card-row">
                                    <span>{bt.type}</span>
                                    <span className="font-bold">{(bt._sum?.amount || 0).toLocaleString()} so'm</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* Add Expense Modal */}
            <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Yangi Xarajat">
                <div className="form-group">
                    <label className="form-label">Turi</label>
                    <select className="form-select" value={type} onChange={e => setType(e.target.value)}>
                        {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Miqdor (so'm)</label>
                    <input className="form-input" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
                </div>
                <div className="form-group">
                    <label className="form-label">Sana</label>
                    <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className="form-group">
                    <label className="form-label">Izoh (ixtiyoriy)</label>
                    <input className="form-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Izoh..." />
                </div>
                <div className="form-group flex items-center gap-2">
                    <input type="checkbox" checked={recurring} onChange={e => setRecurring(e.target.checked)} id="recurring" />
                    <label htmlFor="recurring" className="form-label" style={{ margin: 0 }}>Takroriy xarajat 🔄</label>
                </div>
                <button className="btn btn-primary btn-block mt-3" onClick={handleAdd} disabled={!amount}>
                    ✅ Qo'shish
                </button>
            </Modal>
        </div>
    );
}
