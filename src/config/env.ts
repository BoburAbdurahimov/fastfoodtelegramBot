import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
    BOT_TOKEN: z.string().min(1, 'BOT_TOKEN is required'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    EMPLOYER_TELEGRAM_ID: z.string().min(1, 'EMPLOYER_TELEGRAM_ID is required'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    process.exit(1);
}

export const env = parsed.data;
