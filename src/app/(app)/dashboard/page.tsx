"use client";

import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, AlertTriangle, ReceiptText, ListPlus, FilePlus2 } from "lucide-react";
import Image from "next/image";

// Sample data for charts - replace with actual data fetching and chart components
const sampleSpendingData = [
  { name: 'Groceries', value: 400, fill: "hsl(var(--chart-1))" },
  { name: 'Utilities', value: 150, fill: "hsl(var(--chart-2))" },
  { name: 'Transport', value: 100, fill: "hsl(var(--chart-3))" },
  { name: 'Entertainment', value: 200, fill: "hsl(var(--chart-4))" },
  { name: 'Other', value: 50, fill: "hsl(var(--chart-5))" },
];

export default function DashboardPage() {
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
            <div className="text-2xl font-bold">$1,234.56</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Bills</CardTitle>
            <ReceiptText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">$250.00 due this week</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spending Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1 Active</div>
            <p className="text-xs text-muted-foreground">Close to budget limit for "Dining Out"</p>
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
            <CardTitle>Spending Summary</CardTitle>
            <CardDescription>Your expenses by category this month.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Placeholder for a simple chart representation */}
            <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed bg-muted/50">
               <Image src="https://placehold.co/300x200.png" alt="Spending chart placeholder" width={300} height={200} data-ai-hint="chart graph" />
            </div>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Detailed charts available in <Link href="/reports" className="text-primary hover:underline">Reports</Link>.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
