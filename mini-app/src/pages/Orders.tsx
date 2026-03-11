import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { toast, ToastProvider } from '../components/Toast';
import { hapticSuccess } from '../lib/telegram';

interface OrderItem {
    id: number; quantity: number; unitPrice: number;
    menuItem: { name: string };
}
interface Order {
    id: number; orderNumber: number; clientName: string;
    orderType: string; tableNumber: number | null;
    totalPrice: number; status: string; isPaid: boolean;
    paymentMethod: string | null; createdAt: string;
    items: OrderItem[];
}

const STATUS_LABELS: Record<string, string> = {
    NEW: 'Yangi', PREPARING: 'Tayyorlanmoqda', READY: 'Tayyor',
    COMPLETED: 'Bajarildi', CANCELLED: 'Bekor qilindi', RETURNED: 'Qaytarildi',
};

const STATUS_BADGE: Record<string, string> = {
    NEW: 'badge-new', PREPARING: 'badge-preparing', READY: 'badge-ready',
    COMPLETED: 'badge-completed', CANCELLED: 'badge-cancelled', RETURNED: 'badge-returned',
};

const STATUSES = ['NEW', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED', 'RETURNED'];

export default function Orders() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    const load = () => {
        setLoading(true);
        const params = filter ? `?status=${filter}` : '';
        api.get<{ orders: Order[]; total: number }>(`/orders${params}`)
            .then(data => setOrders(data.orders))
            .finally(() => setLoading(false));
    };

    useEffect(load, [filter]);

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

    const markPaid = async (id: number, method: string) => {
        try {
            await api.post(`/orders/${id}/pay`, { method });
            hapticSuccess();
            toast('To\'lov qabul qilindi!');
            load();
        } catch (err: any) {
            toast(err.message, 'error');
        }
    };

    return (
        <div>
            <ToastProvider />
            <div className="page-header">
                <span className="emoji">📋</span>
                <h1>Buyurtmalar</h1>
            </div>

            <div className="tabs">
                <button className={`tab ${!filter ? 'active' : ''}`} onClick={() => setFilter('')}>Barchasi</button>
                {STATUSES.map(s => (
                    <button key={s} className={`tab ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
                        {STATUS_LABELS[s]}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="loading"><div className="spinner" /></div>
            ) : orders.length === 0 ? (
                <div className="empty-state">
                    <span className="emoji">📋</span>
                    <p>Buyurtmalar topilmadi</p>
                </div>
            ) : (
                orders.map(order => (
                    <div key={order.id} className="card">
                        <div className="card-row">
                            <div>
                                <div className="card-title">
                                    #{order.orderNumber}
                                    {order.clientName && ` — ${order.clientName}`}
                                </div>
                                <div className="card-subtitle">
                                    {new Date(order.createdAt).toLocaleString('uz')}
                                    {order.tableNumber && ` · Stol ${order.tableNumber}`}
                                </div>
                            </div>
                            <span className={`badge ${STATUS_BADGE[order.status]}`}>
                                {STATUS_LABELS[order.status]}
                            </span>
                        </div>

                        {/* Items */}
                        <div className="mt-2 text-sm text-muted">
                            {order.items.map(item => (
                                <div key={item.id}>{item.menuItem.name} × {item.quantity}</div>
                            ))}
                        </div>

                        <div className="card-row mt-2">
                            <span className="font-bold">{order.totalPrice.toLocaleString()} so'm</span>
                            {order.isPaid ? (
                                <span className="badge badge-completed">💳 {order.paymentMethod}</span>
                            ) : (
                                <span className="badge badge-cancelled">To'lanmagan</span>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2 mt-3" style={{ flexWrap: 'wrap' }}>
                            {order.status === 'NEW' && (
                                <button className="btn btn-warning btn-sm" onClick={() => updateStatus(order.id, 'PREPARING')}>
                                    🔥 Tayyorlash
                                </button>
                            )}
                            {order.status === 'PREPARING' && (
                                <button className="btn btn-success btn-sm" onClick={() => updateStatus(order.id, 'READY')}>
                                    ✅ Tayyor
                                </button>
                            )}
                            {order.status === 'READY' && (
                                <button className="btn btn-success btn-sm" onClick={() => updateStatus(order.id, 'COMPLETED')}>
                                    ✅ Bajarildi
                                </button>
                            )}
                            {!order.isPaid && order.status === 'COMPLETED' && (
                                <>
                                    <button className="btn btn-primary btn-sm" onClick={() => markPaid(order.id, 'CASH')}>
                                        💵 Naqd
                                    </button>
                                    <button className="btn btn-primary btn-sm" onClick={() => markPaid(order.id, 'CARD')}>
                                        💳 Karta
                                    </button>
                                </>
                            )}
                            {(order.status === 'NEW' || order.status === 'PREPARING') && (
                                <button className="btn btn-danger btn-sm" onClick={() => updateStatus(order.id, 'CANCELLED')}>
                                    ❌ Bekor
                                </button>
                            )}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
