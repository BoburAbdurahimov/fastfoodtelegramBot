# 🍔 Fast Food Telegram Bot

A production-ready Telegram bot for managing a fast food / restaurant business with full warehouse, menu/recipe, order, financial, employee, and statistics management.

## Features

- **Warehouse**: CRUD products, add/remove stock, automatic deduction on orders, low-stock alerts
- **Menu & Recipes**: Categories, menu items, ingredient-based recipes, cost/profit calculation
- **Orders**: Full lifecycle (New → Preparing → Completed/Cancelled/Returned), auto stock management
- **Expenses**: Track rent, utilities, salaries, marketing, etc.
- **Employees**: Add/remove, salary management, attendance tracking
- **Statistics**: Revenue, profit/loss, most/least sold items, CSV export
- **Role System**: Employer (full access) vs Employee (limited access)
- **Scheduled Jobs**: Daily summary, low stock alerts via cron

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js + TypeScript |
| Bot Framework | Telegraf v4 |
| Database | PostgreSQL |
| ORM | Prisma |
| Validation | Zod |
| Containerization | Docker |

## Quick Start

### 1. Clone and Install

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:
- `BOT_TOKEN` — from [@BotFather](https://t.me/BotFather)
- `DATABASE_URL` — PostgreSQL connection string
- `EMPLOYER_TELEGRAM_ID` — your Telegram user ID

### 3. Database Setup

```bash
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
```

### 4. Run

```bash
npm run dev
```

## Vercel Serverless Deployment

Instead of relying on long-polling Docker instances, this application natively exports Webhooks designed for Vercel Serverless functions.

1. Install the Vercel CLI or connect this directory via Github.
2. Define the production Environment variables (`BOT_TOKEN` and a managed Neon/Supabase PostgreSQL `DATABASE_URL`) located in Vercel settings.
3. Trigger deployment. The `vercel.json` config builds Prisma and links all `/api/*` endpoints.
4. **Register Webhook:** Send a manual GET request to Telegram containing your generated Vercel domain to pipe interactions into the Serverless function:
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://<YOUR_VERCEL_PROJECT>.vercel.app/api/webhook"
```

*Note: Cron tasks execute via Vercel's built-in scheduler automatically reaching out to `/api/cron-daily` and `/api/cron-stock` instead of holding memory locally.*

## Project Structure

```
src/
├── index.ts            # Entry point + cron jobs
├── bot.ts              # Bot factory (scenes, middleware, routing)
├── config/             # Environment + Prisma client
├── middleware/          # Auth, error handler, rate limiter, audit
├── services/           # Business logic layer
├── scenes/             # Telegraf scene handlers (UI flows)
├── keyboards/          # Inline keyboard definitions
├── utils/              # Pagination, dates, CSV, formatting
└── types/              # TypeScript interfaces
```

## Bot Commands

| Command | Description |
|---------|------------|
| `/start` | Show main menu |
| `/menu` | Show main menu |

## User Roles

**Employer**: Full access — orders, warehouse, menu, employees, expenses, statistics, settings.

**Employee**: Orders, warehouse (add stock), personal attendance only.

## License

MIT
# fastfoodtelegramBot
