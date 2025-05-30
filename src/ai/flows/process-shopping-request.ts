'use server';
/**
 * @fileOverview An AI agent that processes natural language shopping requests,
 * searches expense history for the best prices, and suggests items to add to the shopping list.
 *
 * - processShoppingRequest - A function that handles the shopping request processing.
 * - ProcessShoppingRequestInput - The input type for the processShoppingRequest function.
 * - ProcessShoppingRequestOutput - The return type for the processShoppingRequest function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExpenseHistoryItemSchema = z.object({
  name: z.string().describe('Name of the purchased item.'),
  price: z.number().describe('Price of the item.'),
  brand: z.string().optional().describe('Brand of the item, if available.'),
  storeName: z.string().optional().describe('Store where the item was purchased, if available.'),
});

const ProcessShoppingRequestInputSchema = z.object({
  userPrompt: z.string().describe("The user's natural language request for shopping items (e.g., 'I need eggs and milk')."),
  expenseHistory: z.array(ExpenseHistoryItemSchema).describe('An array of past purchased items with their details. This will be used to find the best price for requested items.'),
});
export type ProcessShoppingRequestInput = z.infer<typeof ProcessShoppingRequestInputSchema>;

const ShoppingListItemOutputSchema = z.object({
  name: z.string().describe('The name of the item to add to the shopping list.'),
  price: z.number().optional().describe('The price of the item, if found in history.'),
  brand: z.string().optional().describe('The brand of the item, if found in history.'),
  storeName: z.string().optional().describe('The store name for the item, if found in history.'),
  notes: z.string().optional().describe('Any relevant notes, e.g., "Cheapest option from past purchases." or "Item added from request."'),
});

const ProcessShoppingRequestOutputSchema = z.object({
  itemsToAdd: z.array(ShoppingListItemOutputSchema).describe('A list of items to add to the shopping list based on the user prompt and expense history analysis.'),
});
export type ProcessShoppingRequestOutput = z.infer<typeof ProcessShoppingRequestOutputSchema>;

export async function processShoppingRequest(input: ProcessShoppingRequestInput): Promise<ProcessShoppingRequestOutput> {
  return processShoppingRequestFlow(input);
}

const prompt = ai.definePrompt({
  name: 'processShoppingRequestPrompt',
  input: {schema: ProcessShoppingRequestInputSchema},
  output: {schema: ProcessShoppingRequestOutputSchema},
  prompt: `You are a smart shopping assistant. The user will provide a natural language request for items they need.
Your task is to:
1. Identify the item(s) mentioned in the user's prompt: {{{userPrompt}}}.
2. Search through the provided expense history: {{{json expenseHistory}}}. This history contains items previously purchased, including their name, price, brand (if available), and store name (if available).
3. For each item identified in the user's prompt:
    a. Find all matching entries in the expense history. Match item names flexibly (e.g., "egg" should match "eggs", "organic eggs").
    b. Determine the cheapest option based on price.
    c. If multiple entries have the same cheapest price, you can pick any.
    d. Extract the name (use the most common name or the one from the cheapest option), price, brand (if available), and store name (if available) for the cheapest option.
4. Construct a list of items to be added to the shopping list. Each item should include:
    - name: The name of the item.
    - price: The price of the cheapest option found.
    - brand: The brand of the cheapest option found (if available).
    - storeName: The store where the cheapest option was found (if available).
    - notes: A brief note, e.g., "Cheapest: $X.XX at Store (Brand Y)" or "Added from your request." If no specific price/store info was found from history for an item, the note should indicate "No price history found."

If an item requested by the user is not found in the expense history, still add it to the 'itemsToAdd' list but without price, brand, or storeName, and set the notes field accordingly.

Return the response as a JSON object matching the output schema. Ensure all requested items appear in the output, even if no history is found for them.
Example of notes:
- If found: "Cheapest: $2.99 at SuperMart (BrandX)"
- If not found: "No price history found."
- If user simply said "add X": "Added 'X' from your request."
`,
});

const processShoppingRequestFlow = ai.defineFlow(
  {
    name: 'processShoppingRequestFlow',
    inputSchema: ProcessShoppingRequestInputSchema,
    outputSchema: ProcessShoppingRequestOutputSchema,
  },
  async (input: ProcessShoppingRequestInput) => {
    // In a real app, you might pre-filter or augment expenseHistory here if needed.
    const {output} = await prompt(input);
    return output!;
  }
);
