import { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { api } from './lib/api';
import { Layout } from './components/Layout';
import Dashboard from './pages/Dashboard';
import Warehouse from './pages/Warehouse';
import Menu from './pages/Menu';
import Orders from './pages/Orders';
import NewOrder from './pages/NewOrder';
import Expenses from './pages/Expenses';
import Employees from './pages/Employees';
import Statistics from './pages/Statistics';
import ChefPanel from './pages/ChefPanel';
import WaiterPanel from './pages/WaiterPanel';
import Tables from './pages/Tables';

interface User {
    id: number;
    name: string;
    role: string;
    isActive: boolean;
}

interface UserContextType {
    user: User | null;
    loading: boolean;
}

const UserContext = createContext<UserContextType>({ user: null, loading: true });

export function useUser() {
    return useContext(UserContext);
}

export function App() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get<{ user: User }>('/me')
            .then(data => setUser(data.user))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="loading" style={{ minHeight: '100vh' }}>
                <div className="spinner" />
                <span className="text-muted text-sm">Yuklanmoqda...</span>
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="empty-state" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span className="emoji">⛔</span>
                <p>{error || 'Foydalanuvchi topilmadi'}</p>
            </div>
        );
    }

    return (
        <UserContext.Provider value={{ user, loading }}>
            <Layout>
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/warehouse" element={<Warehouse />} />
                    <Route path="/menu" element={<Menu />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/orders/new" element={<NewOrder />} />
                    {user.role === 'EMPLOYER' && (
                        <>
                            <Route path="/expenses" element={<Expenses />} />
                            <Route path="/employees" element={<Employees />} />
                            <Route path="/statistics" element={<Statistics />} />
                            <Route path="/tables" element={<Tables />} />
                        </>
                    )}
                    {user.role === 'CHEF' && (
                        <Route path="/chef" element={<ChefPanel />} />
                    )}
                    {user.role === 'WAITER' && (
                        <Route path="/waiter" element={<WaiterPanel />} />
                    )}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Layout>
        </UserContext.Provider>
    );
}
