
"use client";

import React, { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from 'next/navigation';
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, ReceiptText, Loader2 } from "lucide-react";
import type { Expense } from "@/types";
import { ExpenseForm } from "@/components/features/expenses/expense-form";
import { ExpenseTable } from "@/components/features/expenses/expense-table";
import { ReceiptScanModal } from "@/components/features/expenses/receipt-scan-modal";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { 
  collection, query, where, orderBy, onSnapshot, 
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDoc 
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

function ExpensesContent() {
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
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

  useEffect(() => {
    if (!user) {
      if (!authLoading) { 
        setExpenses([]);
        setIsLoadingExpenses(false);
      }
      return;
    }

    setIsLoadingExpenses(true);
    const expensesCol = collection(db, "expenses");
    const q = query(expensesCol, where("userId", "==", user.uid), orderBy("date", "desc"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userExpenses = snapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        // Ensure 'id' is the Firestore document ID and not overwritten by data.id if it exists.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: internalId, ...restData } = data; 
        return {
          ...restData,
          id: docSnapshot.id, 
        } as Expense;
      });
      setExpenses(userExpenses);
      setIsLoadingExpenses(false);
    }, (error) => {
      console.error("Error fetching expenses:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch expenses." });
      setIsLoadingExpenses(false);
    });

    return () => unsubscribe();
  }, [user, authLoading, toast]);


  const handleAddExpense = async (expenseDataFromForm: Expense) => {
    if (!user) {
      toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to add expenses." });
      return;
    }
    // Destructure to remove the form-generated 'id' and other client-only or server-generated fields.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, userId, createdAt, ...dataToSave } = expenseDataFromForm; 
    
    try {
      await addDoc(collection(db, "expenses"), {
        ...dataToSave, // This now excludes the internal 'id' field
        userId: user.uid,
        createdAt: serverTimestamp() 
      });
      toast({ title: "Success", description: "Expense added successfully." });
      setShowExpenseForm(false);
      setEditingExpense(null);
    } catch (error) {
      console.error("Error adding expense:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not add expense." });
    }
  };

  const handleUpdateExpense = async (updatedExpense: Expense) => {
     if (!user) {
      toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to update expenses." });
      return;
    }
    
    if (updatedExpense.userId !== user.uid) {
      toast({ variant: "destructive", title: "Authorization Error", description: "You cannot update this expense."});
      return;
    }
    try {
      // updatedExpense.id here IS the Firestore Document ID because of the corrected mapping
      const expenseRef = doc(db, "expenses", updatedExpense.id); 
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, userId, createdAt, ...dataToUpdate } = updatedExpense; 
      
      // dataToUpdate will not contain the internal 'id' if it was present in updatedExpense's spread data
      // and also correctly uses the actual client-side fields for updating.
      await updateDoc(expenseRef, dataToUpdate);
      toast({ title: "Success", description: "Expense updated successfully." });
      setShowExpenseForm(false);
      setEditingExpense(null);
    } catch (error) {
      console.error("Error updating expense:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not update expense." });
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setShowExpenseForm(true);
  };

  const handleDeleteExpense = async (expenseFirestoreId: string) => { // Renamed parameter for clarity
    if (!user) {
      toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to delete expenses." });
      return;
    }

    // This log now uses expenseFirestoreId which should be the actual Firestore document ID
    console.log(`Attempting to delete expense. User UID: ${user.uid}, Expense Document ID: ${expenseFirestoreId}`);

    try {
      // Use the correct Firestore document ID for deletion
      await deleteDoc(doc(db, "expenses", expenseFirestoreId)); 
      toast({ title: "Success", description: "Expense deleted successfully." });
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not delete expense." });
    }
  };

  const handleToggleForm = () => {
    setShowExpenseForm(prev => !prev);
    if (showExpenseForm) setEditingExpense(null); 
  }

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
              <ReceiptScanModal onOpenChange={setIsReceiptModalOpen} />
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
          {authLoading || isLoadingExpenses ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="mr-2 h-6 w-6 animate-spin" />
              <span>Loading expenses...</span>
            </div>
          ) : (
            <ExpenseTable
              expenses={expenses}
              onEdit={handleEditExpense}
              onDelete={handleDeleteExpense}
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}

export default function ExpensesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="mr-2 h-8 w-8 animate-spin" /> Loading expenses page...</div>}>
      <ExpensesContent />
    </Suspense>
  );
}

