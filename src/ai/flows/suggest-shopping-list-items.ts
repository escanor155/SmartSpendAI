'use server';

/**
 * @fileOverview An AI agent that suggests items to add to a shopping list based on past purchases.
 *
 * - suggestShoppingListItems - A function that suggests items to add to the shopping list.
 * - SuggestShoppingListItemsInput - The input type for the suggestShoppingListItems function.
 * - SuggestShoppingListItemsOutput - The return type for the suggestShoppingListItems function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestShoppingListItemsInputSchema = z.object({
  pastPurchases: z
    .string()
    .describe(
      'A comma-separated list of items the user has purchased in the past.'
    ),
  numberOfSuggestions: z
    .number()
    .default(3)
    .describe('The number of shopping list items to suggest.'),
});
export type SuggestShoppingListItemsInput = z.infer<
  typeof SuggestShoppingListItemsInputSchema
>;

const SuggestShoppingListItemsOutputSchema = z.object({
  suggestedItems: z
    .array(z.string())
    .describe('An array of items to add to the shopping list.'),
});
export type SuggestShoppingListItemsOutput = z.infer<
  typeof SuggestShoppingListItemsOutputSchema
>;

export async function suggestShoppingListItems(
  input: SuggestShoppingListItemsInput
): Promise<SuggestShoppingListItemsOutput> {
  return suggestShoppingListItemsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestShoppingListItemsPrompt',
  input: {schema: SuggestShoppingListItemsInputSchema},
  output: {schema: SuggestShoppingListItemsOutputSchema},
  prompt: `Based on the user's past purchases, suggest {{numberOfSuggestions}} items to add to their shopping list. Return as a JSON array.

Past Purchases: {{{pastPurchases}}}`,
});

const suggestShoppingListItemsFlow = ai.defineFlow(
  {
    name: 'suggestShoppingListItemsFlow',
    inputSchema: SuggestShoppingListItemsInputSchema,
    outputSchema: SuggestShoppingListItemsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
