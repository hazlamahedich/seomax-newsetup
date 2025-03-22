import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface BacklinksLayoutProps {
  children: React.ReactNode;
}

export default function BacklinksLayout({ children }: BacklinksLayoutProps) {
  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Breadcrumb navigation */}
      <div className="flex items-center text-sm text-gray-500">
        <Link href="/dashboard" className="hover:text-blue-600">
          Dashboard
        </Link>
        <ChevronRight className="w-4 h-4 mx-1" />
        <span className="font-medium text-gray-900">Backlinks</span>
      </div>
      
      {/* Tab navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8" aria-label="Tabs">
          <Link 
            href="/dashboard/backlinks" 
            className="py-4 px-1 border-b-2 border-blue-500 font-medium text-sm text-blue-600"
          >
            Overview
          </Link>
          <Link 
            href="/dashboard/backlinks/analysis" 
            className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300"
          >
            Analysis
          </Link>
          <Link 
            href="/dashboard/backlinks/competitors" 
            className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300"
          >
            Competitor Gap
          </Link>
          <Link 
            href="/dashboard/backlinks/reports" 
            className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300"
          >
            Reports
          </Link>
        </nav>
      </div>
      
      {/* Content area */}
      <div>
        {children}
      </div>
    </div>
  );
} 