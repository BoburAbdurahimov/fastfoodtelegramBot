import { ReactNode } from 'react';
import { NavBar } from './NavBar';

export function Layout({ children }: { children: ReactNode }) {
    return (
        <div className="app-layout">
            <main className="page-content">
                {children}
            </main>
            <NavBar />
        </div>
    );
}
