
"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, Sparkles, Loader2, ShoppingCart, Search } from "lucide-react";
import type { ShoppingListItem, Expense } from "@/types"; // Added Expense type
import { suggestShoppingListItems, type SuggestShoppingListItemsInput } from "@/ai/flows/suggest-shopping-list-items";
import { processShoppingRequest, type ProcessShoppingRequestInput, type ProcessShoppingRequestOutput } from "@/ai/flows/process-shopping-request";
import { cn } from "@/lib/utils";
import { Textarea } from '@/components/ui/textarea'; // Using Textarea for potentially longer prompts
import { useCurrency } from "@/contexts/currency-context";

// Mock past purchases - in a real app, this would come from user's expense history
const mockPastPurchasesForAISuggestions = "milk, eggs, bread, chicken, apples, bananas, cheese, pasta, rice, coffee";

// Mock expense history for the new agentic prompt feature.
// In a real app, this would be fetched from the user's actual expense data.
const mockExpenseHistoryForAgent: Pick<Expense, 'name' | 'price' | 'brand' | 'storeName'>[] = [
  { name: "Organic Eggs", price: 4.99, brand: "FarmFresh", storeName: "SuperMart" },
  { name: "Free-Range Eggs", price: 3.99, brand: "HappyHen", storeName: "Green Grocer" },
  { name: "Standard Eggs", price: 2.50, brand: "ValueBrand", storeName: "SuperMart" },
  { name: "Whole Milk", price: 3.20, brand: "DairyBest", storeName: "SuperMart" },
  { name: "Almond Milk", price: 4.50, brand: "NuttyLife", storeName: "HealthFood Store" },
  { name: "Bread Loaf", price: 2.80, brand: "BakeryDelight", storeName: "SuperMart" },
];


