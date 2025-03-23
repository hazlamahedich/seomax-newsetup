'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { 
  BarChart, 
  LayoutDashboard, 
  FileText, 
  Search, 
  Settings, 
  Globe,
  MessageSquare, 
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  items?: {
    href: string;
    title: string;
    icon?: React.ReactNode;
  }[];
}

export function SidebarNav({ className, items, ...props }: SidebarNavProps) {
  const pathname = usePathname();
  const { isAdmin } = useAuth();
  
  // Define standard navigation items
  const standardNavItems = [
    {
      title: 'Overview',
      href: '/dashboard',
      icon: <LayoutDashboard className="mr-2 h-4 w-4" />,
    },
    {
      title: 'Analytics',
      href: '/dashboard/analytics',
      icon: <BarChart className="mr-2 h-4 w-4" />,
    },
    {
      title: 'Content',
      href: '/dashboard/content',
      icon: <FileText className="mr-2 h-4 w-4" />,
    },
    {
      title: 'SEO Audit',
      href: '/dashboard/audit',
      icon: <Search className="mr-2 h-4 w-4" />,
    },
    {
      title: 'Websites',
      href: '/dashboard/websites',
      icon: <Globe className="mr-2 h-4 w-4" />,
    },
    {
      title: 'Settings',
      href: '/dashboard/settings',
      icon: <Settings className="mr-2 h-4 w-4" />,
    },
  ];
  
  // Admin-only navigation items
  const adminNavItems = [
    {
      title: 'Admin Dashboard',
      href: '/dashboard/admin',
      icon: <ShieldCheck className="mr-2 h-4 w-4" />,
    },
    {
      title: 'Feedback Management',
      href: '/dashboard/admin/feedback',
      icon: <MessageSquare className="mr-2 h-4 w-4" />,
    }
  ];
  
  // Combine navigation items based on admin status
  const navItems = isAdmin && isAdmin() 
    ? [...standardNavItems, ...adminNavItems]
    : standardNavItems;

  return (
    <nav
      className={cn(
        "flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1",
        className
      )}
      {...props}
    >
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            pathname === item.href
              ? "bg-muted hover:bg-muted"
              : "hover:bg-transparent hover:underline",
            "justify-start"
          )}
        >
          {item.icon}
          {item.title}
        </Link>
      ))}
    </nav>
  );
} 