// Type definitions for SEO analysis features

// Site Crawler Types
export interface SiteCrawlOptions {
  maxPages?: number;
  maxDepth?: number;
  respectRobotsTxt?: boolean;
  ignoreQueryParams?: boolean;
  followExternalLinks?: boolean;
  delayBetweenRequests?: number;
  userAgent?: string;
}

export interface SiteCrawl {
  id: string;
  projectId: string;
  startTime: Date;
  endTime?: Date;
  pagesCrawled: number;
  status: 'in_progress' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

export interface CrawledPage {
  id: string;
  siteCrawlId: string;
  url: string;
  title?: string;
  metaDescription?: string;
  h1?: string;
  statusCode?: number;
  contentType?: string;
  wordCount?: number;
  depth: number;
  crawlDate: Date;
  htmlContent?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Technical SEO Issue Types
export interface TechnicalIssue {
  id: string;
  site_crawl_id: string;
  page_url: string;
  issue_type: string;
  issue_severity: 'high' | 'medium' | 'low';
  issue_description: string;
  detected_at: string;
  fixed_status?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Page Performance Types
export interface PagePerformance {
  id: string;
  crawledPageId: string;
  mobileScore?: number;
  desktopScore?: number;
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
  loadTime?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Site Structure Types
export interface SiteStructure {
  id: string;
  siteCrawlId: string;
  sourcePageId: string;
  targetPageId: string;
  linkText?: string;
  linkType: 'internal' | 'external' | 'resource';
  isFollowed: boolean;
  createdAt: Date;
}

// SEO Analysis Result Types
export interface OnPageSEOAnalysis {
  title: {
    value: string;
    length: number;
    score: number;
    recommendations?: string[];
  };
  metaDescription: {
    value: string;
    length: number;
    score: number;
    recommendations?: string[];
  };
  headings: {
    h1Count: number;
    h2Count: number;
    h3Count: number;
    hasProperStructure: boolean;
    score: number;
    recommendations?: string[];
  };
  content: {
    wordCount: number;
    paragraphCount: number;
    score: number;
    recommendations?: string[];
  };
  keywords: {
    mainKeyword?: string;
    density?: number;
    inTitle: boolean;
    inDescription: boolean;
    inHeadings: boolean;
    score: number;
    recommendations?: string[];
  };
  images: {
    count: number;
    withAlt: number;
    withoutAlt: number;
    score: number;
    recommendations?: string[];
  };
  links: {
    internal: number;
    external: number;
    broken: number;
    score: number;
    recommendations?: string[];
  };
  totalScore: number;
}

export interface MobileFriendlinessAnalysis {
  viewport: {
    hasViewport: boolean;
    isConfigured: boolean;
    score: number;
  };
  touchElements: {
    properSizing: boolean;
    properSpacing: boolean;
    score: number;
  };
  fontSizes: {
    readable: boolean;
    score: number;
  };
  contentWidth: {
    requiresHorizontalScrolling: boolean;
    score: number;
  };
  tapTargets: {
    properSized: boolean;
    score: number;
  };
  overallScore: number;
  recommendations: string[];
  screenshot?: string;
}

// Site Architecture Types
export interface SiteArchitecture {
  nodes: Array<{
    id: string;
    url: string;
    title?: string;
    depth: number;
    type: 'page' | 'external' | 'resource';
  }>;
  links: Array<{
    source: string;
    target: string;
    value: number;
    text?: string;
  }>;
}

// Technical Audit Types
export interface TechnicalSEOAudit {
  siteCrawlId: string;
  projectId: string;
  crawledPages: number;
  brokenLinks: number;
  redirectChains: number;
  missingTitles: number;
  duplicateTitles: number;
  missingMetaDescriptions: number;
  duplicateMetaDescriptions: number;
  missingH1s: number;
  duplicateH1s: number;
  lowContentPages: number;
  canonicalizationIssues: number;
  mobileUsabilityIssues: number;
  issues: TechnicalIssue[];
  completedAt: Date;
}

// Schema Validation Types
export interface SchemaValidationResult {
  pageId: string;
  url: string;
  hasSchema: boolean;
  schemaTypes: string[];
  validationErrors: string[];
  missingRequiredProperties: Record<string, string[]>;
  isValid: boolean;
}

// Sitemap and Robots.txt Validation Types
export interface SitemapValidationResult {
  url: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  urls?: number;
  lastModified?: string;
  changeFrequency?: string;
}

export interface RobotsValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  hasDisallows: boolean;
  hasSitemapReference: boolean;
  content?: string;
} 