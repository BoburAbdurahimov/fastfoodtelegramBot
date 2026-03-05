import { Markup } from 'telegraf';

export interface PaginationOptions {
    currentPage: number;
    totalItems: number;
    pageSize: number;
    callbackPrefix: string;
}

export function paginate<T>(items: T[], page: number, pageSize: number = 8): { data: T[]; totalPages: number } {
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * pageSize;
    const data = items.slice(start, start + pageSize);
    return { data, totalPages };
}

export function paginationKeyboard(options: PaginationOptions) {
    const { currentPage, totalItems, pageSize, callbackPrefix } = options;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    if (totalPages <= 1) return [];

    const buttons: ReturnType<typeof Markup.button.callback>[] = [];

    if (currentPage > 1) {
        buttons.push(Markup.button.callback('◀️ Prev', `${callbackPrefix}_page_${currentPage - 1}`));
    }

    buttons.push(Markup.button.callback(`${currentPage}/${totalPages}`, `${callbackPrefix}_noop`));

    if (currentPage < totalPages) {
        buttons.push(Markup.button.callback('Next ▶️', `${callbackPrefix}_page_${currentPage + 1}`));
    }

    return [buttons];
}
