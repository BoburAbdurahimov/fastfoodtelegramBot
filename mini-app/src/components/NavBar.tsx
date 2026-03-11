import { useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../App';
import { haptic } from '../lib/telegram';

interface NavItem {
    path: string;
    icon: string;
    label: string;
}

const EMPLOYER_NAV: NavItem[] = [
    { path: '/', icon: '🏠', label: 'Bosh' },
    { path: '/orders', icon: '📋', label: 'Buyurtmalar' },
    { path: '/warehouse', icon: '📦', label: 'Ombor' },
    { path: '/statistics', icon: '📊', label: 'Statistika' },
];

const WAITER_NAV: NavItem[] = [
    { path: '/', icon: '🏠', label: 'Bosh' },
    { path: '/orders/new', icon: '🆕', label: 'Yangi' },
    { path: '/waiter', icon: '📋', label: 'Buyurtmalar' },
];

const CHEF_NAV: NavItem[] = [
    { path: '/', icon: '🏠', label: 'Bosh' },
    { path: '/chef', icon: '🔔', label: 'Buyurtmalar' },
];

const EMPLOYEE_NAV: NavItem[] = [
    { path: '/', icon: '🏠', label: 'Bosh' },
    { path: '/orders/new', icon: '🆕', label: 'Yangi' },
    { path: '/orders', icon: '📋', label: 'Buyurtmalar' },
];

export function NavBar() {
    const { user } = useUser();
    const location = useLocation();
    const navigate = useNavigate();

    let items: NavItem[];
    switch (user?.role) {
        case 'EMPLOYER': items = EMPLOYER_NAV; break;
        case 'WAITER': items = WAITER_NAV; break;
        case 'CHEF': items = CHEF_NAV; break;
        default: items = EMPLOYEE_NAV;
    }

    return (
        <nav className="nav-bar">
            <div className="nav-items">
                {items.map(item => (
                    <button
                        key={item.path}
                        className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                        onClick={() => { haptic(); navigate(item.path); }}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        {item.label}
                    </button>
                ))}
            </div>
        </nav>
    );
}
