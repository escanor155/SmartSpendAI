
"use client";

import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, AlertTriangle, ReceiptText, ListPlus, FilePlus2, BarChart3, Info, CalendarClock, Loader2 } from "lucide-react";
import { useCurrency } from "@/contexts/currency-context";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import type { Expense } from "@/types";
import { useState, useEffect } from "react";
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
    const expenseDate = parseISO(expense.date); 
    
    if (expenseDate >= firstDayCurrentMonth && expenseDate <= lastDayCurrentMonth) {
      categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.price;
    }
  });
  return Object.entries(categoryTotals).map(([name, value], index) => ({ 
    name, 
    value, 
    fill: chartColors[index % chartColors.length] 
  }));
};


export default function DashboardPage() {
  const { selectedCurrency } = useCurrency();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [userExpenses, setUserExpenses] = useState<Expense[]>([]);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
  const [expensesByCategory, setExpensesByCategory] = useState<ReturnType<typeof processExpensesForCategoryChart>>([]);

  useEffect(() => {
    if (!user && !authLoading) {
      setUserExpenses([]);
      setIsLoadingExpenses(false);
      return;
    }
    if (!user) return;

    setIsLoadingExpenses(true);
    const expensesCol = collection(db, "expenses");
    const q = query(expensesCol, where("userId", "==", user.uid), orderBy("date", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedExpenses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Expense));
      setUserExpenses(fetchedExpenses);
      setIsLoadingExpenses(false);
    }, (error) => {
      console.error("Error fetching expenses for dashboard:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch expense data for dashboard." });
      setIsLoadingExpenses(false);
    });

    return () => unsubscribe();
  }, [user, authLoading, toast]);

  useEffect(() => {
    if (userExpenses.length > 0) {
      setExpensesByCategory(processExpensesForCategoryChart(userExpenses));
    } else {
      setExpensesByCategory([]);
    }
  }, [userExpenses]);

  const categoryChartConfig = expensesByCategory.reduce((acc, item) => {
    acc[item.name] = { label: item.name, color: item.fill };
    return acc;
  }, {} as ChartConfig);


  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Welcome back! Here's your financial overview."
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold text-muted-foreground">Feature coming soon</div>
            <p className="text-xs text-muted-foreground">Track your overall net worth.</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Bills</CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold text-muted-foreground">No upcoming bills to display</div>
            <p className="text-xs text-muted-foreground">Get reminders for your bills when data is available.</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spending Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold text-muted-foreground">No active alerts</div>
            <p className="text-xs text-muted-foreground">Budget alerts will show here.</p>
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
            {authLoading || isLoadingExpenses ? (
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

