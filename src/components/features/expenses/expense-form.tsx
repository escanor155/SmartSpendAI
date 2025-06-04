
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Sparkles, Info, Loader2, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Expense } from '@/types';
import { categorizeExpense } from '@/ai/flows/categorize-expenses'; 
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCurrency } from '@/contexts/currency-context';

const expenseSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  price: z.coerce.number().min(0.01, "Price must be positive"),
  category: z.string().min(1, "Category is required"),
  date: z.date({ required_error: "Date is required" }),
  storeName: z.string().optional(),
  brand: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  onSubmitExpense: (data: Expense) => void;
  initialData?: Expense | null;
}

const categories = ["Food", "Transportation", "Utilities", "Entertainment", "Healthcare", "Shopping", "Other"];
const LOCAL_STORAGE_CATEGORY_CACHE_KEY = 'smartspend-category-cache';

export function ExpenseForm({ onSubmitExpense, initialData }: ExpenseFormProps) {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { selectedCurrency } = useCurrency();
  
  const { register, handleSubmit, control, formState: { errors }, setValue, watch, reset } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: initialData ? {
      ...initialData,
      date: initialData.date ? new Date(initialData.date) : new Date(),
      price: Number(initialData.price) 
    } : {
      name: '',
      price: 0,
      category: '',
      date: new Date(),
      storeName: '',
      brand: ''
    },
  });

  const [isCategorizing, setIsCategorizing] = useState(false);
  const itemName = watch("name");

  const [pastExpenseSuggestions, setPastExpenseSuggestions] = useState<Expense[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  useEffect(() => {
    if (initialData) {
      reset({
        ...initialData,
        date: initialData.date ? new Date(initialData.date) : new Date(),
        price: Number(initialData.price),
        storeName: initialData.storeName || '',
        brand: initialData.brand || ''
      });
      setPastExpenseSuggestions([]); // Clear suggestions when editing an existing expense
    } else {
      reset({
        name: '',
        price: 0,
        category: '',
        date: new Date(),
        storeName: '',
        brand: ''
      });
    }
  }, [initialData, reset]);

  const getCachedCategory = (item: string): string | null => {
    try {
      const cacheString = localStorage.getItem(LOCAL_STORAGE_CATEGORY_CACHE_KEY);
      if (!cacheString) return null;
      const cache = JSON.parse(cacheString);
      return cache[item.toLowerCase()] || null;
    } catch (e) {
      console.error("Error reading category cache:", e);
      return null;
    }
  };

  const setCachedCategory = (item: string, category: string) => {
    try {
      const cacheString = localStorage.getItem(LOCAL_STORAGE_CATEGORY_CACHE_KEY);
      const cache = cacheString ? JSON.parse(cacheString) : {};
      cache[item.toLowerCase()] = category;
      localStorage.setItem(LOCAL_STORAGE_CATEGORY_CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
      console.error("Error writing category cache:", e);
    }
  };

  const handleSuggestCategory = async () => {
    if (!itemName) return;
    setIsCategorizing(true);

    const cachedCategory = getCachedCategory(itemName);
    if (cachedCategory) {
      setValue('category', cachedCategory, { shouldValidate: true });
      toast({
        title: "Cached Category Applied",
        description: `Used cached category "${cachedCategory}" for "${itemName}".`,
        action: <Info className="h-5 w-5 text-blue-500" />,
      });
      setIsCategorizing(false);
      return;
    }

    try {
      const result = await categorizeExpense({ receiptText: itemName });
      if (result.categories && result.categories.length > 0) {
        const suggestedCategory = result.categories[0].category;
        setValue('category', suggestedCategory, { shouldValidate: true });
        setCachedCategory(itemName, suggestedCategory); 
        toast({
          title: "AI Category Suggested",
          description: `AI suggested "${suggestedCategory}" for "${itemName}".`,
          action: <Sparkles className="h-5 w-5 text-primary" />,
        });
      } else {
        toast({
          variant: "destructive",
          title: "AI Suggestion Failed",
          description: "AI could not suggest a category for this item.",
        });
      }
    } catch (error: any) {
      console.error("Error suggesting category:", error);
      const errorMessage = error.message || "Could not get AI category suggestion.";
      toast({ variant: "destructive", title: "AI Error", description: errorMessage });
    } finally {
      setIsCategorizing(false);
    }
  };

  const processSubmit = (data: ExpenseFormData) => {
    const expenseData: Expense = {
      id: initialData?.id || Date.now().toString(), 
      userId: initialData?.userId || "", 
      ...data,
      date: format(data.date, 'yyyy-MM-dd'), 
    };
    onSubmitExpense(expenseData);
    setPastExpenseSuggestions([]); // Clear suggestions after submit
  };

  const handleSearchPastExpenses = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim() || !user || initialData) { // Don't search if editing
      setPastExpenseSuggestions([]);
      return;
    }
    setIsLoadingSuggestions(true);
    try {
      const lowerSearchTerm = searchTerm.toLowerCase();
      const expensesCol = collection(db, "expenses");
      const q = query(
        expensesCol, 
        where("userId", "==", user.uid),
        orderBy("date", "desc"), // Get recent ones first
        limit(20) // Limit initial fetch for broader client-side filtering
      );

      const snapshot = await getDocs(q);
      const allUserExpenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
      
      const matchedExpenses = allUserExpenses.filter(expense => 
        expense.name.toLowerCase().includes(lowerSearchTerm)
      ).slice(0, 5); // Show top 5 matches after client-side filter

      setPastExpenseSuggestions(matchedExpenses);
    } catch (error) {
      console.error("Error searching past expenses:", error);
      toast({ variant: "destructive", title: "Search Error", description: "Could not search past expenses." });
      setPastExpenseSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [user, toast, initialData]);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (itemName && itemName.trim().length > 1 && !initialData) {
        handleSearchPastExpenses(itemName);
      } else {
        setPastExpenseSuggestions([]);
      }
    }, 500); 
    return () => clearTimeout(timer);
  }, [itemName, handleSearchPastExpenses, initialData]);

  const handleUseSuggestion = (suggestion: Expense) => {
    setValue('name', suggestion.name);
    setValue('price', suggestion.price);
    setValue('category', suggestion.category);
    setValue('storeName', suggestion.storeName || '');
    setValue('brand', suggestion.brand || '');
    // Optionally, could also set the date if needed, but typically users want current date for new entries
    setPastExpenseSuggestions([]); // Clear suggestions after one is used
    toast({ title: "Suggestion Applied", description: `Details from "${suggestion.name}" pre-filled.`});
  };


  return (
    <form onSubmit={handleSubmit(processSubmit)} className="space-y-6">
      <div>
        <Label htmlFor="name">Item Name</Label>
        <div className="flex items-center gap-2">
          <Input 
            id="name" 
            {...register('name')} 
            className={cn(errors.name && "border-destructive")} 
            disabled={!!initialData} // Disable if editing, as we don't want to trigger search
          />
          <Button type="button" onClick={handleSuggestCategory} disabled={isCategorizing || !itemName || !!initialData} size="sm" variant="outline">
            {isCategorizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Suggest Category
          </Button>
        </div>
        {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}

        {isLoadingSuggestions && !initialData && (
          <div className="flex items-center text-sm text-muted-foreground mt-2">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching your past expenses...
          </div>
        )}

        {pastExpenseSuggestions.length > 0 && !isLoadingSuggestions && !initialData && (
          <Card className="mt-2 shadow-sm">
            <CardContent className="p-0">
              <h4 className="text-xs font-medium text-muted-foreground px-3 pt-2 pb-1 border-b">Suggestions from your history:</h4>
              <ScrollArea className="h-auto max-h-[150px]">
                <ul className="divide-y divide-border">
                  {pastExpenseSuggestions.map(expense => (
                    <li key={expense.id} className="flex justify-between items-center p-2 hover:bg-muted/50 text-xs">
                      <div>
                        <span className="font-medium block">{expense.name}</span>
                        <span className="text-muted-foreground">
                          {selectedCurrency.symbol}{expense.price.toFixed(2)} - {expense.category}
                          {expense.storeName && ` at ${expense.storeName}`}
                        </span>
                      </div>
                      <Button size="xs" variant="ghost" onClick={() => handleUseSuggestion(expense)} title="Use this expense's details">
                        <PlusCircle className="h-3 w-3 mr-1" /> Use
                      </Button>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <Label htmlFor="price">Price</Label>
          <Input id="price" type="number" step="0.01" {...register('price')} className={cn(errors.price && "border-destructive")} />
          {errors.price && <p className="text-sm text-destructive mt-1">{errors.price.message}</p>}
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value} >
                <SelectTrigger className={cn(errors.category && "border-destructive")}>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                  {field.value && !categories.includes(field.value) && (
                     <SelectItem value={field.value}>{field.value} (Custom)</SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          />
          {errors.category && <p className="text-sm text-destructive mt-1">{errors.category.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <Label htmlFor="date">Date</Label>
          <Controller
            name="date"
            control={control}
            render={({ field }) => (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !field.value && "text-muted-foreground",
                      errors.date && "border-destructive"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {field.value instanceof Date ? format(field.value, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={field.value instanceof Date ? field.value : undefined}
                    onSelect={(date) => field.onChange(date || new Date())} // Ensure date is always Date or fallback
                    initialFocus
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                  />
                </PopoverContent>
              </Popover>
            )}
          />
          {errors.date && <p className="text-sm text-destructive mt-1">{errors.date.message}</p>}
        </div>
        <div>
          <Label htmlFor="storeName">Store Name (Optional)</Label>
          <Input id="storeName" {...register('storeName')} />
        </div>
      </div>
      
      <div>
        <Label htmlFor="brand">Brand (Optional)</Label>
        <Input id="brand" {...register('brand')} />
      </div>

      <div className="flex justify-end">
        <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
          {initialData ? 'Update Expense' : 'Add Expense'}
        </Button>
      </div>
    </form>
  );
}

