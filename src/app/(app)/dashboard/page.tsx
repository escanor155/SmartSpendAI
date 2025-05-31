
"use client";

import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ReceiptText, ListPlus, FilePlus2, BarChart3, Info, CalendarClock, Loader2, Edit3, Save, X, PiggyBank, Wallet } from "lucide-react";
import { useCurrency } from "@/contexts/currency-context";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, doc, getDoc, setDoc } from "firebase/firestore";
import type { Expense } from "@/types";
import { useState, useEffect, useCallback } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';

const chartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6, 262 80% 50%))",
  "hsl(var(--chart-7, 320 75% 55%))",
];

const processExpensesForCategoryChart = (expenses: Expense[]) => {
  const categoryTotals: { [key: string]: number } = {};
  const now = new Date();
  const firstDayCurrentMonth = startOfMonth(now);
  const lastDayCurrentMonth = endOfMonth(now);

  expenses.forEach(expense => {
    if (typeof expense.date === 'string') {
      try {
        const expenseDate = parseISO(expense.date);
        if (expenseDate >= firstDayCurrentMonth && expenseDate <= lastDayCurrentMonth) {
          categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.price;
        }
      } catch (e) {
        console.warn(`Skipping expense with invalid date format: ${expense.date}`, expense);
      }
    } else {
        console.warn('Skipping expense with undefined or non-string date', expense);
    }
  });
  return Object.entries(categoryTotals).map(([name, value], index) => ({
    name,
    value,
    fill: chartColors[index % chartColors.length]
  }));
};

const calculateCurrentMonthTotalExpenses = (expenses: Expense[]): number => {
  const now = new Date();
  const firstDayCurrentMonth = startOfMonth(now);
  const lastDayCurrentMonth = endOfMonth(now);
  let total = 0;
  expenses.forEach(expense => {
     if (typeof expense.date === 'string') {
        try {
            const expenseDate = parseISO(expense.date);
            if (expenseDate >= firstDayCurrentMonth && expenseDate <= lastDayCurrentMonth) {
                total += expense.price;
            }
        } catch (e) {
            // console.warn(`Skipping expense in total calculation due to invalid date: ${expense.date}`, expense);
        }
     }
  });
  return total;
};


