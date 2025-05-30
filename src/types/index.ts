export interface Expense {
  id: string;
  name: string;
  price: number;
  category: string;
  date: string; // ISO date string, e.g., "2024-07-15"
  storeName?: string;
  brand?: string;
  receiptImageUrl?: string; // Optional: if a receipt image was uploaded
}

export interface ScannedItem {
  name: string;
  price: number;
  brand: string;
}

export interface ScannedReceiptData {
  storeName: string;
  items: ScannedItem[];
  total: number;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  category?: string;
  quantity?: number;
  notes?: string;
  isPurchased: boolean;
  isAISuggested?: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon?: React.ElementType; // Lucide icon component
  color?: string; // Hex color for UI representation
}

export interface Budget {
  id: string;
  category: string; // Or categoryId
  limit: number;
  spent: number; // Calculated from expenses
  period: 'monthly' | 'weekly' | 'yearly';
}

export interface Alert {
  id: string;
  type: 'budget_deviation' | 'suggestion' | 'reminder';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  timestamp: string; // ISO date-time string
  relatedEntityId?: string; // e.g., budgetId or expenseId
}
