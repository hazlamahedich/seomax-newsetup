'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface ContentTabNavigationProps {
  projectId: string;
}

export default function ContentTabNavigation({ projectId }: ContentTabNavigationProps) {
  const pathname = usePathname();
  
  // Determine which tab is active
  const isContentPagesActive = pathname === `/dashboard/projects/${projectId}/content` || 
    (pathname?.includes(`/dashboard/projects/${projectId}/content/`) && 
    !pathname?.includes('/topics') && 
    !pathname?.includes('/briefs') && 
    !pathname?.includes('/competitors'));
  
  const isTopicsActive = pathname?.includes(`/dashboard/projects/${projectId}/content/topics`);
  const isBriefsActive = pathname?.includes(`/dashboard/projects/${projectId}/content/briefs`);
  const isCompetitorsActive = pathname?.includes(`/dashboard/projects/${projectId}/content/competitors`);

  return (
    <div className="flex space-x-1 border-b pb-2">
      <TabLink
        href={`/dashboard/projects/${projectId}/content`}
        active={isContentPagesActive}
      >
        Content Pages
      </TabLink>
      <TabLink
        href={`/dashboard/projects/${projectId}/content/topics`}
        active={isTopicsActive}
      >
        Topic Clusters
      </TabLink>
      <TabLink
        href={`/dashboard/projects/${projectId}/content/briefs`}
        active={isBriefsActive}
      >
        Content Briefs
      </TabLink>
      <TabLink
        href={`/dashboard/projects/${projectId}/content/competitors`}
        active={isCompetitorsActive}
      >
        Competitor Analysis
      </TabLink>
    </div>
  );
}

interface TabLinkProps {
  href: string;
  active: boolean;
  children: React.ReactNode;
}

function TabLink({ href, active, children }: TabLinkProps) {
  return (
    <Link
      href={href}
      className={`px-3 py-2 text-sm font-medium rounded-t-md hover:bg-muted/50 transition-colors ${
        active ? 'bg-muted text-foreground border-b-2 border-primary' : 'text-muted-foreground'
      }`}
    >
      {children}
    </Link>
  );
} 