import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Modal } from '../components/Modal';
import { toast, ToastProvider } from '../components/Toast';
import { hapticSuccess } from '../lib/telegram';

interface Table {
    id: number; number: number; name: string | null; isActive: boolean;
}

export default function Tables() {
    const [tables, setTables] = useState<Table[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);

    const [tableNum, setTableNum] = useState('');
    const [tableName, setTableName] = useState('');

    const load = () => {
        setLoading(true);
        api.get<Table[]>('/tables').then(setTables).finally(() => setLoading(false));
    };

    useEffect(load, []);

    const handleAdd = async () => {
        try {
            await api.post('/tables', {
                number: parseInt(tableNum),
                name: tableName || undefined,
            });
            hapticSuccess();
            toast('Stol qo\'shildi!');
            setShowAdd(false);
            setTableNum(''); setTableName('');
            load();
        } catch (err: any) {
            toast(err.message, 'error');
        }
    };

    const handleRemove = async (num: number) => {
        try {
            await api.del(`/tables/${num}`);
            hapticSuccess();
            toast('Stol o\'chirildi');
            load();
        } catch (err: any) {
            toast(err.message, 'error');
        }
    };

    return (
        <div>
            <ToastProvider />
            <div className="page-header">
                <span className="emoji">🪑</span>
                <h1>Stollar</h1>
            </div>

            <div className="action-bar">
                <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>➕ Stol Qo'shish</button>
            </div>

            {loading ? (
                <div className="loading"><div className="spinner" /></div>
            ) : tables.length === 0 ? (
                <div className="empty-state">
                    <span className="emoji">🪑</span>
                    <p>Stollar topilmadi</p>
                </div>
            ) : (
                <div className="nav-grid">
                    {tables.map(t => (
                        <div key={t.id} className="card" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', marginBottom: 8 }}>🪑</div>
                            <div className="font-bold">Stol {t.number}</div>
                            {t.name && <div className="text-sm text-muted">{t.name}</div>}
                            <button className="btn btn-ghost btn-sm mt-3 w-full" onClick={() => handleRemove(t.number)}>
                                🗑 O'chirish
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Yangi Stol">
                <div className="form-group">
                    <label className="form-label">Stol raqami</label>
                    <input className="form-input" type="number" value={tableNum} onChange={e => setTableNum(e.target.value)} placeholder="1" />
                </div>
                <div className="form-group">
                    <label className="form-label">Nomi (ixtiyoriy)</label>
                    <input className="form-input" value={tableName} onChange={e => setTableName(e.target.value)} placeholder="Masalan: VIP" />
                </div>
                <button className="btn btn-primary btn-block mt-3" onClick={handleAdd} disabled={!tableNum}>
                    ✅ Qo'shish
                </button>
            </Modal>
        </div>
    );
}
