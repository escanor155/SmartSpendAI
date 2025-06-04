
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Sparkles, Info } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Expense } from '@/types';
import { categorizeExpense } from '@/ai/flows/categorize-expenses'; 
import { useToast } from '@/hooks/use-toast';

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

  useEffect(() => {
    if (initialData) {
      reset({
        ...initialData,
        date: initialData.date ? new Date(initialData.date) : new Date(),
        price: Number(initialData.price),
        storeName: initialData.storeName || '',
        brand: initialData.brand || ''
      });
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
        setCachedCategory(itemName, suggestedCategory); // Cache the new suggestion
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
      userId: initialData?.userId || "", // Will be set by parent component if new
      ...data,
      date: format(data.date, 'yyyy-MM-dd'), 
    };
    onSubmitExpense(expenseData);
  };

  return (
    <form onSubmit={handleSubmit(processSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <Label htmlFor="name">Item Name</Label>
          <div className="flex items-center gap-2">
            <Input id="name" {...register('name')} className={cn(errors.name && "border-destructive")} />
            <Button type="button" onClick={handleSuggestCategory} disabled={isCategorizing || !itemName} size="sm" variant="outline">
              {isCategorizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Suggest Category
            </Button>
          </div>
          {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="price">Price</Label>
          <Input id="price" type="number" step="0.01" {...register('price')} className={cn(errors.price && "border-destructive")} />
          {errors.price && <p className="text-sm text-destructive mt-1">{errors.price.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={field.value instanceof Date ? field.value : undefined}
                    onSelect={(date) => field.onChange(date || new Date())}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}
          />
          {errors.date && <p className="text-sm text-destructive mt-1">{errors.date.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <Label htmlFor="storeName">Store Name (Optional)</Label>
          <Input id="storeName" {...register('storeName')} />
        </div>
        <div>
          <Label htmlFor="brand">Brand (Optional)</Label>
          <Input id="brand" {...register('brand')} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
          {initialData ? 'Update Expense' : 'Add Expense'}
        </Button>
      </div>
    </form>
  );
}
