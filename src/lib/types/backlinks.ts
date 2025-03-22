export interface Backlink {
  id: string;
  project_id: string;
  source_url: string;
  target_url: string;
  anchor_text?: string;
  link_type: 'external' | 'internal' | 'nofollow';
  page_authority?: number;
  domain_authority?: number;
  first_discovered: string;
  last_checked: string;
  status: 'active' | 'broken' | 'removed';
}

export interface BacklinkAnalysis {
  id: string;
  project_id: string;
  total_backlinks: number;
  unique_domains: number;
  average_domain_authority?: number;
  backlinks_by_type: {
    external: number;
    internal: number;
    nofollow: number;
  };
  top_anchor_texts: Record<string, number>;
  analyzed_at: string;
}

export interface BacklinkReport {
  id: string;
  project_id: string;
  report_name: string;
  report_data: {
    analysis: BacklinkAnalysis;
    backlinks: Backlink[];
    generated_at: string;
    summary: {
      quality_score: number;
      growth_rate: string;
      most_valuable_backlink: Backlink | null;
    };
  };
  created_by: string;
  schedule?: 'daily' | 'weekly' | 'monthly' | 'once';
  next_run?: string;
  created_at: string;
}

export interface CompetitorBacklink {
  id: string;
  project_id: string;
  competitor_url: string;
  source_url: string;
  anchor_text?: string;
  page_authority?: number;
  domain_authority?: number;
  discovered_at: string;
}

export interface BacklinkGapAnalysis {
  competitorUrl: string;
  totalGap: number;
  topOpportunities: CompetitorBacklink[];
  analysisDate: string;
}

export interface AddBacklinkFormData {
  sourceUrl: string;
  targetUrl: string;
  anchorText?: string;
  linkType: 'external' | 'internal' | 'nofollow';
}

export interface CreateReportFormData {
  reportName: string;
  schedule?: 'daily' | 'weekly' | 'monthly' | 'once';
}

export interface BacklinkChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string[];
    borderColor: string[];
    borderWidth: number;
  }[];
} 