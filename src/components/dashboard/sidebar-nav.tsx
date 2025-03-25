'use client';

import { HTMLAttributes } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Search,
  FileText,
  BarChart,
  Settings,
  Globe,
  Trophy,
  Users,
  Code,
  Bookmark,
  Lightbulb,
  MapPin,
  PenTool,
  TrendingUp,
  ShieldCheck,
  MessageSquare
} from "lucide-react";

interface SidebarNavProps extends HTMLAttributes<HTMLElement> {
  items?: NavItem[];
}

export interface NavItem {
  title: string;
  href: string;
  icon?: React.ReactNode;
  exact?: boolean;
}

export function SidebarNav({ className, ...props }: SidebarNavProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  
  const isAdmin = session?.user?.email?.endsWith("@seomax.com");

  const standardNavItems: NavItem[] = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className="mr-2 h-4 w-4" />,
      exact: true,
    },
    {
      title: "Projects",
      href: "/dashboard/projects",
      icon: <Bookmark className="mr-2 h-4 w-4" />,
    },
    {
      title: "Keyword Research",
      href: "/dashboard/keywords",
      icon: <Search className="mr-2 h-4 w-4" />,
    },
    {
      title: "Content Analyzer",
      href: "/dashboard/content",
      icon: <FileText className="mr-2 h-4 w-4" />,
    },
    {
      title: "Content Rewriter",
      href: "/dashboard/content-rewriter",
      icon: <PenTool className="mr-2 h-4 w-4" />,
    },
    {
      title: "Technical SEO",
      href: "/dashboard/technical",
      icon: <Code className="mr-2 h-4 w-4" />,
    },
    {
      title: "Multi-location SEO",
      href: "/dashboard/multi-location",
      icon: <MapPin className="mr-2 h-4 w-4" />,
    },
    {
      title: "SEO ROI Forecasting",
      href: "/dashboard/seo-forecasting",
      icon: <TrendingUp className="mr-2 h-4 w-4" />,
    },
    {
      title: "Analytics",
      href: "/dashboard/analytics",
      icon: <BarChart className="mr-2 h-4 w-4" />,
    },
    {
      title: "Competitive Analysis",
      href: "/dashboard/competitive",
      icon: <Trophy className="mr-2 h-4 w-4" />,
    },
    {
      title: "Backlinks",
      href: "/dashboard/backlinks",
      icon: <Globe className="mr-2 h-4 w-4" />,
    },
    {
      title: "Settings",
      href: "/dashboard/settings",
      icon: <Settings className="mr-2 h-4 w-4" />,
    },
  ];

  const adminOnlyNavItems: NavItem[] = [
    {
      title: "Users",
      href: "/dashboard/admin/users",
      icon: <Users className="mr-2 h-4 w-4" />,
    },
    {
      title: "LLM Settings",
      href: "/dashboard/admin/llm",
      icon: <MessageSquare className="mr-2 h-4 w-4" />,
    },
    {
      title: "AI Playground",
      href: "/dashboard/admin/ai-playground",
      icon: <Lightbulb className="mr-2 h-4 w-4" />,
    },
  ];

  const navItems = isAdmin
    ? [...standardNavItems, ...adminOnlyNavItems]
    : standardNavItems;

  return (
    <nav className={cn("flex flex-col space-y-2", className)} {...props}>
      {navItems.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center rounded-md px-3 py-2 text-sm font-medium",
              isActive
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted hover:text-primary"
            )}
          >
            {item.icon}
            <span>{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
} 