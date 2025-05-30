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
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Expense } from '@/types';
import { categorizeExpense } from '@/ai/flows/categorize-expenses'; // AI function

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

// Sample categories - in a real app, these might come from user settings or a predefined list
const categories = ["Food", "Transportation", "Utilities", "Entertainment", "Healthcare", "Shopping", "Other"];

export function ExpenseForm({ onSubmitExpense, initialData }: ExpenseFormProps) {
  const { register, handleSubmit, control, formState: { errors }, setValue, watch } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: initialData ? {
      ...initialData,
      date: new Date(initialData.date),
      price: Number(initialData.price) // Ensure price is number
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
      setValue('name', initialData.name);
      setValue('price', Number(initialData.price));
      setValue('category', initialData.category);
      setValue('date', new Date(initialData.date));
      setValue('storeName', initialData.storeName || '');
      setValue('brand', initialData.brand || '');
    }
  }, [initialData, setValue]);

  const handleSuggestCategory = async () => {
    if (!itemName) return;
    setIsCategorizing(true);
    try {
      const result = await categorizeExpense({ receiptText: itemName });
      if (result.categories && result.categories.length > 0) {
        const suggestedCategory = result.categories[0].category;
        // Check if suggested category is in our list, otherwise set to "Other" or add it
        if (categories.includes(suggestedCategory)) {
          setValue('category', suggestedCategory, { shouldValidate: true });
        } else {
           // If not in predefined list, you might add it or default to 'Other'
           // For now, let's try to set it and if Select doesn't have it, it won't show
           setValue('category', suggestedCategory, { shouldValidate: true });
        }
      }
    } catch (error) {
      console.error("Error suggesting category:", error);
      // Handle error (e.g., show a toast message)
    } finally {
      setIsCategorizing(false);
    }
  };

  const processSubmit = (data: ExpenseFormData) => {
    const expenseData: Expense = {
      id: initialData?.id || Date.now().toString(), // Keep existing ID if editing
      ...data,
      date: format(data.date, 'yyyy-MM-dd'), // Format date to string for storage
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
              {isCategorizing ? 'Suggesting...' : 'Suggest Category'}
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
                  {/* If AI suggests a new category not in the list, it might not show here unless added to 'categories' state */}
                  {field.value && !categories.includes(field.value) && (
                     <SelectItem value={field.value} disabled>{field.value} (Suggested)</SelectItem>
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
                    selected={field.value}
                    onSelect={field.onChange}
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
