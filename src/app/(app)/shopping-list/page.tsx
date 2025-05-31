
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Will remove this for past purchases
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, Sparkles, Loader2, ShoppingCart, Search } from "lucide-react";
import type { ShoppingListItem, Expense } from "@/types";
import { suggestShoppingListItems, type SuggestShoppingListItemsInput } from "@/ai/flows/suggest-shopping-list-items";
import { processShoppingRequest, type ProcessShoppingRequestInput } from "@/ai/flows/process-shopping-request";
import { cn } from "@/lib/utils";
import { Textarea } from '@/components/ui/textarea';
import { useCurrency } from "@/contexts/currency-context";
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { 
  collection, query, where, orderBy, onSnapshot, 
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDocs
} from "firebase/firestore";
import { useToast } from '@/hooks/use-toast';


export default function ShoppingListPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { selectedCurrency } = useCurrency();

  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [userPrompt, setUserPrompt] = useState("");
  
  const [isProcessingAgentRequest, setIsProcessingAgentRequest] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);


  // Fetch shopping list items from Firestore
  useEffect(() => {
    if (!user) {
      if (!authLoading) {
        setItems([]);
        setIsLoadingItems(false);
      }
      return;
    }
    setIsLoadingItems(true);
    const itemsCol = collection(db, "shoppingListItems");
    const q = query(itemsCol, where("userId", "==", user.uid), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as ShoppingListItem));
      setItems(userItems);
      setIsLoadingItems(false);
    }, (error) => {
      console.error("Error fetching shopping list items:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch shopping list." });
      setIsLoadingItems(false);
    });
    return () => unsubscribe();
  }, [user, authLoading, toast]);

  // Fetch user's expenses for AI suggestions
  const fetchUserExpensesForAI = useCallback(async (): Promise<Pick<Expense, 'name' | 'price' | 'brand' | 'storeName'>[]> => {
    if (!user) return [];
    try {
      const expensesCol = collection(db, "expenses");
      const q = query(expensesCol, where("userId", "==", user.uid), orderBy("date", "desc")); // Maybe limit this later
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          name: data.name,
          price: data.price,
          brand: data.brand,
          storeName: data.storeName,
        } as Pick<Expense, 'name' | 'price' | 'brand' | 'storeName'>;
      });
    } catch (error) {
      console.error("Error fetching expenses for AI:", error);
      toast({ variant: "destructive", title: "AI Error", description: "Could not fetch expense history for suggestions." });
      return [];
    }
  }, [user, toast]);


  const handleAgenticAddItem = async () => {
    if (userPrompt.trim() === "" || !user) {
      if(!user) toast({ variant: "destructive", title: "Not Logged In", description: "Please log in to add items." });
      return;
    }
    setIsProcessingAgentRequest(true);
    setAiError(null);
    try {
      const userExpenseHistory = await fetchUserExpensesForAI();
      const input: ProcessShoppingRequestInput = {
        userPrompt: userPrompt,
        expenseHistory: userExpenseHistory,
      };
      const result = await processShoppingRequest(input);
      
      const itemsCollectionRef = collection(db, "shoppingListItems");
      for (const item of result.itemsToAdd) {
        const newItemFromAgent: Omit<ShoppingListItem, 'id' | 'userId' | 'createdAt'> = {
          name: item.name,
          isPurchased: false,
          isAISuggested: true, 
          price: item.price,
          brand: item.brand,
          storeName: item.storeName,
          notes: item.notes,
        };
        // Avoid adding exact duplicates by name if an item already exists (Firestore doesn't enforce this, app logic)
        const existingItem = items.find(i => i.name.toLowerCase() === item.name.toLowerCase());
        if (!existingItem) {
           await addDoc(itemsCollectionRef, { ...newItemFromAgent, userId: user.uid, createdAt: serverTimestamp() });
        } else {
           toast({title: "Item Exists", description: `Item "${item.name}" is already on your list.`});
        }
      }
      setUserPrompt(""); 
      toast({ title: "Success", description: "Items processed and added to your list." });
    } catch (err) {
      console.error("Error processing shopping request:", err);
      setAiError("Failed to process your request with AI. Please try again.");
      toast({ variant: "destructive", title: "AI Error", description: "Failed to process your request." });
    } finally {
      setIsProcessingAgentRequest(false);
    }
  };

  const handleToggleItemPurchased = async (id: string) => {
    if (!user) return;
    const item = items.find(i => i.id === id);
    if (!item) return;
    try {
      const itemRef = doc(db, "shoppingListItems", id);
      await updateDoc(itemRef, { isPurchased: !item.isPurchased });
      // Real-time listener updates local state
    } catch (error) {
      console.error("Error toggling item purchased status:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not update item status." });
    }
  };

  const handleRemoveItem = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "shoppingListItems", id));
      // Real-time listener updates local state
    } catch (error) {
      console.error("Error removing item:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not remove item." });
    }
  };

  const handleGetAISuggestions = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Not Logged In", description: "Please log in to get suggestions." });
      return;
    }
    setIsSuggesting(true);
    setAiError(null);
    try {
      const userExpenses = await fetchUserExpensesForAI();
      const pastPurchaseNames = Array.from(new Set(userExpenses.map(e => e.name))).slice(0, 20).join(', '); // Get unique names, limit for prompt

      if (!pastPurchaseNames.trim()) {
        setAiError("No purchase history found to base suggestions on. Add some expenses first!");
        setIsSuggesting(false);
        return;
      }

      const input: SuggestShoppingListItemsInput = {
        pastPurchases: pastPurchaseNames,
        numberOfSuggestions: 5,
      };
      const result = await suggestShoppingListItems(input);
      const itemsCollectionRef = collection(db, "shoppingListItems");

      for (const name of result.suggestedItems) {
        const suggestedItem: Omit<ShoppingListItem, 'id'| 'userId' | 'createdAt'> = {
          name,
          isPurchased: false,
          isAISuggested: true,
        };
         const existingItem = items.find(i => i.name.toLowerCase() === name.toLowerCase());
         if (!existingItem) {
           await addDoc(itemsCollectionRef, { ...suggestedItem, userId: user.uid, createdAt: serverTimestamp() });
         } else {
            toast({title: "Suggestion Exists", description: `Suggested item "${name}" is already on your list.`});
         }
      }
      toast({ title: "AI Suggestions", description: "New suggestions added to your list if not already present." });

    } catch (err) {
      console.error("Error getting suggestions:", err);
      setAiError("Failed to get AI suggestions. Please try again.");
      toast({ variant: "destructive", title: "AI Error", description: "Failed to get suggestions." });
    } finally {
      setIsSuggesting(false);
    }
  };
  
  const clearAllItems = async () => {
    if (!user || items.length === 0) return;
    try {
      // For simplicity, delete one by one. For many items, batch delete would be better.
      for (const item of items) {
        await deleteDoc(doc(db, "shoppingListItems", item.id));
      }
      toast({title: "List Cleared", description: "All items removed from your shopping list."});
    } catch (error) {
        console.error("Error clearing all items:", error);
        toast({variant: "destructive", title: "Error", description: "Could not clear all items."});
    }
  };
  
  const clearPurchasedItems = async () => {
     if (!user) return;
     const purchasedItems = items.filter(item => item.isPurchased);
     if (purchasedItems.length === 0) return;
     try {
        for (const item of purchasedItems) {
            await deleteDoc(doc(db, "shoppingListItems", item.id));
        }
        toast({title: "Purchased Cleared", description: "Purchased items removed."});
     } catch (error) {
        console.error("Error clearing purchased items:", error);
        toast({variant: "destructive", title: "Error", description: "Could not clear purchased items."});
     }
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
            <CardDescription>Tell AI what you need (e.g., "eggs and milk") or get quick suggestions.</CardDescription>
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
              <Button onClick={handleAgenticAddItem} disabled={isProcessingAgentRequest || !userPrompt.trim() || authLoading || !user} className="mt-2 w-full">
                {isProcessingAgentRequest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Process Request & Add
              </Button>
            </div>
            
            <div className="pt-4 border-t">
               <Button onClick={handleGetAISuggestions} disabled={isSuggesting || authLoading || !user} className="mt-2 w-full">
                {isSuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Get Quick Suggestions (from past purchases)
              </Button>
            </div>
            {aiError && <p className="text-sm text-destructive mt-2">{aiError}</p>}
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
            {authLoading || isLoadingItems ? (
                 <div className="flex items-center justify-center py-8">
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                    <span>Loading list...</span>
                 </div>
            ) : items.length === 0 ? (
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
                            {item.price != null && <p>Price: {selectedCurrency.symbol}{item.price.toFixed(2)}</p>}
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
            {items.length > 0 && !isLoadingItems && (
                <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row gap-2">
                    <Button onClick={clearPurchasedItems} variant="outline" className="flex-1" disabled={authLoading || !user}>Clear Purchased</Button>
                    <Button onClick={clearAllItems} variant="destructive" className="flex-1" disabled={authLoading || !user}>Clear All Items</Button>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

