import crypto from 'crypto';

/**
 * Validate Telegram WebApp initData and return the parsed telegramId.
 * Returns null if validation fails.
 */
export function validateInitData(initData: string, botToken: string): { telegramId: bigint; telegramUser: any } | null {
    try {
        const params = new URLSearchParams(initData);
        const hash = params.get('hash');
        if (!hash) return null;

        params.delete('hash');
        const entries = Array.from(params.entries());
        entries.sort(([a], [b]) => a.localeCompare(b));
        const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
        const checkHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

        if (checkHash !== hash) return null;

        const userJson = params.get('user');
        if (!userJson) return null;

        const telegramUser = JSON.parse(userJson);
        return { telegramId: BigInt(telegramUser.id), telegramUser };
    } catch {
        return null;
    }
}
