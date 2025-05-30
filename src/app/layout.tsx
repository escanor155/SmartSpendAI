
import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import {ThemeProvider} from '@/components/providers/theme-provider';
import {Toaster} from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/auth-context'; // Import AuthProvider
import { CurrencyProvider } from "@/contexts/currency-context"; // CurrencyProvider needs to be inside AuthProvider or vice-versa. Let's keep AuthProvider outer.

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'SmartSpend AI CoPilot',
  description: 'Manage your finances intelligently.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider> {/* Wrap with AuthProvider */}
            <CurrencyProvider> {/* CurrencyProvider can be inside AuthProvider */}
              {children}
              <Toaster />
            </CurrencyProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
