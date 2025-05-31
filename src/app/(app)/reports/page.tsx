
"use client";

import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import type { Expense } from "@/types";
import { useState, useEffect } from "react";
import { useCurrency } from "@/contexts/currency-context";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const chartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const processExpensesForCategoryChart = (expenses: Expense[]) => {
  const categoryTotals: { [key: string]: number } = {};
  expenses.forEach(expense => {
    categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.price;
  });
  return Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));
};

const processExpensesForMonthlyTrend = (expenses: Expense[]) => {
  const monthlyTotals: { [key: string]: { total: number, count: number } } = {};
  expenses.forEach(expense => {
    const month = new Date(expense.date).toLocaleString('default', { month: 'short', year: 'numeric' });
    if (!monthlyTotals[month]) {
      monthlyTotals[month] = { total: 0, count: 0 };
    }
    monthlyTotals[month].total += expense.price;
    monthlyTotals[month].count += 1;
  });
  
  return Object.entries(monthlyTotals)
    .map(([name, data]) => ({ name, total: data.total, count: data.count }))
    .sort((a,b) => new Date(a.name).getTime() - new Date(b.name).getTime());
};


export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const { selectedCurrency } = useCurrency();
  const { toast } = useToast();

  const [userExpenses, setUserExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [expensesByCategory, setExpensesByCategory] = useState<any[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      if (!authLoading) { // Only set loading to false if auth is resolved and there's no user
        setUserExpenses([]);
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    const expensesCol = collection(db, "expenses");
    const q = query(expensesCol, where("userId", "==", user.uid), orderBy("date", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedExpenses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Expense));
      setUserExpenses(fetchedExpenses);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching expenses for reports:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch expense data for reports." });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading, toast]);

  useEffect(() => {
    if (userExpenses.length > 0) {
      setExpensesByCategory(processExpensesForCategoryChart(userExpenses));
      setMonthlyTrend(processExpensesForMonthlyTrend(userExpenses));
    } else {
      setExpensesByCategory([]);
      setMonthlyTrend([]);
    }
  }, [userExpenses]);
  
  const categoryChartConfig = expensesByCategory.reduce((acc, item, index) => {
    acc[item.name] = { label: item.name, color: chartColors[index % chartColors.length] };
    return acc;
  }, {} as ChartConfig);

  const monthlyTrendChartConfig = {
    total: { label: "Total Spending", color: "hsl(var(--chart-1))" },
  } satisfies ChartConfig;

  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <PageHeader
            title="Reports"
            description="Visualize your spending habits and financial trends."
        />
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p className="mt-2">Loading reports...</p>
      </div>
    );
  }
  
  if (!user && !authLoading) {
     return (
        <>
         <PageHeader
            title="Reports"
            description="Visualize your spending habits and financial trends."
        />
        <Card><CardContent className="py-8 text-center text-muted-foreground">Please log in to view your reports.</CardContent></Card>
        </>
     );
  }


  return (
    <>
      <PageHeader
        title="Reports"
        description="Visualize your spending habits and financial trends."
      />
      {userExpenses.length === 0 && !isLoading ? (
        <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
                No expense data available to generate reports. Start by adding some expenses!
            </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Expenses by Category</CardTitle>
                <CardDescription>Breakdown of your spending across different categories.</CardDescription>
            </CardHeader>
            <CardContent>
                {expensesByCategory.length > 0 ? (
                <ChartContainer config={categoryChartConfig} className="min-h-[300px] w-full">
                <ResponsiveContainer width="100%" height={300}>
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
                    <Pie data={expensesByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                        {expensesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                        ))}
                    </Pie>
                    <Legend />
                    </PieChart>
                </ResponsiveContainer>
                </ChartContainer>
                ) : <p className="text-muted-foreground text-center py-4">Not enough data for category chart.</p>}
            </CardContent>
            </Card>

            <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Monthly Spending Trend</CardTitle>
                <CardDescription>Your total spending over time.</CardDescription>
            </CardHeader>
            <CardContent>
                {monthlyTrend.length > 0 ? (
                <ChartContainer config={monthlyTrendChartConfig} className="min-h-[300px] w-full">
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyTrend}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                    <YAxis 
                        tickLine={false} 
                        axisLine={false} 
                        tickMargin={10} 
                        tickFormatter={(value) => `${selectedCurrency.symbol}${value}`}
                    />
                    <ChartTooltipContent 
                        formatter={(value, name, item) => {
                            const itemPayload = item.payload;
                            if (!itemPayload) return null;
                            const color = itemPayload.fill || itemPayload.color;
                            const label = monthlyTrendChartConfig[name as keyof typeof monthlyTrendChartConfig]?.label || name;
                            return (
                            <div className="flex items-center gap-2 text-sm">
                                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                                <div className="flex-1">
                                <span>{label}: </span>
                                <span className="font-bold">{selectedCurrency.symbol}{Number(value).toFixed(2)}</span>
                                </div>
                            </div>
                            );
                        }}
                    />
                    <Bar dataKey="total" fill="var(--color-total)" radius={4} />
                    <Legend />
                    </BarChart>
                </ResponsiveContainer>
                </ChartContainer>
                ) : <p className="text-muted-foreground text-center py-4">Not enough data for monthly trend chart.</p>}
            </CardContent>
            </Card>
        </div>
      )}
       <Card className="mt-6 shadow-lg">
        <CardHeader>
          <CardTitle>Detailed Expense Log</CardTitle>
          <CardDescription>A sortable and filterable log of all your expenses.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">Full expense log is available on the <a href="/expenses" className="text-primary hover:underline">Expenses page</a>.</p>
        </CardContent>
      </Card>
    </>
  );
}

