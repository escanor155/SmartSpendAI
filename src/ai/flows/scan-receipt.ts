
'use server';

/**
 * @fileOverview Extracts item details from a receipt image using a two-step process.
 * Step 1: Extract raw textual content from the image.
 * Step 2: Parse the raw text into a structured JSON format, including quantity and unit price.
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
  rawContent: z.string().describe("The raw textual content extracted from the receipt, attempting to preserve its apparent structure, itemization, and any visible column headers like 'Qty', 'Price', 'Amount'."),
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
      quantity: z.number().describe('The quantity of this item. If not specified or unclear, assume 1.'),
      unitPrice: z.number().describe('The price of a single unit of the item.'),
      totalItemPrice: z.number().describe('The total price for this line item (should be unitPrice * quantity).'),
      brand: z.string().describe('The brand of the item. If not clearly identifiable, this can be an empty string or the item name if it seems to be the brand.'),
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
  prompt: `Analyze the following receipt image. Transcribe its content, including all items, individual prices, quantities, line totals, store name, and grand total amount.
Present the information in a clear, textual format that accurately reflects the receipt's visible structure, itemization, and any column headers (like 'Qty', 'Price', 'Amount', 'Tax Amt' which might mean line total). For example, if items are listed under a "Plate" or "Combo" with a single price for that group, show that relationship.

Receipt Image: {{media url=receiptDataUri}}`,
});

// --- Prompt for Step 2: Structured Data Extraction from Text ---
const structureScannedTextPrompt = ai.definePrompt({
  name: 'structureScannedReceiptTextPrompt',
  input: { schema: StructureReceiptTextInputSchema },
  output: { schema: ScanReceiptOutputSchema },
  prompt: `**Task**: You are an expert data extraction AI. Your primary goal is to parse raw text extracted from a store receipt and convert it into a structured JSON object according to the output schema.

**Process Outline**:
1.  **Internal Reflection & Structural Analysis**: Before generating JSON, carefully analyze the entire \`rawReceiptText\`. Identify distinct items, their quantities (often in a 'Qty' column), their unit prices (often in a 'Price' column next to the item name or before quantity), their total line prices (often in an 'Amount' or 'Tax Amt' column, representing unit price * quantity), store name, and the grand total. Pay close attention to:
    *   **Line Item Columns**: Receipts often have columns for Description/Commodity, Unit Price, Quantity, and Line Total/Amount. Identify these.
    *   **Bundled/Grouped Items**: Look for terms like "Plate", "Combo", "Meal", "Set", etc., that might have a single price but list multiple components.
    *   **Individual Items**: Identify items that are listed with their own distinct price, quantity, and line total.
2.  **JSON Structuring**: Based on your analysis, construct the JSON output.

**Raw Receipt Text**:
\`\`\`
{{{rawReceiptText}}}
\`\`\`

**Detailed Instructions for JSON Structuring**:

1.  **Store Name**: Extract the store's name from the text.
2.  **Total Amount**: Extract the final total amount paid from the receipt. This must be a numeric value.
3.  **Items Array**: Create an array of item objects. For each distinct purchased line item:
    *   **Name**:
        *   If the raw text indicates a grouped offering (e.g., "1 Plate $9.10") with components listed (e.g., "CHOW MEIN", "BROCCOLI BEEF" under that plate):
            *   The **name** in your JSON for this single item should combine the grouping term and its key components (e.g., "Plate (Chow Mein, Broccoli Beef)").
            *   Do NOT create separate JSON items for "CHOW MEIN" and "BROCCOLI BEEF" if they are part of this priced "Plate".
        *   For items listed with their own distinct price in the raw text (e.g., "XTRA ENTREE $1.50", "SODA $2.00"), use the item name as listed (e.g., "XTRA ENTREE", "SODA").
    *   **Quantity (\`quantity\`)**:
        *   Look for a quantity column or indicator (e.g., "Qty", "2.00" next to a price). Extract this numeric value.
        *   If quantity is not explicitly mentioned for an item, assume quantity is 1.
        *   For "Plate" or "Combo" items, the quantity refers to the number of such plates/combos.
    *   **Unit Price (\`unitPrice\`)**:
        *   This is the price for a single unit of the item. Look for a price column often appearing before the quantity or as the primary price listed for the item.
        *   For "Plate" or "Combo" items, this should be the price of one plate/combo (e.g., $9.10 for the "Plate").
    *   **Total Item Price (\`totalItemPrice\`)**:
        *   This is the price for the item line, calculated as \`unitPrice * quantity\`. This value is often explicitly available on the receipt in an "Amount" or "Total" column for that line. Use the explicit value from the receipt if available and consistent.
        *   Ensure this value is numeric.
    *   **Brand**: Identify the brand if explicitly mentioned (e.g., "Pepsi"). If not, use an empty string. This field is mandatory.
    *   **Category**: Assign a general category (e.g., Food, Drink, Household, Other). If unsure, use "Uncategorized". This field is mandatory.

**Important Internal Validation Step Before Outputting JSON**:
*   For each item in your \`items\` array, verify that \`unitPrice * quantity\` approximately equals \`totalItemPrice\`.
*   Sum the \`totalItemPrice\` of all the items you've decided to include in your JSON \`items\` array.
*   Compare this sum to the \`total\` amount you've extracted for the \`total\` field in the JSON (which should come from the grand total on the receipt).
*   **If the sum of your calculated \`totalItemPrice\` values does not reasonably match the receipt's total (allowing for minor rounding differences or taxes if not itemized per line), critically re-evaluate your itemization.** You might have:
    *   Incorrectly split a bundled item.
    *   Missed an item.
    *   Mis-assigned a price, quantity, or unit price.
    *   Misinterpreted which column represents unit price vs. total line price.
*   **Adjust your interpretation and the resulting \`items\` array to ensure the sum of item prices logically aligns with the receipt's overall total.** This self-correction is crucial.

**Output Format**:
Return a single JSON object that strictly adheres to the output schema. Do NOT include any explanatory text, comments, or markdown formatting before or after the JSON.
Ensure the 'items' array accurately reflects distinct purchased units, their quantities, unit prices, and total line prices as interpreted from the provided raw receipt text, especially after your internal validation.
`,
});


const scanReceiptFlow = ai.defineFlow(
  {
    name: 'scanReceiptFlow',
    inputSchema: ScanReceiptInputSchema,
    outputSchema: ScanReceiptOutputSchema,
  },
  async (input: ScanReceiptInput) => {
    let rawContentExtraction;
    try {
      // Step 1: Extract raw content from the image
      rawContentExtraction = await extractRawContentPrompt(input);
    } catch (e: any) {
      console.error("ScanReceipt Flow - Step 1 (Raw Content Extraction) EXCEPTION. Input:", input, "Error:", e);
      const errorMessage = String(e.message || "An unknown error occurred during AI processing.");
      if (errorMessage.includes('503') || errorMessage.toLowerCase().includes('model is overloaded') || errorMessage.toLowerCase().includes('service unavailable')) {
        throw new Error("The AI service is currently overloaded or unavailable. Please try again in a few moments.");
      }
      throw new Error("AI processing failed during receipt content extraction. Please check server logs or try again.");
    }
    
    const rawContentOutput = rawContentExtraction.output;

    if (!rawContentOutput || !rawContentOutput.rawContent) {
      console.error("ScanReceipt Flow - Step 1 (Raw Content Extraction) failed to produce rawContent. Input:", input, "Full result:", rawContentExtraction);
      if (rawContentExtraction.error) {
        const step1ErrorMessage = String(rawContentExtraction.error);
        console.error("Underlying error from Genkit/LLM (Step 1):", step1ErrorMessage);
        if (step1ErrorMessage.includes('503') || step1ErrorMessage.toLowerCase().includes('model is overloaded') || step1ErrorMessage.toLowerCase().includes('service unavailable')) {
            throw new Error("The AI service reported it is overloaded while extracting content. Please try again later.");
        }
         throw new Error("AI failed to extract content from the receipt image. Error: " + step1ErrorMessage);
      }
      throw new Error("AI flow failed at raw content extraction step: No content produced. Check server logs for details.");
    }
    const { rawContent } = rawContentOutput;

    let structuredDataExtraction;
    try {
      // Step 2: Convert raw content to structured JSON
      structuredDataExtraction = await structureScannedTextPrompt({ rawReceiptText: rawContent });
    } catch (e: any) {
      console.error("ScanReceipt Flow - Step 2 (Structured Data Extraction) EXCEPTION. Input (rawContent):", rawContent, "Error:", e);
      const errorMessage = String(e.message || "An unknown error occurred during AI processing.");
      if (errorMessage.includes('503') || errorMessage.toLowerCase().includes('model is overloaded') || errorMessage.toLowerCase().includes('service unavailable')) {
        throw new Error("The AI service is currently overloaded or unavailable while structuring data. Please try again in a few moments.");
      }
      throw new Error("AI processing failed during receipt data structuring. Please check server logs or try again.");
    }

    const finalOutput = structuredDataExtraction.output;

    if (!finalOutput) {
      console.error(`ScanReceipt Flow - Step 2 (Structured Data Extraction) failed to produce an output. Input to Step 2 (rawContent):\n${rawContent}\nFull result from Step 2:`, structuredDataExtraction);
      if (structuredDataExtraction.error) {
        const step2ErrorMessage = String(structuredDataExtraction.error);
        console.error("Underlying error from Genkit/LLM (Step 2):", step2ErrorMessage);
         if (step2ErrorMessage.includes('503') || step2ErrorMessage.toLowerCase().includes('model is overloaded') || step2ErrorMessage.toLowerCase().includes('service unavailable')) {
            throw new Error("The AI service reported it is overloaded while structuring data. Please try again later.");
        }
        throw new Error("AI failed to structure the extracted receipt content. Error: " + step2ErrorMessage);
      }
      throw new Error(`AI flow failed at structured data extraction step: No structured data produced. Check server logs for details.`);
    }
    
    return finalOutput;
  }
);

