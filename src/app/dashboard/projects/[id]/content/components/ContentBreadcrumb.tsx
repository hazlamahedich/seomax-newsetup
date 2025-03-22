'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, HomeIcon } from 'lucide-react';

interface ContentBreadcrumbProps {
  projectId: string;
  projectName: string;
}

export default function ContentBreadcrumb({ projectId, projectName }: ContentBreadcrumbProps) {
  const pathname = usePathname();
  
  // Extract content ID from path if present
  const pathParts = pathname.split('/');
  const contentId = pathParts.length > 5 && pathParts[5] !== 'topics' && 
    pathParts[5] !== 'briefs' && pathParts[5] !== 'competitors' && 
    pathParts[5] !== 'add' ? pathParts[5] : null;
    
  const isAnalysisPage = pathParts.includes('analysis');
  
  return (
    <nav className="flex items-center text-sm text-muted-foreground">
      <Link href="/dashboard" className="hover:text-foreground flex items-center">
        <HomeIcon className="h-4 w-4 mr-1" />
        Dashboard
      </Link>
      <ChevronRight className="h-4 w-4 mx-1" />
      <Link 
        href={`/dashboard/projects/${projectId}`} 
        className="hover:text-foreground max-w-[150px] truncate"
      >
        {projectName}
      </Link>
      <ChevronRight className="h-4 w-4 mx-1" />
      <Link 
        href={`/dashboard/projects/${projectId}/content`}
        className="hover:text-foreground"
      >
        Content
      </Link>
      {contentId && (
        <>
          <ChevronRight className="h-4 w-4 mx-1" />
          <Link 
            href={`/dashboard/projects/${projectId}/content/${contentId}`}
            className={isAnalysisPage ? 'hover:text-foreground' : 'text-foreground font-medium'}
          >
            Page
          </Link>
        </>
      )}
      {isAnalysisPage && (
        <>
          <ChevronRight className="h-4 w-4 mx-1" />
          <span className="text-foreground font-medium">
            Analysis
          </span>
        </>
      )}
    </nav>
  );
} 