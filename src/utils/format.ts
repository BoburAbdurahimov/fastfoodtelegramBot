export function formatCurrency(amount: number): string {
    return amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

export function formatNumber(num: number): string {
    return num.toLocaleString('en-US');
}

export function truncate(str: string, maxLength: number = 30): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
}
