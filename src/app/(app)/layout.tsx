"use client"; // Required for SidebarProvider and its hooks

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CreditCard,
  BarChart3,
  ShoppingCart,
  Settings,
  BotMessageSquare,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserNav } from "@/components/user-nav";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  matchSegments?: number; // Number of path segments to match for active state
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, matchSegments: 1 },
  { href: "/expenses", label: "Expenses", icon: CreditCard, matchSegments: 1 },
  { href: "/reports", label: "Reports", icon: BarChart3, matchSegments: 1 },
  { href: "/shopping-list", label: "Shopping List", icon: ShoppingCart, matchSegments: 1 },
];

const AppSidebar = () => {
  const pathname = usePathname();
  const { open } = useSidebar();

  const isActive = (href: string, matchSegments?: number) => {
    if (matchSegments) {
      const pathSegments = pathname.split("/").filter(Boolean);
      const hrefSegments = href.split("/").filter(Boolean);
      return hrefSegments.every((segment, i) => pathSegments[i] === segment) && pathSegments.length >= hrefSegments.length;
    }
    return pathname === href;
  };

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left">
      <SidebarHeader className="flex items-center justify-between p-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <BotMessageSquare className="h-7 w-7 text-primary" />
          {open && <span className="text-lg font-semibold">SmartSpend</span>}
        </Link>
        <SidebarTrigger className={cn(open && "md:hidden")} />
      </SidebarHeader>
      <SidebarContent as={ScrollArea} className="flex-1">
        <SidebarMenu className="px-2">
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} legacyBehavior passHref>
                <SidebarMenuButton
                  isActive={isActive(item.href, item.matchSegments)}
                  tooltip={item.label}
                  className="justify-start"
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
         <SidebarMenu>
           <SidebarMenuItem>
            <Link href="/settings" legacyBehavior passHref>
              <SidebarMenuButton 
                isActive={isActive("/settings")}
                tooltip="Settings"
                className="justify-start"
              >
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </SidebarMenuButton>
            </Link>
           </SidebarMenuItem>
         </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur md:px-6">
            <SidebarTrigger className="md:hidden" /> {/* Mobile trigger */}
            <div className="flex-1">
              {/* Page title could go here, dynamically set */}
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <UserNav />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
