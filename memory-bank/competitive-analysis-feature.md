# Competitive Analysis Feature Documentation

## Overview
The Competitive Analysis feature provides a comprehensive system for analyzing and comparing content against competitors. It identifies content gaps, keyword opportunities, competitive advantages, and disadvantages, and generates strategic recommendations for content improvement.

## Core Components

### Services

1. **CompetitorAnalysisService**
   - Core service that handles all competitive analysis operations
   - Methods:
     - `getCompetitors(projectId)`: Retrieves all competitors for a project
     - `addCompetitor(projectId, url)`: Adds a new competitor for analysis
     - `runCompetitiveAnalysis(projectId, contentUrl)`: Performs comprehensive analysis
   - Private analysis methods:
     - `_analyzeCompetitors()`: Main analysis orchestration
     - `_identifyContentGaps()`: Finds content topics covered by competitors but missing from user content
     - `_identifyKeywordGaps()`: Identifies keywords used by competitors but missing in user content
     - `_identifyCompetitiveEdge()`: Determines competitive advantages and disadvantages
     - `_generateStrategies()`: Creates strategic recommendations based on analysis
     - `_storeAnalysisResults()`: Saves analysis results to the database

2. **ScraperService**
   - Handles content extraction from competitor URLs
   - Extracts text, HTML, headings, images, and metadata
   - Implements proper rate limiting and user agent identification

3. **WebsiteMetricsService**
   - Retrieves performance metrics for websites
   - Collects domain-level SEO metrics
   - Provides both page-level and domain-level metrics

### UI Components

1. **ContentGapAnalysis**
   - Main UI component for competitive analysis
   - Features:
     - Add competitor URL form
     - Tabbed interface for viewing different analysis aspects
     - Competitor listing with metrics visualization
     - Content gaps display with relevance indicators
     - Missing keywords analysis with volume and difficulty metrics
     - Competitive advantages and disadvantages visualizations
     - Strategic recommendations organized by timeframe and priority

### API Endpoints

The competitive analysis feature exposes REST API endpoints:

1. **GET /api/competitive-analysis**
   - Retrieves all competitors for a specified project
   - Query parameters: `projectId`
   - Returns a list of competitor data

2. **POST /api/competitive-analysis**
   - Performs one of two actions based on the request body:
     - Add a new competitor (`action: 'add'`)
     - Run a competitive analysis (`action: 'analyze'`)
   - Required parameters: `projectId`, `url`, `action`
   - Returns the created competitor or analysis results

3. **DELETE /api/competitive-analysis**
   - Removes a competitor from the database
   - Query parameters: `id`
   - Returns success confirmation

## Data Models

### CompetitorData
```typescript
interface CompetitorData {
  id?: string;
  projectId: string;
  url: string;
  title: string;
  contentLength?: number;
  metrics?: {
    wordCount: number;
    readabilityScore: number;
    keywordDensity: number;
    headingCount: number;
    imageCount: number;
    linkCount: number;
    paragraphCount: number;
  };
  domainMetrics?: {
    domainAuthority: number;
    organicTraffic: number;
    organicKeywords: number;
    backlinks: number;
    uniqueDomains: number;
    topKeywords: { keyword: string; position: number; volume: number }[];
  };
  strengths?: string[];
  weaknesses?: string[];
  keywords?: CompetitorKeyword[];
  content?: string;
  htmlContent?: string;
}
```

### ContentGap
```typescript
interface ContentGap {
  topic: string;
  description: string;
  relevance: string; // 'high', 'medium', 'low'
  suggestedImplementation: string;
  competitorsCovering: number;
}
```

### CompetitorKeyword
```typescript
interface CompetitorKeyword {
  keyword: string;
  volume: number;
  difficulty: number;
  density: number;
  inTitle: boolean;
  inHeadings: boolean;
}
```

### CompetitiveAdvantage
```typescript
interface CompetitiveAdvantage {
  area: string;
  description: string;
  isAdvantage: boolean;
  competitorComparison?: Record<string, string>;
}
```

### CompetitiveStrategy
```typescript
interface CompetitiveStrategy {
  title: string;
  description: string;
  implementation: string;
  priority: string; // 'high', 'medium', 'low'
  timeFrame: string; // 'quick', 'medium', 'long-term'
}
```

## Database Structure

The competitive analysis feature uses the following Supabase database tables:

1. **competitors**
   - Stores competitor information and basic metrics
   - Fields: id, project_id, url, title, content_length, metrics, domain_metrics, strengths, weaknesses, keywords, content, html_content
   - Relationships: belongs to a project, has many content gaps, advantages, and strategies

2. **content_gaps**
   - Stores identified content gaps
   - Fields: id, competitor_id, project_id, content_id, topic, description, relevance, suggested_implementation, competitors_covering

3. **competitive_advantages**
   - Stores competitive advantages and disadvantages
   - Fields: id, project_id, content_id, area, description, is_advantage, competitor_comparison

4. **competitive_strategies**
   - Stores strategic recommendations
   - Fields: id, project_id, content_id, title, description, implementation, priority, time_frame

## User Flow

1. User navigates to content analysis page for a specific content
2. User selects the "Competitors" tab
3. User adds competitor URLs for analysis
4. System scrapes and analyzes each competitor
5. System runs comparative analysis between content and competitors
6. System presents analysis results in tabbed interface:
   - Competitors tab: Lists all competitors with basic metrics
   - Advantages tab: Shows competitive advantages and disadvantages
   - Content Gaps tab: Identifies missing content topics
   - Missing Keywords tab: Shows keywords used by competitors but not in user's content
   - Strategies tab: Provides actionable recommendations organized by timeframe

## Implementation Details

### Scraping Process
1. Fetch HTML content with proper user agent
2. Extract main content using Readability
3. Parse HTML to extract metadata, headings, and images
4. Store text and HTML for further analysis

### Analysis Process
1. Compare content structure between user content and competitors
2. Identify topics covered by competitors but missing from user content
3. Extract keywords used by competitors and compare with user content
4. Compare metrics (word count, readability, keyword density, etc.)
5. Identify strengths and weaknesses based on metric comparisons
6. Generate strategic recommendations with priority levels
7. Store all analysis results in the database

### UI Implementation
1. Tabbed interface for organized presentation of analysis results
2. Card-based design for competitor listings and analysis results
3. Progress indicators to show relative metrics
4. Color-coded badges for priority and relevance indicators
5. Responsive design for all screen sizes
6. Loading states with skeleton UI for asynchronous operations

## Future Enhancements

1. **Advanced Content Gap Analysis**
   - Implement NLP-based topic modeling for more accurate content gap identification
   - Add semantic analysis for better understanding of competitor content topics

2. **Enhanced Keyword Analysis**
   - Integrate with keyword research API for more accurate volume and difficulty data
   - Add SERP position tracking for keywords

3. **Improved Recommendation Engine**
   - Use LLM to generate more specific and contextual recommendations
   - Add impact estimation for each recommendation

4. **Expanded Competitor Metrics**
   - Add more technical SEO metrics for comparison
   - Include backlink analysis in competitive comparison
   - Add social media presence comparison 