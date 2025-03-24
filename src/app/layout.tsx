import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Providers } from '@/app/providers';
import { FeedbackDialog } from '@/components/ui/feedback-dialog';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SEOMax - AI-Powered SEO Platform',
  description: 'Optimize your website SEO with AI-powered tools and analysis',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body 
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.className
        )}
        suppressHydrationWarning
      >
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            
            {/* Feedback dialog */}
            <FeedbackDialog />
            
            {/* Toast notifications */}
            <Toaster />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
