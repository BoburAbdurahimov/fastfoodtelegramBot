import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { ToastProvider } from '../components/Toast';

interface DashboardData {
    totalRevenue: number;
    totalCost: number;
    orderProfit: number;
    totalExpenses: number;
    netProfit: number;
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    returnedOrders: number;
    uniqueClients: number;
    totalMeals: number;
    mostSoldItem: { name: string; quantity: number; revenue: number } | null;
    leastSoldItem: { name: string; quantity: number } | null;
    mostProfitableItem: { name: string; profit: number } | null;
    mostUsedProduct: { name: string; unit: string; total: number } | null;
    expensesByType: Array<{ type: string; _sum: { amount: number | null } }>;
    returnedCostImpact: number;
}

export default function Statistics() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [range, setRange] = useState('today');

    const load = () => {
        setLoading(true);
        const now = new Date();
        let from: Date;
        switch (range) {
            case 'week':
                from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
                break;
            case 'month':
                from = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            default:
                from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        }
        api.get<DashboardData>(`/statistics?from=${from.toISOString()}&to=${now.toISOString()}`)
            .then(setData)
            .finally(() => setLoading(false));
    };

    useEffect(load, [range]);

    const fmt = (n: number) => n.toLocaleString();

    return (
        <div>
            <ToastProvider />
            <div className="page-header">
                <span className="emoji">📊</span>
                <h1>Statistika</h1>
            </div>

            <div className="tabs mb-4">
                <button className={`tab ${range === 'today' ? 'active' : ''}`} onClick={() => setRange('today')}>Bugun</button>
                <button className={`tab ${range === 'week' ? 'active' : ''}`} onClick={() => setRange('week')}>Hafta</button>
                <button className={`tab ${range === 'month' ? 'active' : ''}`} onClick={() => setRange('month')}>Oy</button>
            </div>

            {loading ? (
                <div className="loading"><div className="spinner" /></div>
            ) : !data ? (
                <div className="empty-state"><span className="emoji">📊</span><p>Ma'lumot topilmadi</p></div>
            ) : (
                <>
                    {/* Revenue */}
                    <div className="stat-grid">
                        <div className="stat-card">
                            <div className="stat-value text-success">{fmt(data.totalRevenue)}</div>
                            <div className="stat-label">Tushum</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value" style={{ color: data.netProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                {fmt(data.netProfit)}
                            </div>
                            <div className="stat-label">Sof Foyda</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value text-warning">{fmt(data.totalCost)}</div>
                            <div className="stat-label">Tannarx</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value text-danger">{fmt(data.totalExpenses)}</div>
                            <div className="stat-label">Xarajatlar</div>
                        </div>
                    </div>

                    {/* Orders */}
                    <div className="card mb-3">
                        <div className="card-title">📋 Buyurtmalar</div>
                        <div className="card-row">
                            <span>Jami</span><span className="font-bold">{data.totalOrders}</span>
                        </div>
                        <div className="card-row">
                            <span>Bajarilgan</span><span className="text-success">{data.completedOrders}</span>
                        </div>
                        <div className="card-row">
                            <span>Bekor qilingan</span><span className="text-danger">{data.cancelledOrders}</span>
                        </div>
                        <div className="card-row">
                            <span>Qaytarilgan</span><span className="text-warning">{data.returnedOrders}</span>
                        </div>
                        <div className="card-row">
                            <span>Taomlar soni</span><span>{data.totalMeals}</span>
                        </div>
                        <div className="card-row">
                            <span>Mijozlar</span><span>{data.uniqueClients}</span>
                        </div>
                    </div>

                    {/* Top items */}
                    {data.mostSoldItem && (
                        <div className="card mb-3">
                            <div className="card-title">🏆 Eng ko'p sotilgan</div>
                            <div className="card-row">
                                <span>{data.mostSoldItem.name}</span>
                                <span className="font-bold">{data.mostSoldItem.quantity} ta</span>
                            </div>
                        </div>
                    )}

                    {data.mostProfitableItem && (
                        <div className="card mb-3">
                            <div className="card-title">💰 Eng foydali</div>
                            <div className="card-row">
                                <span>{data.mostProfitableItem.name}</span>
                                <span className="font-bold text-success">{fmt(data.mostProfitableItem.profit)} so'm</span>
                            </div>
                        </div>
                    )}

                    {data.mostUsedProduct && (
                        <div className="card mb-3">
                            <div className="card-title">📦 Eng ko'p ishlatilgan</div>
                            <div className="card-row">
                                <span>{data.mostUsedProduct.name}</span>
                                <span>{data.mostUsedProduct.total} {data.mostUsedProduct.unit}</span>
                            </div>
                        </div>
                    )}

                    {/* Expenses breakdown */}
                    {data.expensesByType.length > 0 && (
                        <div className="card mb-3">
                            <div className="card-title">💸 Xarajatlar tafsiloti</div>
                            {data.expensesByType.map((et, i) => (
                                <div key={i} className="card-row">
                                    <span>{et.type}</span>
                                    <span className="text-danger">{fmt(et._sum.amount || 0)} so'm</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {data.returnedCostImpact > 0 && (
                        <div className="card">
                            <div className="card-title">⚠️ Qaytarilgan buyurtmalar zarari</div>
                            <div className="stat-value text-danger">{fmt(data.returnedCostImpact)} so'm</div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
