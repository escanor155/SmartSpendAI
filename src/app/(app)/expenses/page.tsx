"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from 'next/navigation';
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, ReceiptText } from "lucide-react";
import type { Expense } from "@/types";
import { ExpenseForm } from "@/components/features/expenses/expense-form";
import { ExpenseTable } from "@/components/features/expenses/expense-table";
import { ReceiptScanModal } from "@/components/features/expenses/receipt-scan-modal";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";

// Mock data for expenses - replace with actual data fetching
const mockExpenses: Expense[] = [
  { id: "1", name: "Groceries", price: 75.50, category: "Food", date: "2024-07-12", storeName: "SuperMart" },
  { id: "2", name: "Gasoline", price: 45.00, category: "Transportation", date: "2024-07-10", storeName: "Gas Station" },
  { id: "3", name: "Dinner Out", price: 60.25, category: "Dining", date: "2024-07-08", storeName: "The Italian Place" },
  { id: "4", name: "Coffee", price: 4.75, category: "Food", date: "2024-07-15", storeName: "Cafe Express" },
];


function ExpensesContent() {
  const searchParams = useSearchParams();
  const [expenses, setExpenses] = useState<Expense[]>(mockExpenses);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setShowExpenseForm(true);
      setEditingExpense(null);
    }
    if (searchParams.get('action') === 'scan') {
      setIsReceiptModalOpen(true);
    }
  }, [searchParams]);


  const handleAddExpense = (newExpense: Omit<Expense, 'id'>) => {
    const expenseWithId = { ...newExpense, id: Date.now().toString() };
    setExpenses(prev => [expenseWithId, ...prev]);
    setShowExpenseForm(false);
    setEditingExpense(null);
  };

  const handleUpdateExpense = (updatedExpense: Expense) => {
    setExpenses(prev => prev.map(exp => exp.id === updatedExpense.id ? updatedExpense : exp));
    setShowExpenseForm(false);
    setEditingExpense(null);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setShowExpenseForm(true);
  };

  const handleDeleteExpense = (expenseId: string) => {
    setExpenses(prev => prev.filter(exp => exp.id !== expenseId));
  };

  const handleToggleForm = () => {
    setShowExpenseForm(prev => !prev);
    if (showExpenseForm) setEditingExpense(null); // Clear editing state if closing form
  }

  const handleReceiptScanned = (scannedData: Expense[]) => {
    setExpenses(prev => [...scannedData, ...prev]);
    setIsReceiptModalOpen(false);
  };

  return (
    <>
      <PageHeader
        title="Expenses"
        description="Track and manage your spending."
        actions={
          <div className="flex gap-2">
            <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <ReceiptText className="mr-2 h-4 w-4" />
                  Scan Receipt
                </Button>
              </DialogTrigger>
              <ReceiptScanModal onReceiptScanned={handleReceiptScanned} onOpenChange={setIsReceiptModalOpen} />
            </Dialog>
            <Button onClick={handleToggleForm}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {showExpenseForm ? "Cancel" : (editingExpense ? "Cancel Edit" : "Add Expense")}
            </Button>
          </div>
        }
      />

      {showExpenseForm && (
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle>{editingExpense ? "Edit Expense" : "Add New Expense"}</CardTitle>
            <CardDescription>
              {editingExpense ? "Update the details of your expense." : "Fill in the details to log a new expense."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExpenseForm
              onSubmitExpense={editingExpense ? handleUpdateExpense : handleAddExpense}
              initialData={editingExpense}
            />
          </CardContent>
        </Card>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Expense History</CardTitle>
          <CardDescription>A list of your recent expenses.</CardDescription>
        </CardHeader>
        <CardContent>
          <ExpenseTable
            expenses={expenses}
            onEdit={handleEditExpense}
            onDelete={handleDeleteExpense}
          />
        </CardContent>
      </Card>
    </>
  );
}


export default function ExpensesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ExpensesContent />
    </Suspense>
  );
}
