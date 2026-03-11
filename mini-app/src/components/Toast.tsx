import { useState, useEffect, useCallback } from 'react';

type ToastType = 'success' | 'error';

let showToastFn: ((msg: string, type: ToastType) => void) | null = null;

export function toast(msg: string, type: ToastType = 'success') {
    showToastFn?.(msg, type);
}

export function ToastProvider() {
    const [msg, setMsg] = useState('');
    const [type, setType] = useState<ToastType>('success');
    const [visible, setVisible] = useState(false);

    const show = useCallback((msg: string, type: ToastType) => {
        setMsg(msg);
        setType(type);
        setVisible(true);
        setTimeout(() => setVisible(false), 3000);
    }, []);

    useEffect(() => {
        showToastFn = show;
        return () => { showToastFn = null; };
    }, [show]);

    if (!visible) return null;

    return (
        <div className={`toast toast-${type}`}>
            {type === 'success' ? '✅' : '❌'} {msg}
        </div>
    );
}
