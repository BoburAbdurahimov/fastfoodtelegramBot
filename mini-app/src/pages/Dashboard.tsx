import { useNavigate } from 'react-router-dom';
import { useUser } from '../App';
import { haptic } from '../lib/telegram';

interface MenuItem {
    emoji: string;
    label: string;
    path: string;
}

const EMPLOYER_ITEMS: MenuItem[] = [
    { emoji: '📋', label: 'Buyurtmalar', path: '/orders' },
    { emoji: '📦', label: 'Ombor', path: '/warehouse' },
    { emoji: '🍔', label: 'Menyu', path: '/menu' },
    { emoji: '👥', label: 'Xodimlar', path: '/employees' },
    { emoji: '💸', label: 'Xarajatlar', path: '/expenses' },
    { emoji: '📊', label: 'Statistika', path: '/statistics' },
    { emoji: '🪑', label: 'Stollar', path: '/tables' },
    { emoji: '🆕', label: 'Yangi Buyurtma', path: '/orders/new' },
];

const WAITER_ITEMS: MenuItem[] = [
    { emoji: '🆕', label: 'Yangi Buyurtma', path: '/orders/new' },
    { emoji: '📋', label: 'Mening Buyurtmalarim', path: '/waiter' },
];

const CHEF_ITEMS: MenuItem[] = [
    { emoji: '🔔', label: 'Yangi Buyurtmalar', path: '/chef' },
];

const EMPLOYEE_ITEMS: MenuItem[] = [
    { emoji: '🆕', label: 'Yangi Buyurtma', path: '/orders/new' },
    { emoji: '📋', label: 'Buyurtmalar', path: '/orders' },
    { emoji: '📦', label: 'Ombor', path: '/warehouse' },
];

const ROLE_NAMES: Record<string, string> = {
    EMPLOYER: '👑 Egasi',
    WAITER: '🧑‍🍳 Ofitsiant',
    CHEF: '👨‍🍳 Oshpaz',
    EMPLOYEE: '👤 Xodim',
};

export default function Dashboard() {
    const { user } = useUser();
    const navigate = useNavigate();

    if (!user) return null;

    let items: MenuItem[];
    switch (user.role) {
        case 'EMPLOYER': items = EMPLOYER_ITEMS; break;
        case 'WAITER': items = WAITER_ITEMS; break;
        case 'CHEF': items = CHEF_ITEMS; break;
        default: items = EMPLOYEE_ITEMS;
    }

    return (
        <div>
            <div className="card mb-4 animate-pop">
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 }}>
                    Xush kelibsiz, {user.name}!
                </h2>
                <span className="text-sm text-muted">{ROLE_NAMES[user.role] || user.role}</span>
            </div>

            <div className="nav-grid">
                {items.map(item => (
                    <div
                        key={item.path}
                        className="nav-card animate-pop"
                        onClick={() => { haptic(); navigate(item.path); }}
                    >
                        <span className="nav-emoji">{item.emoji}</span>
                        <span className="nav-label">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
