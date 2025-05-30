'use server';

/**
 * @fileOverview This file defines a Genkit flow for categorizing expenses from a receipt.
 *
 * - categorizeExpense - A function that takes a receipt text and categorizes the expenses.
 * - CategorizeExpenseInput - The input type for the categorizeExpense function.
 * - CategorizeExpenseOutput - The return type for the categorizeExpense function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CategorizeExpenseInputSchema = z.object({
  receiptText: z
    .string()
    .describe('The text extracted from the receipt to categorize.'),
});
export type CategorizeExpenseInput = z.infer<typeof CategorizeExpenseInputSchema>;

const CategorizeExpenseOutputSchema = z.object({
  categories: z
    .array(z.object({
      item: z.string().describe('The item purchased.'),
      category: z.string().describe('The category of the item.'),
    }))
    .describe('The categories of the items on the receipt.'),
});
export type CategorizeExpenseOutput = z.infer<typeof CategorizeExpenseOutputSchema>;

export async function categorizeExpense(input: CategorizeExpenseInput): Promise<CategorizeExpenseOutput> {
  return categorizeExpenseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'categorizeExpensePrompt',
  input: {schema: CategorizeExpenseInputSchema},
  output: {schema: CategorizeExpenseOutputSchema},
  prompt: `You are an expert financial advisor. Given the following receipt text, categorize each item into a relevant category.

Receipt Text: {{{receiptText}}}

Provide the output as a JSON array of objects, where each object has an 'item' and a 'category' field. The category should be a general category like 'Food', 'Transportation', 'Entertainment', etc.

Example:
[
  {
    "item": "Starbucks Coffee",
    "category": "Food"
  },
  {
    "item": "Bus Ticket",
    "category": "Transportation"
  }
]
`,
});

const categorizeExpenseFlow = ai.defineFlow(
  {
    name: 'categorizeExpenseFlow',
    inputSchema: CategorizeExpenseInputSchema,
    outputSchema: CategorizeExpenseOutputSchema,
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
