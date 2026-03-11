import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { toast, ToastProvider } from '../components/Toast';
import { haptic, hapticSuccess } from '../lib/telegram';

interface MenuItem {
    id: number; name: string; price: number; isActive: boolean;
    category: { name: string };
}
interface Category { id: number; name: string; }
interface CartItem { menuItemId: number; name: string; price: number; quantity: number; }

interface Table { id: number; number: number; name: string | null; }

export default function NewOrder() {
    const navigate = useNavigate();
    const [items, setItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [tables, setTables] = useState<Table[]>([]);
    const [activeTab, setActiveTab] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    // Cart
    const [cart, setCart] = useState<CartItem[]>([]);
    const [clientName, setClientName] = useState('');
    const [orderType, setOrderType] = useState('DINEIN');
    const [tableNumber, setTableNumber] = useState<number | undefined>();
    const [submitting, setSubmitting] = useState(false);

    const [step, setStep] = useState<'menu' | 'cart'>('menu');

    useEffect(() => {
        Promise.all([
            api.get<MenuItem[]>('/menu/active'),
            api.get<Category[]>('/categories'),
            api.get<Table[]>('/tables'),
        ]).then(([m, c, t]) => {
            setItems(m);
            setCategories(c);
            setTables(t);
        }).finally(() => setLoading(false));
    }, []);

    const filtered = activeTab ? items.filter(i => i.category && (i as any).categoryId === activeTab) : items;

    const addToCart = (item: MenuItem) => {
        haptic();
        setCart(prev => {
            const existing = prev.find(c => c.menuItemId === item.id);
            if (existing) {
                return prev.map(c => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
            }
            return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }];
        });
    };

    const updateQty = (menuItemId: number, delta: number) => {
        haptic();
        setCart(prev => {
            return prev.map(c => {
                if (c.menuItemId !== menuItemId) return c;
                const newQty = c.quantity + delta;
                return newQty <= 0 ? null : { ...c, quantity: newQty };
            }).filter(Boolean) as CartItem[];
        });
    };

    const totalPrice = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            await api.post('/orders', {
                clientName: clientName || undefined,
                items: cart.map(c => ({ menuItemId: c.menuItemId, quantity: c.quantity })),
                tableNumber,
                orderType,
            });
            hapticSuccess();
            toast('Buyurtma yaratildi!');
            setCart([]);
            setTimeout(() => navigate('/orders'), 500);
        } catch (err: any) {
            toast(err.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="loading"><div className="spinner" /></div>;

    return (
        <div>
            <ToastProvider />
            <div className="page-header">
                <span className="emoji">🆕</span>
                <h1>Yangi Buyurtma</h1>
            </div>

            {step === 'menu' ? (
                <>
                    {/* Category tabs */}
                    <div className="tabs">
                        <button className={`tab ${!activeTab ? 'active' : ''}`} onClick={() => setActiveTab(null)}>Barchasi</button>
                        {categories.map(c => (
                            <button key={c.id} className={`tab ${activeTab === c.id ? 'active' : ''}`} onClick={() => setActiveTab(c.id)}>
                                {c.name}
                            </button>
                        ))}
                    </div>

                    {/* Menu items grid */}
                    {filtered.map(item => {
                        const inCart = cart.find(c => c.menuItemId === item.id);
                        return (
                            <div key={item.id} className="card" onClick={() => addToCart(item)} style={{ cursor: 'pointer' }}>
                                <div className="card-row">
                                    <div>
                                        <div className="card-title">{item.name}</div>
                                        <div className="card-subtitle">{item.price.toLocaleString()} so'm</div>
                                    </div>
                                    {inCart && (
                                        <span className="badge badge-new">{inCart.quantity} ta</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {cart.length > 0 && (
                        <button
                            className="btn btn-primary btn-block mt-4"
                            onClick={() => setStep('cart')}
                            style={{ position: 'sticky', bottom: 80, zIndex: 10 }}
                        >
                            🛒 Savat ({cart.length} ta · {totalPrice.toLocaleString()} so'm)
                        </button>
                    )}
                </>
            ) : (
                <>
                    {/* Cart view */}
                    <button className="btn btn-ghost btn-sm mb-3" onClick={() => setStep('menu')}>← Menyuga qaytish</button>

                    {cart.map(item => (
                        <div key={item.menuItemId} className="cart-item">
                            <div className="cart-item-info">
                                <div className="cart-item-name">{item.name}</div>
                                <div className="cart-item-price">{(item.price * item.quantity).toLocaleString()} so'm</div>
                            </div>
                            <div className="qty-control">
                                <button className="qty-btn" onClick={() => updateQty(item.menuItemId, -1)}>−</button>
                                <span style={{ minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                                <button className="qty-btn" onClick={() => updateQty(item.menuItemId, 1)}>+</button>
                            </div>
                        </div>
                    ))}

                    <div className="card mt-4">
                        <div className="form-group">
                            <label className="form-label">Mijoz ismi (ixtiyoriy)</label>
                            <input className="form-input" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Ism..." />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Buyurtma turi</label>
                            <select className="form-select" value={orderType} onChange={e => setOrderType(e.target.value)}>
                                <option value="DINEIN">Zalda</option>
                                <option value="TAKEOUT">Olib ketish</option>
                                <option value="DELIVERY">Yetkazib berish</option>
                            </select>
                        </div>
                        {orderType === 'DINEIN' && tables.length > 0 && (
                            <div className="form-group">
                                <label className="form-label">Stol</label>
                                <select className="form-select" value={tableNumber || ''} onChange={e => setTableNumber(e.target.value ? parseInt(e.target.value) : undefined)}>
                                    <option value="">Tanlanmagan</option>
                                    {tables.map(t => (
                                        <option key={t.id} value={t.number}>Stol {t.number}{t.name ? ` (${t.name})` : ''}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="card mt-3">
                        <div className="card-row">
                            <span className="font-bold">Jami:</span>
                            <span className="font-bold text-accent">{totalPrice.toLocaleString()} so'm</span>
                        </div>
                    </div>

                    <button
                        className="btn btn-success btn-block mt-3"
                        onClick={handleSubmit}
                        disabled={submitting || cart.length === 0}
                    >
                        {submitting ? 'Yuborilmoqda...' : '✅ Buyurtma berish'}
                    </button>
                </>
            )}
        </div>
    );
}
