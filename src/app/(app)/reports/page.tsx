
"use client";

import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import type { Expense } from "@/types";
import { useState, useEffect } from "react";
import { useCurrency } from "@/contexts/currency-context";

// Mock data for expenses - replace with actual data fetching
const mockExpenses: Expense[] = [
  { id: "1", name: "Groceries", price: 75.50, category: "Food", date: "2024-07-12", storeName: "SuperMart" },
  { id: "2", name: "Gasoline", price: 45.00, category: "Transportation", date: "2024-07-10" },
  { id: "3", name: "Netflix Subscription", price: 15.99, category: "Entertainment", date: "2024-07-01" },
  { id: "4", name: "Lunch with friends", price: 30.00, category: "Food", date: "2024-07-05" },
  { id: "5", name: "Electricity Bill", price: 120.00, category: "Utilities", date: "2024-06-28" },
  { id: "6",  name: "New T-shirt", price: 25.00, category: "Shopping", date: "2024-07-14" },
  { id: "7",  name: "Coffee", price: 5.00, category: "Food", date: "2024-07-15" },
];

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
  const monthlyTotals: { [key: string]: number } = {};
  expenses.forEach(expense => {
    const month = new Date(expense.date).toLocaleString('default', { month: 'short' });
    monthlyTotals[month] = (monthlyTotals[month] || 0) + expense.price;
  });
  // Assuming we want a fixed order of months for display or sort them
  return Object.entries(monthlyTotals)
    .map(([name, total]) => ({ name, total }))
    .sort((a,b) => new Date(Date.parse(a.name +" 1, 2000")).getMonth() - new Date(Date.parse(b.name +" 1, 2000")).getMonth()); // Basic month sort
};


export default function ReportsPage() {
  const [expensesByCategory, setExpensesByCategory] = useState<any[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([]);
  const { selectedCurrency } = useCurrency();

  useEffect(() => {
    setExpensesByCategory(processExpensesForCategoryChart(mockExpenses));
    setMonthlyTrend(processExpensesForMonthlyTrend(mockExpenses));
  }, []);
  
  const categoryChartConfig = expensesByCategory.reduce((acc, item, index) => {
    acc[item.name] = { label: item.name, color: chartColors[index % chartColors.length] };
    return acc;
  }, {} as ChartConfig);

  const monthlyTrendChartConfig = {
    total: { label: "Total Spending", color: "hsl(var(--chart-1))" },
  } satisfies ChartConfig;


  return (
    <>
      <PageHeader
        title="Reports"
        description="Visualize your spending habits and financial trends."
      />
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
            <CardDescription>Breakdown of your spending across different categories this month.</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Monthly Spending Trend</CardTitle>
            <CardDescription>Your total spending over the past few months.</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
       <Card className="mt-6 shadow-lg">
        <CardHeader>
          <CardTitle>Detailed Expense Log</CardTitle>
          <CardDescription>A sortable and filterable log of all your expenses.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">Full expense log is available on the <a href="/expenses" className="text-primary hover:underline">Expenses page</a>.</p>
            {/* Placeholder for more advanced table or data grid if needed here */}
        </CardContent>
      </Card>
    </>
  );
}
