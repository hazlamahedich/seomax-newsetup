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
  ShieldCheck,
  Folder,
  Activity,
  BrainCircuit
} from 'lucide-react';
import { useSession } from 'next-auth/react';

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  items?: {
    href: string;
    title: string;
    icon?: React.ReactNode;
    exact?: boolean;
  }[];
}

// Define the type for navigation items
interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  exact?: boolean;
}

export function SidebarNav({ className, items, ...props }: SidebarNavProps) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  
  // Check if user has admin privileges
  const isAdmin = session?.user?.email?.endsWith('@seomax.com') || false;
  
  // Define standard navigation items
  const navItems: NavItem[] = [
    {
      title: 'Overview',
      href: '/dashboard',
      icon: <LayoutDashboard className="mr-2 h-5 w-5" />,
      exact: true,
    },
    {
      title: 'Projects',
      href: '/dashboard/projects',
      icon: <Folder className="mr-2 h-5 w-5" />,
    },
    {
      title: 'Analytics',
      href: '/dashboard/analytics',
      icon: <BarChart className="mr-2 h-5 w-5" />,
    },
    {
      title: 'Content',
      href: '/dashboard/content',
      icon: <FileText className="mr-2 h-5 w-5" />,
    },
    {
      title: 'SEO Audit',
      href: '/dashboard/audit',
      icon: <Search className="mr-2 h-5 w-5" />,
    },
    {
      title: 'Websites',
      href: '/dashboard/websites',
      icon: <Globe className="mr-2 h-5 w-5" />,
    },
    {
      title: 'Activity',
      href: '/dashboard/activity',
      icon: <Activity className="mr-2 h-5 w-5" />,
    },
    {
      title: 'Settings',
      href: '/dashboard/settings',
      icon: <Settings className="mr-2 h-5 w-5" />,
    },
  ];
  
  // Admin-only navigation items
  const adminNavItems: NavItem[] = [
    {
      title: 'Admin Dashboard',
      href: '/dashboard/admin',
      icon: <ShieldCheck className="mr-2 h-5 w-5" />,
    },
    {
      title: 'Feedback Management',
      href: '/dashboard/admin/feedback',
      icon: <MessageSquare className="mr-2 h-5 w-5" />,
    },
    {
      title: 'LLM Management',
      href: '/dashboard/admin/llm',
      icon: <BrainCircuit className="mr-2 h-5 w-5" />,
    }
  ];
  
  // Combined navigation items
  const allNavItems = isAdmin 
    ? [...navItems, ...adminNavItems]
    : navItems;

  // If not authenticated, don't show navigation
  if (status !== 'authenticated') {
    return null;
  }
  
  // Check if a path is active (either exact match or starts with the path for nested routes)
  const isPathActive = (itemPath: string, exact?: boolean) => {
    if (exact) {
      return pathname === itemPath;
    }
    return pathname === itemPath || pathname?.startsWith(`${itemPath}/`);
  };

  return (
    <nav
      className={cn(
        "flex flex-col space-y-2",
        className
      )}
      {...props}
    >
      {allNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center px-3 py-2 text-sm rounded-md transition-colors",
            isPathActive(item.href, item.exact)
              ? "bg-primary text-primary-foreground font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-accent",
          )}
        >
          {item.icon}
          <span>{item.title}</span>
        </Link>
      ))}
    </nav>
  );
} 