import { Context, Scenes } from 'telegraf';

export interface SessionData extends Scenes.WizardSessionData {
    // Warehouse
    warehouseProductId?: number;
    warehouseAction?: string;

    // Menu
    menuItemId?: number;
    menuCategoryId?: number;
    menuAction?: string;
    batchAction?: string; // For Chef batch processing

    // Order
    orderItems?: Array<{ menuItemId: number; name: string; quantity: number; price: number }>;
    orderClientName?: string;

    // Expense
    expenseData?: {
        type?: string;
        amount?: number;
        description?: string;
        recurring?: boolean;
    };

    // Employee
    employeeData?: {
        telegramId?: string;
        name?: string;
        salary?: number;
    };

    // Statistics
    statsDateRange?: {
        from: Date;
        to: Date;
    };

    // Pagination & Filters
    currentPage?: number;
    currentFilter?: string;

    // UI state
    selectedOrderId?: number;

    // Telegraf Scene session
    __scenes?: any;
}

export interface BotContext extends Context {
    session: SessionData;
    scene: Scenes.SceneContextScene<BotContext, SessionData>;
    wizard: Scenes.WizardContextWizard<BotContext>;
    dbUser?: {
        id: number;
        telegramId: bigint;
        name: string;
        role: string;
        isActive: boolean;
    };
}
