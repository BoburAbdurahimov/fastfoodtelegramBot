import { createObjectCsvWriter } from 'csv-writer';
import path from 'path';
import fs from 'fs';

const EXPORT_DIR = path.join(process.cwd(), 'exports');

export async function exportToCsv(
    filename: string,
    headers: Array<{ id: string; title: string }>,
    records: Record<string, unknown>[]
): Promise<string> {
    if (!fs.existsSync(EXPORT_DIR)) {
        fs.mkdirSync(EXPORT_DIR, { recursive: true });
    }

    const filePath = path.join(EXPORT_DIR, `${filename}_${Date.now()}.csv`);

    const csvWriter = createObjectCsvWriter({
        path: filePath,
        header: headers,
    });

    await csvWriter.writeRecords(records);
    return filePath;
}
