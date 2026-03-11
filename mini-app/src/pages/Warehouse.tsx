import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Modal } from '../components/Modal';
import { toast, ToastProvider } from '../components/Toast';
import { hapticSuccess } from '../lib/telegram';

interface Product {
    id: number;
    name: string;
    unit: string;
    costPerUnit: number;
    quantity: number;
    lowStockThreshold: number;
}

export default function Warehouse() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [stockModal, setStockModal] = useState<{ product: Product; action: 'add' | 'remove' } | null>(null);

    // Add form
    const [name, setName] = useState('');
    const [unit, setUnit] = useState('PCS');
    const [costPerUnit, setCostPerUnit] = useState('');
    const [quantity, setQuantity] = useState('');
    const [lowStockThreshold, setLowStockThreshold] = useState('5');

    // Stock form
    const [stockQty, setStockQty] = useState('');
    const [stockNote, setStockNote] = useState('');

    const load = () => {
        setLoading(true);
        api.get<Product[]>('/warehouse').then(setProducts).finally(() => setLoading(false));
    };

    useEffect(load, []);

    const handleAdd = async () => {
        try {
            await api.post('/warehouse', {
                name, unit, costPerUnit: parseFloat(costPerUnit),
                quantity: parseFloat(quantity || '0'),
                lowStockThreshold: parseFloat(lowStockThreshold || '5'),
            });
            hapticSuccess();
            toast('Mahsulot qo\'shildi!');
            setShowAdd(false);
            setName(''); setCostPerUnit(''); setQuantity(''); setLowStockThreshold('5');
            load();
        } catch (err: any) {
            toast(err.message, 'error');
        }
    };

    const handleStock = async () => {
        if (!stockModal) return;
        try {
            const endpoint = stockModal.action === 'add' ? 'add-stock' : 'remove-stock';
            await api.post(`/warehouse/${stockModal.product.id}/${endpoint}`, {
                quantity: parseFloat(stockQty),
                note: stockNote || undefined,
            });
            hapticSuccess();
            toast(stockModal.action === 'add' ? 'Zaxira qo\'shildi!' : 'Zaxiradan olindi!');
            setStockModal(null);
            setStockQty(''); setStockNote('');
            load();
        } catch (err: any) {
            toast(err.message, 'error');
        }
    };

    return (
        <div>
            <ToastProvider />
            <div className="page-header">
                <span className="emoji">📦</span>
                <h1>Ombor</h1>
            </div>

            <div className="action-bar">
                <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>➕ Qo'shish</button>
            </div>

            {loading ? (
                <div className="loading"><div className="spinner" /></div>
            ) : products.length === 0 ? (
                <div className="empty-state">
                    <span className="emoji">📦</span>
                    <p>Mahsulotlar topilmadi</p>
                </div>
            ) : (
                products.map(p => (
                    <div key={p.id} className="card">
                        <div className="card-row">
                            <div>
                                <div className="card-title">{p.name}</div>
                                <div className="card-subtitle">
                                    {p.quantity} {p.unit} · {p.costPerUnit.toLocaleString()} so'm/birlik
                                </div>
                            </div>
                            {p.quantity <= p.lowStockThreshold && (
                                <span className="badge badge-cancelled">⚠️ Kam</span>
                            )}
                        </div>
                        <div className="flex gap-2 mt-3">
                            <button className="btn btn-success btn-sm" onClick={() => { setStockModal({ product: p, action: 'add' }); setStockQty(''); }}>
                                📥 Qo'shish
                            </button>
                            <button className="btn btn-warning btn-sm" onClick={() => { setStockModal({ product: p, action: 'remove' }); setStockQty(''); }}>
                                📤 Olish
                            </button>
                        </div>
                    </div>
                ))
            )}

            {/* Add Product Modal */}
            <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Yangi Mahsulot">
                <div className="form-group">
                    <label className="form-label">Nomi</label>
                    <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Masalan: Go'sht" />
                </div>
                <div className="form-group">
                    <label className="form-label">O'lchov birligi</label>
                    <select className="form-select" value={unit} onChange={e => setUnit(e.target.value)}>
                        <option value="PCS">Dona (PCS)</option>
                        <option value="KG">Kilogramm (KG)</option>
                        <option value="GRAM">Gramm</option>
                        <option value="LITER">Litr</option>
                        <option value="ML">Millilitr</option>
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Narxi (birlik uchun)</label>
                    <input className="form-input" type="number" value={costPerUnit} onChange={e => setCostPerUnit(e.target.value)} placeholder="0" />
                </div>
                <div className="form-group">
                    <label className="form-label">Boshlang'ich miqdor</label>
                    <input className="form-input" type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0" />
                </div>
                <div className="form-group">
                    <label className="form-label">Kam qolish chegarasi</label>
                    <input className="form-input" type="number" value={lowStockThreshold} onChange={e => setLowStockThreshold(e.target.value)} placeholder="5" />
                </div>
                <button className="btn btn-primary btn-block mt-3" onClick={handleAdd} disabled={!name || !costPerUnit}>
                    ✅ Qo'shish
                </button>
            </Modal>

            {/* Stock Modal */}
            <Modal
                open={!!stockModal}
                onClose={() => setStockModal(null)}
                title={stockModal ? `${stockModal.action === 'add' ? '📥 Zaxira Qo\'shish' : '📤 Zaxiradan Olish'}: ${stockModal.product.name}` : ''}
            >
                <div className="form-group">
                    <label className="form-label">Miqdor ({stockModal?.product.unit})</label>
                    <input className="form-input" type="number" value={stockQty} onChange={e => setStockQty(e.target.value)} placeholder="0" />
                </div>
                <div className="form-group">
                    <label className="form-label">Izoh (ixtiyoriy)</label>
                    <input className="form-input" value={stockNote} onChange={e => setStockNote(e.target.value)} placeholder="Izoh..." />
                </div>
                <button
                    className={`btn ${stockModal?.action === 'add' ? 'btn-success' : 'btn-warning'} btn-block mt-3`}
                    onClick={handleStock}
                    disabled={!stockQty || parseFloat(stockQty) <= 0}
                >
                    ✅ Tasdiqlash
                </button>
            </Modal>
        </div>
    );
}
