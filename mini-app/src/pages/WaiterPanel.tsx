import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { toast, ToastProvider } from '../components/Toast';
import { hapticSuccess } from '../lib/telegram';

interface OrderItem { id: number; quantity: number; unitPrice: number; menuItem: { name: string }; }
interface Order {
    id: number; orderNumber: number; clientName: string;
    status: string; totalPrice: number; createdAt: string;
    tableNumber: number | null; isPaid: boolean;
    paymentMethod: string | null; items: OrderItem[];
}

const STATUS_LABELS: Record<string, string> = {
    NEW: 'Yangi', PREPARING: 'Tayyorlanmoqda', READY: 'Tayyor',
    COMPLETED: 'Bajarildi', CANCELLED: 'Bekor qilindi',
};
const STATUS_BADGE: Record<string, string> = {
    NEW: 'badge-new', PREPARING: 'badge-preparing', READY: 'badge-ready',
    COMPLETED: 'badge-completed', CANCELLED: 'badge-cancelled',
};

export default function WaiterPanel() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true);
        api.get<Order[]>('/orders/today')
            .then(setOrders)
            .finally(() => setLoading(false));
    };

    useEffect(load, []);
    useEffect(() => { const i = setInterval(load, 30000); return () => clearInterval(i); }, []);

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

    return (
        <div>
            <ToastProvider />
            <div className="page-header">
                <span className="emoji">🧑‍🍳</span>
                <h1>Mening Buyurtmalarim</h1>
            </div>

            {loading ? (
                <div className="loading"><div className="spinner" /></div>
            ) : orders.length === 0 ? (
                <div className="empty-state">
                    <span className="emoji">📋</span>
                    <p>Bugungi buyurtmalar yo'q</p>
                </div>
            ) : (
                orders.map(order => (
                    <div key={order.id} className="card animate-pop">
                        <div className="card-row">
                            <div>
                                <div className="card-title">
                                    #{order.orderNumber}
                                    {order.clientName && ` — ${order.clientName}`}
                                </div>
                                <div className="card-subtitle">
                                    {new Date(order.createdAt).toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' })}
                                    {order.tableNumber && ` · Stol ${order.tableNumber}`}
                                </div>
                            </div>
                            <span className={`badge ${STATUS_BADGE[order.status]}`}>{STATUS_LABELS[order.status]}</span>
                        </div>

                        <div className="mt-2 text-sm">
                            {order.items.map(item => (
                                <div key={item.id}>{item.quantity}× {item.menuItem.name}</div>
                            ))}
                        </div>

                        <div className="card-row mt-2">
                            <span className="font-bold">{order.totalPrice.toLocaleString()} so'm</span>
                            {order.isPaid ? (
                                <span className="badge badge-completed">💳 {order.paymentMethod}</span>
                            ) : order.status === 'READY' ? (
                                <span className="badge badge-preparing">⏳ To'lanmagan</span>
                            ) : null}
                        </div>

                        <div className="flex gap-2 mt-3">
                            {order.status === 'READY' && (
                                <button className="btn btn-success btn-sm" onClick={() => updateStatus(order.id, 'COMPLETED')}>
                                    ✅ Yetkazildi
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
