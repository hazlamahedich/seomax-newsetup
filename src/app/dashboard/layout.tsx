'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { SidebarNav } from '@/components/dashboard/sidebar-nav';
import { UserNav } from '@/components/dashboard/user-nav';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/utils';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Force redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/dashboard');
    }
  }, [status, router]);

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Protect the entire dashboard layout if not authenticated
  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Dashboard header */}
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden mr-2"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
            <a href="/dashboard" className="flex items-center space-x-2">
              <span className="font-bold text-xl">SEOMax</span>
            </a>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <UserNav user={session?.user} />
          </div>
        </div>
      </header>
      
      {/* Main dashboard content */}
      <div className="flex-1 flex">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Sidebar */}
        <aside 
          className={cn(
            "fixed inset-y-0 left-0 top-16 z-40 w-64 border-r bg-background transform transition-transform duration-200 ease-in-out",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
            "md:relative md:translate-x-0 md:w-64 shrink-0"
          )}
        >
          <div className="p-4">
            <SidebarNav className="py-2" />
          </div>
        </aside>
        
        {/* Main content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 