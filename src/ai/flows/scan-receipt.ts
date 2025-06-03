'use server';

/**
 * @fileOverview Extracts item details from a receipt image using a two-step process.
 * Step 1: Extract raw textual content from the image.
 * Step 2: Parse the raw text into a structured JSON format.
 *
 * - scanReceipt - A function that handles the receipt scanning process.
 * - ScanReceiptInput - The input type for the scanReceipt function.
 * - ScanReceiptOutput - The return type for the scanReceipt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input schema for the overall flow (and Step 1)
const ScanReceiptInputSchema = z.object({
  receiptDataUri: z
    .string()
    .describe(
      "A photo of a receipt, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ScanReceiptInput = z.infer<typeof ScanReceiptInputSchema>;

// Output schema for Step 1 (raw text extraction)
const RawReceiptContentOutputSchema = z.object({
  rawContent: z.string().describe("The raw textual content extracted from the receipt, attempting to preserve its apparent structure and itemization."),
});

// Input schema for Step 2 (text to structured JSON)
const StructureReceiptTextInputSchema = z.object({
  rawReceiptText: z.string().describe("The raw textual content extracted from a receipt in a previous step."),
});

// Final output schema for the overall flow (and Step 2)
const ScanReceiptOutputSchema = z.object({
  storeName: z.string().describe('The name of the store.'),
  items: z.array(
    z.object({
      name: z.string().describe('The name of the item.'),
      price: z.number().describe('The price of the item.'),
      brand: z.string().describe('The brand of the item. If not clearly identifiable, this can be an empty string.'),
      category: z.string().describe('The category of the item (e.g., Food, Drink, Household Supplies). Default to "Uncategorized" if unsure.'),
    })
  ).describe('A list of items found on the receipt.'),
  total: z.number().describe('The total amount on the receipt.'),
});
export type ScanReceiptOutput = z.infer<typeof ScanReceiptOutputSchema>;


export async function scanReceipt(input: ScanReceiptInput): Promise<ScanReceiptOutput> {
  return scanReceiptFlow(input);
}

// --- Prompt for Step 1: Raw Content Extraction from Image ---
const extractRawContentPrompt = ai.definePrompt({
  name: 'extractRawReceiptContentPrompt',
  input: { schema: ScanReceiptInputSchema },
  output: { schema: RawReceiptContentOutputSchema },
  prompt: `Analyze the following receipt image. Transcribe its content, including all items, prices, quantities, store name, and total amount.
Present the information in a clear, textual format that accurately reflects the receipt's visible structure and itemization. For example, if items are listed under a "Plate" or "Combo" with a single price for that group, show that relationship.

Receipt Image: {{media url=receiptDataUri}}`,
});

// --- Prompt for Step 2: Structured Data Extraction from Text ---
const structureScannedTextPrompt = ai.definePrompt({
  name: 'structureScannedReceiptTextPrompt',
  input: { schema: StructureReceiptTextInputSchema },
  output: { schema: ScanReceiptOutputSchema },
  prompt: `You are given raw text extracted from a store receipt. Your task is to parse this text and convert it into a structured JSON object according to the provided schema.

Raw Receipt Text:
\`\`\`
{{{rawReceiptText}}}
\`\`\`

**Detailed Instructions for JSON Structuring:**

1.  **Store Name**: Extract the store's name.
2.  **Total Amount**: Extract the final total amount paid from the receipt. This should be a numeric value.
3.  **Items**: Create an array of item objects. For each item:
    *   **Name**:
        *   If the raw receipt text shows a "Plate", "Combo", "Meal", or similar grouped offering with a single price (e.g., "1 Plate $9.10") and then lists component items under it (e.g., "CHOW MEIN", "BROCCOLI BEEF"), then the **name** for this single item in your JSON should combine the grouping term and its key components (e.g., "Plate (Chow Mein, Broccoli Beef)").
        *   For individually listed items that have their own distinct price in the raw text (e.g., "XTRA ENTREE $1.50", "SODA $2.00"), use the item name as listed.
    *   **Price**:
        *   For "Plate" or "Combo" items, use the price associated with the "Plate" or "Combo" itself as indicated in the raw text.
        *   For individual items, use their listed price from the raw text.
        *   Ensure all prices are numeric.
    *   **Brand**: Identify the brand if explicitly mentioned in the raw text (e.g., "Pepsi"). If not, use an empty string.
    *   **Category**: Assign a general category (e.g., Food, Drink, Household, Other). If unsure, use "Uncategorized".

**Important Validation (Internal Check):**
*   After identifying all items and their prices for your JSON output, mentally sum the prices of these items.
*   Compare this sum to the subtotal or total amount found in the raw receipt text.
*   If there's a significant discrepancy, re-evaluate your itemization based on the raw text. You might have mis-assigned prices or misinterpreted a bundled deal. Adjust your item list to ensure the sum of item prices accurately reflects the receipt's logic as presented in the raw text.

**Output Format**:
Return a single JSON object that strictly adheres to the output schema. Do NOT include any explanatory text, comments, or markdown formatting before or after the JSON.
Ensure the 'items' array accurately reflects distinct purchased units and their correct prices as interpreted from the provided raw receipt text.
`,
});


const scanReceiptFlow = ai.defineFlow(
  {
    name: 'scanReceiptFlow',
    inputSchema: ScanReceiptInputSchema,
    outputSchema: ScanReceiptOutputSchema,
  },
  async (input: ScanReceiptInput) => {
    // Step 1: Extract raw content from the image
    const rawContentExtraction = await extractRawContentPrompt(input);
    const rawContentOutput = rawContentExtraction.output;

    if (!rawContentOutput || !rawContentOutput.rawContent) {
      console.error("ScanReceipt Flow - Step 1 (Raw Content Extraction) failed to produce rawContent. Input:", input, "Full result:", rawContentExtraction);
      if (rawContentExtraction.error) {
        console.error("Underlying error from Genkit/LLM (Step 1):", rawContentExtraction.error);
      }
      throw new Error("AI flow failed at raw content extraction step. Check server logs for details.");
    }
    const { rawContent } = rawContentOutput;
    // console.log("ScanReceipt Flow - Step 1 Output (Raw Content):\n", rawContent); // Log for debugging

    // Step 2: Convert raw content to structured JSON
    const structuredDataExtraction = await structureScannedTextPrompt({ rawReceiptText: rawContent });
    const finalOutput = structuredDataExtraction.output;

    if (!finalOutput) {
      console.error(`ScanReceipt Flow - Step 2 (Structured Data Extraction) failed to produce an output. Input to Step 2 (rawContent):\n${rawContent}\nFull result from Step 2:`, structuredDataExtraction);
      if (structuredDataExtraction.error) {
        console.error("Underlying error from Genkit/LLM (Step 2):", structuredDataExtraction.error);
      }
      throw new Error(`AI flow failed at structured data extraction step. Check server logs for details.`);
    }
    
    // console.log("ScanReceipt Flow - Step 2 Output (Final Structured Data):", finalOutput); // Log for debugging
    return finalOutput;
  }
);

