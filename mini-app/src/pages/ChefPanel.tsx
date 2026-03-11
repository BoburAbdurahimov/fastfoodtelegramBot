import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { toast, ToastProvider } from '../components/Toast';
import { hapticSuccess } from '../lib/telegram';

interface OrderItem { id: number; quantity: number; unitPrice: number; menuItem: { name: string }; }
interface Order {
    id: number; orderNumber: number; clientName: string;
    status: string; totalPrice: number; createdAt: string;
    tableNumber: number | null; items: OrderItem[];
}

const STATUS_LABELS: Record<string, string> = {
    NEW: 'Yangi', PREPARING: 'Tayyorlanmoqda', READY: 'Tayyor',
    COMPLETED: 'Bajarildi', CANCELLED: 'Bekor qilindi',
};
const STATUS_BADGE: Record<string, string> = {
    NEW: 'badge-new', PREPARING: 'badge-preparing', READY: 'badge-ready',
    COMPLETED: 'badge-completed', CANCELLED: 'badge-cancelled',
};

export default function ChefPanel() {
    const [newOrders, setNewOrders] = useState<Order[]>([]);
    const [preparing, setPreparing] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'new' | 'preparing'>('new');

    const load = async () => {
        setLoading(true);
        try {
            const [nRes, pRes] = await Promise.all([
                api.get<{ orders: Order[] }>('/orders?status=NEW'),
                api.get<{ orders: Order[] }>('/orders?status=PREPARING'),
            ]);
            setNewOrders(nRes.orders);
            setPreparing(pRes.orders);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    // Auto-refresh every 30s
    useEffect(() => {
        const interval = setInterval(load, 30000);
        return () => clearInterval(interval);
    }, []);

    const updateStatus = async (id: number, status: string) => {
        try {
            await api.post(`/orders/${id}/status`, { status });
            hapticSuccess();
            toast(`Status: ${STATUS_LABELS[status]}`);
            load();
        } catch (err: any) {
            toast(err.message, 'error');
        }
    };

    const orders = tab === 'new' ? newOrders : preparing;

    return (
        <div>
            <ToastProvider />
            <div className="page-header">
                <span className="emoji">👨‍🍳</span>
                <h1>Oshpaz Paneli</h1>
            </div>

            <div className="tabs mb-3">
                <button className={`tab ${tab === 'new' ? 'active' : ''}`} onClick={() => setTab('new')}>
                    🔔 Yangi ({newOrders.length})
                </button>
                <button className={`tab ${tab === 'preparing' ? 'active' : ''}`} onClick={() => setTab('preparing')}>
                    🔥 Tayyorlanayotgan ({preparing.length})
                </button>
            </div>

            {loading ? (
                <div className="loading"><div className="spinner" /></div>
            ) : orders.length === 0 ? (
                <div className="empty-state">
                    <span className="emoji">{tab === 'new' ? '🔔' : '🔥'}</span>
                    <p>{tab === 'new' ? 'Yangi buyurtmalar yo\'q' : 'Tayyorlanayotgan buyurtmalar yo\'q'}</p>
                </div>
            ) : (
                orders.map(order => (
                    <div key={order.id} className="card animate-pop">
                        <div className="card-row">
                            <div>
                                <div className="card-title">#{order.orderNumber}</div>
                                <div className="card-subtitle">
                                    {new Date(order.createdAt).toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' })}
                                    {order.tableNumber && ` · Stol ${order.tableNumber}`}
                                </div>
                            </div>
                            <span className={`badge ${STATUS_BADGE[order.status]}`}>{STATUS_LABELS[order.status]}</span>
                        </div>

                        <div className="mt-2">
                            {order.items.map(item => (
                                <div key={item.id} className="text-sm" style={{ padding: '2px 0' }}>
                                    <strong>{item.quantity}×</strong> {item.menuItem.name}
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2 mt-3">
                            {order.status === 'NEW' && (
                                <button className="btn btn-warning btn-sm btn-block" onClick={() => updateStatus(order.id, 'PREPARING')}>
                                    🔥 Tayyorlashni Boshlash
                                </button>
                            )}
                            {order.status === 'PREPARING' && (
                                <button className="btn btn-success btn-sm btn-block" onClick={() => updateStatus(order.id, 'READY')}>
                                    ✅ Tayyor
                                </button>
                            )}
                        </div>
                    </div>
                ))
            )}

            <button className="btn btn-ghost btn-block mt-4" onClick={load}>🔄 Yangilash</button>
        </div>
    );
}
