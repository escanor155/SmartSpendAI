import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-shopping-list-items.ts';
import '@/ai/flows/scan-receipt.ts';
import '@/ai/flows/categorize-expenses.ts';