export default function DashboardPage() {
  const { selectedCurrency } = useCurrency();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [userExpenses, setUserExpenses] = useState<Expense[]>([]);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
  const [effectiveExpenses, setEffectiveExpenses] = useState<Expense[] | null>(null);

  const [expensesByCategory, setExpensesByCategory] = useState<ReturnType<typeof processExpensesForCategoryChart>>([]);
  const [currentMonthTotalExpenses, setCurrentMonthTotalExpenses] = useState<number | null>(null);

  const [monthlyBudget, setMonthlyBudget] = useState<number | null>(null);
  const [isLoadingBudget, setIsLoadingBudget] = useState(true);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [newBudgetAmount, setNewBudgetAmount] = useState<string>("");

  const fetchUserPreferences = useCallback(async () => {
    if (!user) return;
    setIsLoadingBudget(true);
    try {
      const prefRef = doc(db, "userPreferences", user.uid);
      const docSnap = await getDoc(prefRef);
      if (docSnap.exists() && docSnap.data().monthlyBudget !== undefined) {
        const budget = parseFloat(docSnap.data().monthlyBudget);
        setMonthlyBudget(budget);
        setNewBudgetAmount(budget.toString());
      } else {
        setMonthlyBudget(0); 
        setNewBudgetAmount("0");
      }
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch budget." });
      setMonthlyBudget(0); 
      setNewBudgetAmount("0");
    } finally {
      setIsLoadingBudget(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user && !authLoading) {
      fetchUserPreferences();
    } else if (!user && !authLoading) {
      setIsLoadingBudget(false);
      setMonthlyBudget(null);
    }
  }, [user, authLoading, fetchUserPreferences]);

  const handleSaveBudget = async () => {
    if (!user) return;
    const budgetVal = parseFloat(newBudgetAmount);
    if (isNaN(budgetVal) || budgetVal < 0) {
      toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a valid budget amount." });
      return;
    }
    // No need to set isLoadingBudget here, use a different state if desired for save operation
    try {
      const prefRef = doc(db, "userPreferences", user.uid);
      await setDoc(prefRef, { monthlyBudget: budgetVal }, { merge: true });
      setMonthlyBudget(budgetVal);
      setIsEditingBudget(false);
      toast({ title: "Success", description: "Monthly budget updated." });
    } catch (error) {
      console.error("Error saving budget:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not save budget." });
    }
  };

  useEffect(() => {
    if (!user && !authLoading) {
      setUserExpenses([]);
      setIsLoadingExpenses(false);
      setEffectiveExpenses([]); // Also clear effective expenses
      return;
    }
    if (!user) return;

    setIsLoadingExpenses(true);
    setEffectiveExpenses(null); // Reset effective expenses when user changes or starts loading
    const expensesCol = collection(db, "expenses");
    const q = query(expensesCol, where("userId", "==", user.uid), orderBy("date", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedExpenses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Expense));
      setUserExpenses(fetchedExpenses);
      setIsLoadingExpenses(false); // This will trigger the effect below
    }, (error) => {
      console.error("Error fetching expenses for dashboard:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch expense data for dashboard." });
      setIsLoadingExpenses(false);
      setEffectiveExpenses([]); // Ensure effectiveExpenses is not null on error
    });

    return () => unsubscribe();
  }, [user, authLoading, toast]);

  // Effect to create a slightly delayed "effectiveExpenses"
  useEffect(() => {
    if (authLoading) { // If auth is still loading, don't process
      setEffectiveExpenses(null);
      return;
    }
    if (isLoadingExpenses) { // If expenses are still in primary loading phase
      setEffectiveExpenses(null);
      return;
    }
    // At this point, isLoadingExpenses is false.
    // Use a timeout to defer setting effectiveExpenses by one event loop cycle.
    // This gives userExpenses from onSnapshot a chance to be the most current.
    const timer = setTimeout(() => {
      setEffectiveExpenses(userExpenses);
    }, 0);

    return () => clearTimeout(timer); // Cleanup the timer
  }, [userExpenses, isLoadingExpenses, authLoading]);


  // Effect to calculate totals based on "effectiveExpenses"
  useEffect(() => {
    // If auth is loading or effectiveExpenses is not yet ready (still null)
    if (authLoading || effectiveExpenses === null) {
      setCurrentMonthTotalExpenses(null);
      setExpensesByCategory([]);
      return;
    }
    
    const processedCategoryData = processExpensesForCategoryChart(effectiveExpenses);
    const totalForMonth = calculateCurrentMonthTotalExpenses(effectiveExpenses);
    
    setExpensesByCategory(processedCategoryData);
    setCurrentMonthTotalExpenses(totalForMonth);

  }, [effectiveExpenses, authLoading]); // Depend on effectiveExpenses

  const categoryChartConfig = expensesByCategory.reduce((acc, item) => {
    acc[item.name] = { label: item.name, color: item.fill };
    return acc;
  }, {} as ChartConfig);

  // Remaining balance calculation is now implicitly correct if currentMonthTotalExpenses is correct
  const remainingBalance = monthlyBudget !== null && currentMonthTotalExpenses !== null 
    ? monthlyBudget - currentMonthTotalExpenses 
    : null;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Welcome back! Here's your financial overview."
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Budget</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {authLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : isLoadingBudget ? ( // Specifically for budget loading after auth
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : user && monthlyBudget !== null ? (
              isEditingBudget ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={newBudgetAmount}
                    onChange={(e) => setNewBudgetAmount(e.target.value)}
                    placeholder="Enter budget"
                    className="h-9 text-lg"
                  />
                  <Button onClick={handleSaveBudget} size="icon" variant="ghost" className="h-9 w-9">
                    <Save className="h-5 w-5 text-green-500" />
                  </Button>
                  <Button onClick={() => { setIsEditingBudget(false); setNewBudgetAmount(monthlyBudget.toString()); }} size="icon" variant="ghost" className="h-9 w-9">
                    <X className="h-5 w-5 text-red-500" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">
                    {selectedCurrency.symbol}{monthlyBudget.toFixed(2)}
                  </div>
                  <Button onClick={() => setIsEditingBudget(true)} size="icon" variant="ghost">
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </div>
              )
            ) : user ? (
                 <div className="flex items-center justify-between">
                    <p className="text-muted-foreground">Set your budget</p>
                     <Button onClick={() => setIsEditingBudget(true)} size="sm" variant="outline">
                        Set Budget
                    </Button>
                 </div>
            ) : (
                <p className="text-muted-foreground">Log in to set a budget.</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Your target spending for the month.</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {authLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
             ) : !user ? (
                 <p className="text-muted-foreground">Log in to view balance.</p>
             ) : isLoadingBudget ? ( // Budget still loading
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
             ) : monthlyBudget === null ? ( // Budget not set
                <p className="text-muted-foreground">Set a budget to see remaining balance.</p>
             ) : effectiveExpenses === null ? ( // Expenses (and thus total) not yet processed/settled
                <p className="text-muted-foreground">Calculating balance...</p>
             ) : currentMonthTotalExpenses !== null && remainingBalance !== null ? ( // All data available
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {selectedCurrency.symbol}{remainingBalance.toFixed(2)}
                </div>
             ) : ( // Fallback, should ideally not be hit frequently if logic is tight
                 <p className="text-muted-foreground">Processing balance details...</p>
             )}
            <p className="text-xs text-muted-foreground mt-1">
                {monthlyBudget !== null && currentMonthTotalExpenses !== null && effectiveExpenses !== null
                    ? `Based on your ${selectedCurrency.symbol}${monthlyBudget.toFixed(2)} budget.` 
                    : monthlyBudget !== null ? "Processing expenses..."
                    : "Set a budget to track."}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spending Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold text-muted-foreground">No active alerts</div>
            <p className="text-xs text-muted-foreground">Budget alerts will show here when implemented.</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Easily manage your finances.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/expenses?action=scan">
                <ReceiptText className="mr-2 h-4 w-4" />
                Scan Receipt
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/expenses?action=add">
                <FilePlus2 className="mr-2 h-4 w-4" />
                Add Expense
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
               <Link href="/shopping-list">
                <ListPlus className="mr-2 h-4 w-4" />
                View Shopping List
               </Link>
            </Button>
             <Button asChild variant="outline" className="w-full justify-start">
               <Link href="/reports">
                <BarChart3 className="mr-2 h-4 w-4" />
                View Reports
               </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Current Month Spending</CardTitle>
            <CardDescription>Your expenses by category this month.</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[250px] flex flex-col justify-center items-center">
            {authLoading || effectiveExpenses === null ? ( 
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
                <p className="mt-2">Loading spending summary...</p>
              </div>
            ) : !user ? (
                 <p className="text-muted-foreground">Please log in to see your spending summary.</p>
            ) : expensesByCategory.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
                <Info className="h-10 w-10 mb-2" />
                <p>No expenses recorded for the current month.</p>
                <p className="text-xs">Add some expenses to see your summary here.</p>
              </div>
            ) : (
              <>
                <ChartContainer config={categoryChartConfig} className="w-full h-[200px] sm:h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <ChartTooltipContent
                        hideLabel
                        nameKey="name"
                        formatter={(value, name, item) => {
                          const itemPayload = item.payload;
                          if (!itemPayload) return null;
                          const color = itemPayload.fill || itemPayload.color;
                          const categoryName = itemPayload.name;
                          return (
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                              <div className="flex-1">
                                <span>{categoryName}: </span>
                                <span className="font-bold">{selectedCurrency.symbol}{Number(value).toFixed(2)}</span>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Pie data={expensesByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                        {expensesByCategory.map((entry) => (
                          <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
                 <p className="mt-4 text-center text-sm text-muted-foreground">
                    Detailed charts available in <Link href="/reports" className="text-primary hover:underline">Reports</Link>.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
