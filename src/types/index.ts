
export interface Expense {
  id: string; // Firestore document ID
  userId: string; // Firebase Auth User UID
  name: string;
  price: number;
  category: string;
  date: string; // ISO date string, e.g., "2024-07-15"
  storeName?: string;
  brand?: string;
  receiptImageUrl?: string; // Optional: if a receipt image was uploaded
  createdAt?: number; // Timestamp for ordering, optional for now
}

export interface ScannedItem {
  name: string;
  price: number;
  brand: string;
  category: string;
}

export interface ScannedReceiptData {
  storeName: string;
  items: ScannedItem[];
  total: number;
}

export interface ShoppingListItem {
  id: string; // Firestore document ID
  userId: string; // Firebase Auth User UID
  name: string;
  category?: string;
  quantity?: number;
  isPurchased: boolean;
  isAISuggested?: boolean;
  price?: number;
  brand?: string;
  storeName?: string;
  notes?: string;
  createdAt?: number; // Timestamp for ordering, optional for now
}

export interface Category {
  id: string;
  name: string;
  icon?: React.ElementType;
  color?: string;
}

export interface Budget {
  id: string;
  userId: string;
  category: string;
  limit: number;
  spent: number;
  period: 'monthly' | 'weekly' | 'yearly';
}

export interface Alert {
  id: string;
  userId: string;
  type: 'budget_deviation' | 'suggestion' | 'reminder';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  timestamp: string;
  relatedEntityId?: string;
}
