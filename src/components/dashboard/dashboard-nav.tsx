import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Search,
  FileText,
  BarChart,
  Settings,
  Globe,
  Trophy,
  Code,
  Bookmark,
  MapPin,
  PenTool,
  TrendingUp
} from "lucide-react";

export function DashboardNav() {
  const pathname = usePathname();

  const navItems = [
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
      title: "Keywords",
      href: "/dashboard/keywords",
      icon: <Search className="mr-2 h-4 w-4" />,
    },
    {
      title: "Content",
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
      title: "SEO Forecasting",
      href: "/dashboard/seo-forecasting",
      icon: <TrendingUp className="mr-2 h-4 w-4" />,
    },
    {
      title: "Analytics",
      href: "/dashboard/analytics",
      icon: <BarChart className="mr-2 h-4 w-4" />,
    },
    {
      title: "Competitive",
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

  return (
    <nav className="grid items-start gap-2">
      {navItems.map((item, index) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname?.startsWith(item.href);

        return (
          <Link
            key={index}
            href={item.href}
            className={cn(
              "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
              isActive ? "bg-accent" : "transparent"
            )}
          >
            <span>{item.icon}</span>
            <span>{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
} 