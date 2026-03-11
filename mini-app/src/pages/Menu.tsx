import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Modal } from '../components/Modal';
import { toast, ToastProvider } from '../components/Toast';
import { hapticSuccess } from '../lib/telegram';

interface Category { id: number; name: string; menuItems: any[]; }
interface MenuItem {
    id: number; name: string; price: number; isActive: boolean;
    isTracked: boolean; stockQuantity: number; categoryId: number;
    category: { name: string };
}

export default function Menu() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [items, setItems] = useState<MenuItem[]>([]);
    const [activeTab, setActiveTab] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAddItem, setShowAddItem] = useState(false);
    const [showAddCat, setShowAddCat] = useState(false);

    // Add item form
    const [itemName, setItemName] = useState('');
    const [itemPrice, setItemPrice] = useState('');
    const [itemCatId, setItemCatId] = useState('');

    // Add category form
    const [catName, setCatName] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const [cats, menuItems] = await Promise.all([
                api.get<Category[]>('/categories'),
                api.get<MenuItem[]>('/menu'),
            ]);
            setCategories(cats);
            setItems(menuItems);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = activeTab ? items.filter(i => i.categoryId === activeTab) : items;

    const handleAddItem = async () => {
        try {
            await api.post('/menu', {
                name: itemName,
                price: parseFloat(itemPrice),
                categoryId: parseInt(itemCatId),
            });
            hapticSuccess();
            toast('Taom qo\'shildi!');
            setShowAddItem(false);
            setItemName(''); setItemPrice(''); setItemCatId('');
            load();
        } catch (err: any) {
            toast(err.message, 'error');
        }
    };

    const handleAddCat = async () => {
        try {
            await api.post('/categories', { name: catName });
            hapticSuccess();
            toast('Kategoriya qo\'shildi!');
            setShowAddCat(false);
            setCatName('');
            load();
        } catch (err: any) {
            toast(err.message, 'error');
        }
    };

    const toggleActive = async (id: number) => {
        try {
            await api.post(`/menu/${id}/toggle-active`);
            load();
        } catch (err: any) {
            toast(err.message, 'error');
        }
    };

    return (
        <div>
            <ToastProvider />
            <div className="page-header">
                <span className="emoji">🍔</span>
                <h1>Menyu</h1>
            </div>

            <div className="action-bar">
                <button className="btn btn-primary btn-sm" onClick={() => setShowAddItem(true)}>➕ Taom</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowAddCat(true)}>📂 Kategoriya</button>
            </div>

            {/* Category Tabs */}
            <div className="tabs">
                <button className={`tab ${!activeTab ? 'active' : ''}`} onClick={() => setActiveTab(null)}>
                    Barchasi
                </button>
                {categories.map(c => (
                    <button
                        key={c.id}
                        className={`tab ${activeTab === c.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(c.id)}
                    >
                        {c.name}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="loading"><div className="spinner" /></div>
            ) : filtered.length === 0 ? (
                <div className="empty-state">
                    <span className="emoji">🍔</span>
                    <p>Taomlar topilmadi</p>
                </div>
            ) : (
                filtered.map(item => (
                    <div key={item.id} className="card">
                        <div className="card-row">
                            <div>
                                <div className="card-title">
                                    {item.name}
                                    {!item.isActive && <span className="badge badge-inactive" style={{ marginLeft: 8 }}>Nofaol</span>}
                                </div>
                                <div className="card-subtitle">
                                    {item.price.toLocaleString()} so'm · {item.category.name}
                                    {item.isTracked && ` · Qoldiq: ${item.stockQuantity} ta`}
                                </div>
                            </div>
                            <button
                                className={`btn btn-sm ${item.isActive ? 'btn-ghost' : 'btn-success'}`}
                                onClick={() => toggleActive(item.id)}
                            >
                                {item.isActive ? '⏸' : '▶️'}
                            </button>
                        </div>
                    </div>
                ))
            )}

            {/* Add Item Modal */}
            <Modal open={showAddItem} onClose={() => setShowAddItem(false)} title="Yangi Taom">
                <div className="form-group">
                    <label className="form-label">Taom nomi</label>
                    <input className="form-input" value={itemName} onChange={e => setItemName(e.target.value)} placeholder="Masalan: Osh" />
                </div>
                <div className="form-group">
                    <label className="form-label">Narxi (so'm)</label>
                    <input className="form-input" type="number" value={itemPrice} onChange={e => setItemPrice(e.target.value)} placeholder="0" />
                </div>
                <div className="form-group">
                    <label className="form-label">Kategoriya</label>
                    <select className="form-select" value={itemCatId} onChange={e => setItemCatId(e.target.value)}>
                        <option value="">Tanlang...</option>
                        {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
                <button className="btn btn-primary btn-block mt-3" onClick={handleAddItem} disabled={!itemName || !itemPrice || !itemCatId}>
                    ✅ Qo'shish
                </button>
            </Modal>

            {/* Add Category Modal */}
            <Modal open={showAddCat} onClose={() => setShowAddCat(false)} title="Yangi Kategoriya">
                <div className="form-group">
                    <label className="form-label">Kategoriya nomi</label>
                    <input className="form-input" value={catName} onChange={e => setCatName(e.target.value)} placeholder="Masalan: Taomlar" />
                </div>
                <button className="btn btn-primary btn-block mt-3" onClick={handleAddCat} disabled={!catName}>
                    ✅ Qo'shish
                </button>
            </Modal>
        </div>
    );
}