export default function ShoppingListPage() {
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [userPrompt, setUserPrompt] = useState(""); // Renamed from newItemName
  const [pastPurchasesForSuggestions, setPastPurchasesForSuggestions] = useState(mockPastPurchasesForAISuggestions);
  const [isProcessingAgentRequest, setIsProcessingAgentRequest] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { selectedCurrency } = useCurrency();

  const handleAgenticAddItem = async () => {
    if (userPrompt.trim() === "") return;
    setIsProcessingAgentRequest(true);
    setError(null);
    try {
      const input: ProcessShoppingRequestInput = {
        userPrompt: userPrompt,
        // IMPORTANT: Using mock expense history here. In a real app, fetch and format actual user expenses.
        expenseHistory: mockExpenseHistoryForAgent,
      };
      const result = await processShoppingRequest(input);
      
      const newItemsFromAgent = result.itemsToAdd.map(item => ({
        id: `agent-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: item.name,
        isPurchased: false,
        isAISuggested: false, // Or true if we want to mark it as AI-assisted
        price: item.price,
        brand: item.brand,
        storeName: item.storeName,
        notes: item.notes,
      }));

      setItems(prevItems => {
        // Avoid adding exact duplicates by name if an item already exists and isn't AI suggested
        const existingNames = new Set(prevItems.map(i => i.name.toLowerCase()));
        const uniqueNewItems = newItemsFromAgent.filter(newItem => !existingNames.has(newItem.name.toLowerCase()));
        return [...prevItems, ...uniqueNewItems];
      });
      setUserPrompt(""); // Clear prompt after successful addition

    } catch (err) {
      console.error("Error processing shopping request:", err);
      setError("Failed to process your request. Please try again.");
    } finally {
      setIsProcessingAgentRequest(false);
    }
  };

  const handleToggleItemPurchased = (id: string) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, isPurchased: !item.isPurchased } : item
      )
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  const handleGetAISuggestions = async () => {
    if (!pastPurchasesForSuggestions.trim()) {
      setError("Please provide some past purchases to get suggestions.");
      return;
    }
    setIsSuggesting(true);
    setError(null);
    try {
      const input: SuggestShoppingListItemsInput = {
        pastPurchases: pastPurchasesForSuggestions,
        numberOfSuggestions: 5,
      };
      const result = await suggestShoppingListItems(input);
      const suggested = result.suggestedItems.map(name => ({
        id: `ai-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name,
        isPurchased: false,
        isAISuggested: true,
      }));
      setItems(prevItems => {
        const existingNames = new Set(prevItems.filter(i => !i.isAISuggested).map(i => i.name.toLowerCase()));
        const newSuggestions = suggested.filter(sugg => !existingNames.has(sugg.name.toLowerCase()));
        const nonAISuggestions = prevItems.filter(item => !item.isAISuggested); // Keep non-AI items
        const currentAISuggestions = prevItems.filter(item => item.isAISuggested); // Keep current AI items
        return [...nonAISuggestions, ...currentAISuggestions, ...newSuggestions]; // Add new suggestions
      });

    } catch (err) {
      console.error("Error getting suggestions:", err);
      setError("Failed to get suggestions. Please try again.");
    } finally {
      setIsSuggesting(false);
    }
  };
  
  const clearAllItems = () => {
    setItems([]);
  };
  
  const clearPurchasedItems = () => {
    setItems(prevItems => prevItems.filter(item => !item.isPurchased));
  };

  return (
    <>
      <PageHeader
        title="Shopping List"
        description="Plan your next shopping trip efficiently with AI assistance."
      />
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Smart Add Items</CardTitle>
            <CardDescription>Tell the AI what you need (e.g., "add eggs and milk") or get suggestions based on past purchases.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="agentic-prompt">What do you need to buy?</Label>
              <Textarea
                id="agentic-prompt"
                placeholder="e.g., I need eggs, milk, and bread. Find the best price for eggs."
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAgenticAddItem())}
                className="min-h-[80px]"
              />
              <Button onClick={handleAgenticAddItem} disabled={isProcessingAgentRequest || !userPrompt.trim()} className="mt-2 w-full">
                {isProcessingAgentRequest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Process Request & Add
              </Button>
            </div>
            
            <div className="pt-4 border-t">
              <Label htmlFor="past-purchases">Past Purchases (for simple AI suggestions)</Label>
              <Input
                id="past-purchases"
                type="text"
                placeholder="e.g., milk, eggs, bread"
                value={pastPurchasesForSuggestions}
                onChange={(e) => setPastPurchasesForSuggestions(e.target.value)}
              />
               <Button onClick={handleGetAISuggestions} disabled={isSuggesting || !pastPurchasesForSuggestions.trim()} className="mt-2 w-full">
                {isSuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Get Quick Suggestions
              </Button>
            </div>
            {error && <p className="text-sm text-destructive mt-2">{error}</p>}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Your List</CardTitle>
                <CardDescription>Items you need to buy.</CardDescription>
              </div>
              <ShoppingCart className="h-6 w-6 text-primary"/>
            </div>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Your shopping list is empty.</p>
            ) : (
              <ul className="space-y-3 max-h-[400px] overflow-y-auto">
                {items.map(item => (
                  <li key={item.id} className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 transition-colors border-b last:border-b-0">
                    <div className="flex items-start space-x-3 flex-grow">
                      <Checkbox
                        id={`item-${item.id}`}
                        checked={item.isPurchased}
                        onCheckedChange={() => handleToggleItemPurchased(item.id)}
                        className="mt-1"
                      />
                      <div className="flex-grow">
                        <Label
                          htmlFor={`item-${item.id}`}
                          className={cn("font-medium", item.isPurchased && "line-through text-muted-foreground")}
                        >
                          {item.name}
                           {item.isAISuggested && ( <Sparkles className="inline-block ml-1 h-3 w-3 text-primary" title="AI Suggested" /> )}
                        </Label>
                        {(item.price || item.storeName || item.brand || item.notes) && (
                          <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                            {item.price && <p>Price: {selectedCurrency.symbol}{item.price.toFixed(2)}</p>}
                            {item.storeName && <p>Store: {item.storeName}</p>}
                            {item.brand && <p>Brand: {item.brand}</p>}
                            {item.notes && <p className="italic">{item.notes}</p>}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)} aria-label="Remove item" className="ml-2 self-start shrink-0">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {items.length > 0 && (
                <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row gap-2">
                    <Button onClick={clearPurchasedItems} variant="outline" className="flex-1">Clear Purchased</Button>
                    <Button onClick={clearAllItems} variant="destructive" className="flex-1">Clear All Items</Button>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
