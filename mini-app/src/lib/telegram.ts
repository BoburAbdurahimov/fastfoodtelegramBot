declare global {
    interface Window {
        Telegram?: {
            WebApp: TelegramWebApp;
        };
    }
}

interface TelegramWebApp {
    initData: string;
    initDataUnsafe: any;
    version: string;
    platform: string;
    colorScheme: 'light' | 'dark';
    themeParams: Record<string, string>;
    isExpanded: boolean;
    viewportHeight: number;
    viewportStableHeight: number;
    ready: () => void;
    expand: () => void;
    close: () => void;
    MainButton: {
        text: string;
        color: string;
        textColor: string;
        isVisible: boolean;
        isActive: boolean;
        show: () => void;
        hide: () => void;
        setText: (text: string) => void;
        onClick: (fn: () => void) => void;
        offClick: (fn: () => void) => void;
        showProgress: (leaveActive?: boolean) => void;
        hideProgress: () => void;
    };
    BackButton: {
        isVisible: boolean;
        show: () => void;
        hide: () => void;
        onClick: (fn: () => void) => void;
        offClick: (fn: () => void) => void;
    };
    HapticFeedback: {
        impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
        notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
        selectionChanged: () => void;
    };
}

export function getTelegram(): TelegramWebApp | null {
    return window.Telegram?.WebApp || null;
}

export function initTelegram() {
    const tg = getTelegram();
    if (tg) {
        tg.ready();
        tg.expand();
    }
}

export function haptic(type: 'light' | 'medium' | 'heavy' = 'light') {
    getTelegram()?.HapticFeedback.impactOccurred(type);
}

export function hapticSuccess() {
    getTelegram()?.HapticFeedback.notificationOccurred('success');
}

export function hapticError() {
    getTelegram()?.HapticFeedback.notificationOccurred('error');
}

export { };
