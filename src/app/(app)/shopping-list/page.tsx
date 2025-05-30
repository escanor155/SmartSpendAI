"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, Sparkles, Loader2, ShoppingCart } from "lucide-react";
import type { ShoppingListItem } from "@/types";
import { suggestShoppingListItems, type SuggestShoppingListItemsInput } from "@/ai/flows/suggest-shopping-list-items";
import { cn } from "@/lib/utils";

// Mock past purchases - in a real app, this would come from user's expense history
const mockPastPurchases = "milk, eggs, bread, chicken, apples, bananas, cheese, pasta, rice, coffee";

export default function ShoppingListPage() {
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [pastPurchases, setPastPurchases] = useState(mockPastPurchases);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddItem = () => {
    if (newItemName.trim() === "") return;
    setItems(prevItems => [
      ...prevItems,
      { id: Date.now().toString(), name: newItemName.trim(), isPurchased: false, isAISuggested: false }
    ]);
    setNewItemName("");
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

  const handleGetSuggestions = async () => {
    if (!pastPurchases.trim()) {
      setError("Please provide some past purchases to get suggestions.");
      return;
    }
    setIsSuggesting(true);
    setError(null);
    try {
      const input: SuggestShoppingListItemsInput = {
        pastPurchases: pastPurchases,
        numberOfSuggestions: 5,
      };
      const result = await suggestShoppingListItems(input);
      const suggested = result.suggestedItems.map(name => ({
        id: `ai-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name,
        isPurchased: false,
        isAISuggested: true,
      }));
      // Add suggested items, avoiding duplicates by name with existing non-AI items
      setItems(prevItems => {
        const existingNames = new Set(prevItems.filter(i => !i.isAISuggested).map(i => i.name.toLowerCase()));
        const newSuggestions = suggested.filter(sugg => !existingNames.has(sugg.name.toLowerCase()));
        // Remove old AI suggestions before adding new ones
        const nonAISuggestions = prevItems.filter(item => !item.isAISuggested);
        return [...nonAISuggestions, ...newSuggestions];
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
        description="Plan your next shopping trip efficiently."
      />
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Add Items</CardTitle>
            <CardDescription>Manually add items or get AI-powered suggestions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Input
                type="text"
                placeholder="Enter item name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
                className="flex-grow"
              />
              <Button onClick={handleAddItem} disabled={!newItemName.trim()}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add
              </Button>
            </div>
            <div>
              <Label htmlFor="past-purchases">Past Purchases (comma-separated for suggestions)</Label>
              <Input
                id="past-purchases"
                type="text"
                placeholder="e.g., milk, eggs, bread"
                value={pastPurchases}
                onChange={(e) => setPastPurchases(e.target.value)}
              />
               <Button onClick={handleGetSuggestions} disabled={isSuggesting || !pastPurchases.trim()} className="mt-2 w-full">
                {isSuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Get AI Suggestions
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
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
              <ul className="space-y-3 max-h-96 overflow-y-auto">
                {items.map(item => (
                  <li key={item.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id={`item-${item.id}`}
                        checked={item.isPurchased}
                        onCheckedChange={() => handleToggleItemPurchased(item.id)}
                      />
                      <Label
                        htmlFor={`item-${item.id}`}
                        className={cn("flex-grow", item.isPurchased && "line-through text-muted-foreground")}
                      >
                        {item.name}
                      </Label>
                      {item.isAISuggested && (
                        <Sparkles className="h-3 w-3 text-primary" title="AI Suggested" />
                      )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)} aria-label="Remove item">
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
