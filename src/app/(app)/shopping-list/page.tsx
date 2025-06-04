
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, Sparkles, Loader2, ShoppingCart, Search, History, PackagePlus } from "lucide-react";
import type { ShoppingListItem, Expense } from "@/types";
import { suggestShoppingListItems, type SuggestShoppingListItemsInput } from "@/ai/flows/suggest-shopping-list-items";
// import { processShoppingRequest, type ProcessShoppingRequestInput } from "@/ai/flows/process-shopping-request"; // No longer primary add method
import { cn } from "@/lib/utils";
import { useCurrency } from "@/contexts/currency-context";
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { 
  collection, query, where, orderBy, onSnapshot, 
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDocs, limit, startAt, endAt
} from "firebase/firestore";
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';


export default function ShoppingListPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { selectedCurrency } = useCurrency();

  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  
  const [newItemNameInput, setNewItemNameInput] = useState("");
  const [pastPurchaseSuggestions, setPastPurchaseSuggestions] = useState<Expense[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const [isSuggestingFromAI, setIsSuggestingFromAI] = useState(false);
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

  // Fetch user's expenses for AI suggestions (general)
  const fetchUserExpensesForAISuggestions = useCallback(async (): Promise<Pick<Expense, 'name' | 'price' | 'brand' | 'storeName'>[]> => {
    if (!user) return [];
    try {
      const expensesCol = collection(db, "expenses");
      const q = query(expensesCol, where("userId", "==", user.uid), orderBy("date", "desc"), limit(50)); // Limit to last 50 expenses for broader AI suggestions
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
      toast({ variant: "destructive", title: "AI Error", description: "Could not fetch expense history for AI suggestions." });
      return [];
    }
  }, [user, toast]);

  const handleSearchPastPurchases = useCallback(async () => {
    if (!newItemNameInput.trim() || !user) {
      setPastPurchaseSuggestions([]);
      return;
    }
    setIsLoadingSuggestions(true);
    try {
      const searchTerm = newItemNameInput.toLowerCase();
      const expensesCol = collection(db, "expenses");
      // Basic prefix search. For more complex search, consider dedicated search service or more complex querying.
      // This query is case-sensitive. For case-insensitive, you'd typically store a lowercased version of the name.
      // For simplicity, we'll filter client-side for "contains" after a broader fetch if needed, or rely on prefix.
      const q = query(
        expensesCol, 
        where("userId", "==", user.uid), 
        orderBy("name") // Order by name to use range queries
        // where("name", ">=", searchTerm), // This is case sensitive
        // where("name", "<=", searchTerm + '\uf8ff') // Case sensitive
        // Firestore doesn't directly support case-insensitive "contains" queries efficiently.
        // We'll fetch based on user ID and then filter client-side for broad matching.
        // A more optimized approach for large datasets would be using a search service like Algolia or Typesense.
      );

      const snapshot = await getDocs(q);
      let matchedExpenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
      
      // Client-side filter for "contains" case-insensitively
      matchedExpenses = matchedExpenses.filter(expense => 
        expense.name.toLowerCase().includes(searchTerm)
      ).sort((a, b) => a.price - b.price); // Sort by price ascending

      setPastPurchaseSuggestions(matchedExpenses.slice(0, 10)); // Show top 10 matches
    } catch (error) {
      console.error("Error searching past purchases:", error);
      toast({ variant: "destructive", title: "Search Error", description: "Could not search past purchases." });
      setPastPurchaseSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [newItemNameInput, user, toast]);
  
  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (newItemNameInput.trim().length > 1) { // Search only if input is reasonably long
        handleSearchPastPurchases();
      } else {
        setPastPurchaseSuggestions([]);
      }
    }, 500); // Debounce time: 500ms
    return () => clearTimeout(timer);
  }, [newItemNameInput, handleSearchPastPurchases]);


  const handleAddItemFromSuggestion = async (suggestedItem: Expense) => {
    if (!user) return;
    
    const newItem: Omit<ShoppingListItem, 'id' | 'userId' | 'createdAt'> = {
      name: suggestedItem.name,
      isPurchased: false,
      isAISuggested: false, // This is from past purchases, not direct AI suggestion for *new* items
      price: suggestedItem.price,
      brand: suggestedItem.brand,
      storeName: suggestedItem.storeName,
      notes: `Based on past purchase on ${new Date(suggestedItem.date).toLocaleDateString()}`,
      category: suggestedItem.category,
    };

    const existingItem = items.find(i => i.name.toLowerCase() === newItem.name.toLowerCase() && !i.isPurchased);
    if (existingItem) {
      toast({ title: "Item Exists", description: `"${newItem.name}" is already on your active shopping list.` });
      return;
    }

    try {
      await addDoc(collection(db, "shoppingListItems"), { ...newItem, userId: user.uid, createdAt: serverTimestamp() });
      toast({ title: "Item Added", description: `"${newItem.name}" added to your shopping list.` });
      setNewItemNameInput(""); // Clear input
      setPastPurchaseSuggestions([]); // Clear suggestions
    } catch (error) {
      console.error("Error adding item from suggestion:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not add item to list." });
    }
  };
  
  const handleAddUntrackedItem = async () => {
    if (!newItemNameInput.trim() || !user) return;

    const newItem: Omit<ShoppingListItem, 'id' | 'userId' | 'createdAt'> = {
        name: newItemNameInput.trim(),
        isPurchased: false,
    };
    const existingItem = items.find(i => i.name.toLowerCase() === newItem.name.toLowerCase() && !i.isPurchased);
    if (existingItem) {
      toast({ title: "Item Exists", description: `"${newItem.name}" is already on your active shopping list.` });
      return;
    }
    try {
        await addDoc(collection(db, "shoppingListItems"), { ...newItem, userId: user.uid, createdAt: serverTimestamp() });
        toast({ title: "Item Added", description: `"${newItem.name}" added to your shopping list.` });
        setNewItemNameInput("");
        setPastPurchaseSuggestions([]);
    } catch (error) {
        console.error("Error adding untracked item:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not add untracked item."});
    }
  };


  const handleToggleItemPurchased = async (id: string) => {
    if (!user) return;
    const item = items.find(i => i.id === id);
    if (!item) return;
    try {
      const itemRef = doc(db, "shoppingListItems", id);
      await updateDoc(itemRef, { isPurchased: !item.isPurchased });
    } catch (error) {
      console.error("Error toggling item purchased status:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not update item status." });
    }
  };

  const handleRemoveItem = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "shoppingListItems", id));
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
    setIsSuggestingFromAI(true);
    setAiError(null);
    try {
      const userExpenses = await fetchUserExpensesForAISuggestions();
      const pastPurchaseNames = Array.from(new Set(userExpenses.map(e => e.name))).slice(0, 20).join(', ');

      if (!pastPurchaseNames.trim()) {
        setAiError("No purchase history found to base AI suggestions on. Add some expenses first!");
        setIsSuggestingFromAI(false);
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
          notes: "Suggested by AI based on past purchases."
        };
         const existingItem = items.find(i => i.name.toLowerCase() === name.toLowerCase() && !i.isPurchased);
         if (!existingItem) {
           await addDoc(itemsCollectionRef, { ...suggestedItem, userId: user.uid, createdAt: serverTimestamp() });
         } else {
            toast({title: "Suggestion Exists", description: `AI suggested item "${name}" is already on your active list.`});
         }
      }
      toast({ title: "AI Suggestions", description: "New AI suggestions added to your list if not already present." });

    } catch (err) {
      console.error("Error getting AI suggestions:", err);
      setAiError("Failed to get AI suggestions. Please try again.");
      toast({ variant: "destructive", title: "AI Error", description: "Failed to get AI suggestions." });
    } finally {
      setIsSuggestingFromAI(false);
    }
  };
  
  const clearAllItems = async () => {
    if (!user || items.length === 0) return;
    try {
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
        description="Plan your next shopping trip efficiently. Add items or get AI suggestions."
      />
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Add Item to List</CardTitle>
            <CardDescription>Type an item name. We'll show matches from your past purchases.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                id="item-name-input"
                placeholder="e.g., Milk, Eggs, Bread"
                value={newItemNameInput}
                onChange={(e) => setNewItemNameInput(e.target.value)}
                className="flex-grow"
                aria-label="Item name"
              />
               <Button 
                onClick={handleAddUntrackedItem} 
                disabled={!newItemNameInput.trim() || authLoading || !user || (pastPurchaseSuggestions && pastPurchaseSuggestions.length > 0) }
                variant="outline"
                title="Add as new item if no suggestions match"
               >
                <PackagePlus className="mr-2 h-4 w-4" /> Add New
              </Button>
            </div>

            {isLoadingSuggestions && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching your past purchases...
              </div>
            )}

            {pastPurchaseSuggestions.length > 0 && !isLoadingSuggestions && (
              <div className="mt-2 space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Suggestions from your history:</h4>
                <ScrollArea className="h-[200px] rounded-md border p-2">
                  <ul className="space-y-2">
                    {pastPurchaseSuggestions.map(expense => (
                      <li key={expense.id} className="flex justify-between items-center p-2 rounded-md hover:bg-muted/50 text-sm">
                        <div>
                          <span className="font-medium">{expense.name}</span>
                          <div className="text-xs text-muted-foreground">
                            {selectedCurrency.symbol}{expense.price.toFixed(2)}
                            {expense.storeName && ` at ${expense.storeName}`}
                            {expense.brand && ` (${expense.brand})`}
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => handleAddItemFromSuggestion(expense)} title="Add this version to list">
                          <PlusCircle className="h-4 w-4 text-primary" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            )}
            
            {newItemNameInput.trim() && !isLoadingSuggestions && pastPurchaseSuggestions.length === 0 && (
                 <p className="text-sm text-muted-foreground">No exact matches in your purchase history for "{newItemNameInput}". You can still add it as a new item.</p>
            )}


            <div className="pt-4 border-t">
               <Button onClick={handleGetAISuggestions} disabled={isSuggestingFromAI || authLoading || !user} className="mt-2 w-full">
                {isSuggestingFromAI ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Get AI Quick Suggestions
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
              <p className="text-muted-foreground text-center py-4">Your shopping list is empty. Add items using the panel on the left.</p>
            ) : (
              <ScrollArea className="h-[calc(100%-80px)] sm:h-[400px] pr-3">
                <ul className="space-y-3">
                  {items.map(item => (
                    <li key={item.id} className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 transition-colors border-b last:border-b-0">
                      <div className="flex items-start space-x-3 flex-grow">
                        <Checkbox
                          id={`item-${item.id}`}
                          checked={item.isPurchased}
                          onCheckedChange={() => handleToggleItemPurchased(item.id)}
                          className="mt-1"
                          aria-label={`Mark ${item.name} as purchased`}
                        />
                        <div className="flex-grow">
                          <Label
                            htmlFor={`item-${item.id}`}
                            className={cn("font-medium cursor-pointer", item.isPurchased && "line-through text-muted-foreground")}
                          >
                            {item.name}
                            {item.isAISuggested && ( <Sparkles className="inline-block ml-1 h-3 w-3 text-primary" title="AI Suggested" /> )}
                          </Label>
                          {(item.price != null || item.storeName || item.brand || item.notes) && (
                            <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                              {item.price != null && <p>Price: {selectedCurrency.symbol}{item.price.toFixed(2)}</p>}
                              {item.storeName && <p>Store: {item.storeName}</p>}
                              {item.brand && <p>Brand: {item.brand}</p>}
                              {item.notes && <p className="italic">{item.notes}</p>}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)} aria-label={`Remove ${item.name}`} className="ml-2 self-start shrink-0">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
            {items.length > 0 && !isLoadingItems && (
                <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row gap-2">
                    <Button onClick={clearPurchasedItems} variant="outline" className="flex-1" disabled={authLoading || !user || items.filter(i=>i.isPurchased).length === 0}>Clear Purchased</Button>
                    <Button onClick={clearAllItems} variant="destructive" className="flex-1" disabled={authLoading || !user}>Clear All Items</Button>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}


    