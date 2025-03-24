'use client';

import React from 'react';
import { SEOAuditReportList } from './SEOAuditReportList';

interface SEOAuditReportListClientProps {
  projectId: string;
}

export function SEOAuditReportListClient({ projectId }: SEOAuditReportListClientProps) {
  return (
    <SEOAuditReportList projectId={projectId} />
  );
} 