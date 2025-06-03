
'use server';

/**
 * @fileOverview Extracts item details from a receipt image, including categorization.
 *
 * - scanReceipt - A function that handles the receipt scanning process.
 * - ScanReceiptInput - The input type for the scanReceipt function.
 * - ScanReceiptOutput - The return type for the scanReceipt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ScanReceiptInputSchema = z.object({
  receiptDataUri: z
    .string()
    .describe(
      "A photo of a receipt, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ScanReceiptInput = z.infer<typeof ScanReceiptInputSchema>;

const ScanReceiptOutputSchema = z.object({
  storeName: z.string().describe('The name of the store.'),
  items: z.array(
    z.object({
      name: z.string().describe('The name of the item.'),
      price: z.number().describe('The price of the item.'),
      brand: z.string().describe('The brand of the item. If not clearly identifiable, this can be an empty string.'),
      category: z.string().describe('The category of the item (e.g., Food, Drink, Household Supplies). Default to "Uncategorized" if unsure.'),
    })
  ).
describe('A list of items found on the receipt.'),
  total: z.number().describe('The total amount on the receipt.'),
});
export type ScanReceiptOutput = z.infer<typeof ScanReceiptOutputSchema>;

export async function scanReceipt(input: ScanReceiptInput): Promise<ScanReceiptOutput> {
  return scanReceiptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'scanReceiptPrompt',
  input: {schema: ScanReceiptInputSchema},
  output: {schema: ScanReceiptOutputSchema},
  prompt: `You are an expert receipt scanner. Your task is to accurately extract item details, prices, brand, store name, and total amount from the provided receipt image.

**Process Outline:**
1.  **Internal Reflection & Structural Analysis:** Before generating any JSON, carefully examine the entire receipt image. Mentally (or by outlining if it helps your process) identify the overall structure. Pay close attention to:
    *   Items that are clearly priced individually.
    *   Items that appear to be part of a "Plate," "Combo," "Meal," or similar bundled offering which has a single price for the entire bundle. Note which items are components of such bundles.
2.  **Item Extraction & Pricing (Based on your analysis):** Apply the following rules:

**Key Instructions for Item Extraction and Pricing:**
1.  **Identify Distinct Purchased Units:**
    *   If the receipt lists a "Plate", "Combo", "Meal", or similar grouped offering with a single price, and then lists components under it (e.g., "1 Plate $9.10" followed by "Chow Mein", "Broccoli Beef"), treat this entire "Plate" or "Combo" as **one single item** in your output.
        *   The **name** for this item should be descriptive, using the main grouping term and its key components, e.g., "Plate (Chow Mein, Broccoli Beef, Beijing Beef)" or "Combo Meal (Item A, Item B)".
        *   The **price** for this item is the price listed for the "Plate" or "Combo" itself (e.g., $9.10).
        *   Do **NOT** list the individual components of such a priced group as separate items in the output array unless those components *also* have their own separate, distinct price listed next to them on the receipt (e.g., an "add-on" or "extra charge").
    *   Items that are clearly listed with their own distinct price on the receipt (e.g., "Extra Entree $1.50", "Soda $2.00") should be extracted as **separate individual items** with their respective prices.

2.  **For each extracted item (whether a grouped plate/combo or an individual item):**
    *   **Price:** Assign the correct price as determined above. Ensure prices are numeric.
    *   **Brand:** Identify the brand if clearly mentioned (e.g., "Pepsi"). If not clearly identifiable, provide an empty string for the brand.
    *   **Category:** Determine its category (e.g., Food, Drink, Groceries, Household Supplies, Other). Provide a general category. If you are unsure, use 'Uncategorized'.

3.  **Overall Receipt Details:**
    *   **Store Name:** Extract the store name from the receipt.
    *   **Total Amount:** Extract the final total amount paid as shown on the receipt. Ensure this is a numeric value.

4.  **Output Format (After your internal analysis and rule application):**
    *   Return a JSON object that strictly adheres to the provided output schema.
    *   Ensure the 'items' array accurately reflects the distinct purchased units and their correct prices as interpreted from the receipt, based on your structural analysis.
    *   Avoid duplicating items or misattributing prices. The goal is to reflect how many separately-payable units were purchased.
    *   If an item like "FREE ENTREE ITEM!" appears with no price, it should generally be omitted from the 'items' list unless it has a $0.00 price explicitly. Focus on items contributing to the subtotal/total.

Receipt: {{media url=receiptDataUri}}`,
});

const scanReceiptFlow = ai.defineFlow(
  {
    name: 'scanReceiptFlow',
    inputSchema: ScanReceiptInputSchema,
    outputSchema: ScanReceiptOutputSchema,
  },
  async input => {
    const result = await prompt(input);
    const output = result.output;
    if (!output) {
      console.error(`Flow for prompt '${prompt.name}' failed to produce an output. Input:`, input, "Full result:", result);
      if (result.error) {
        console.error("Underlying error from Genkit/LLM:", result.error);
      }
      throw new Error(`AI flow for prompt '${prompt.name}' did not return the expected output. Check server logs for details.`);
    }
    return output;
  }
);

