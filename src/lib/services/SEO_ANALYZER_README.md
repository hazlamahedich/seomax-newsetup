# SEO Analyzer Implementation Documentation

## Overview

This module implements a comprehensive SEO analyzer that fulfills all the requirements specified in the project brief. It combines multiple services to provide a complete SEO analysis solution:

1. **Website Crawling**: Uses Crawlee with Puppeteer integration for JavaScript-rendered content
2. **HTML Parsing**: Extracts and parses HTML using Cheerio
3. **On-page Analysis**: Analyzes title tags, meta descriptions, headings
4. **Keyword Usage**: Identifies keyword usage and distribution
5. **Technical Checks**: Verifies SSL, robots.txt, sitemaps
6. **Page Speed**: Evaluates page speed using Lighthouse API

## Key Services

### CrawleeService
- Implements website crawling using Crawlee with Puppeteer integration
- Handles JavaScript rendering for SPA and dynamic websites
- Manages crawl depth, rate limiting, and robots.txt compliance

### LighthouseService
- Integrates with Google's Lighthouse API for performance analysis
- Captures Core Web Vitals metrics
- Provides accessibility, best practices, and SEO scores

### TechnicalSEOService
- Analyzes technical SEO aspects (SSL, robots.txt, canonicals)
- Identifies mobile compatibility issues
- Evaluates HTTP status codes and redirect chains

### SEOAnalysisIntegration
- Central service that orchestrates the entire analysis process
- Combines all services into a single comprehensive analysis
- Implements scoring algorithms and issue prioritization

## Usage

```typescript
import { SEOAnalysisIntegration } from '@/lib/services/SEOAnalysisIntegration';

// Run a complete SEO analysis
const result = await SEOAnalysisIntegration.analyzeWebsite(
  'project-id',
  'https://example.com',
  {
    maxPages: 50,
    maxDepth: 3,
    followExternalLinks: false,
    respectRobotsTxt: true,
    lighthouseSampleSize: 5
  }
);

// Access the results
console.log(`Overall Score: ${result.scores.overall}`);
console.log(`Performance Grade: ${result.grades.performance}`);
console.log(`Critical Issues: ${result.issues.critical}`);
```

## Database Schema

The analyzer uses the following tables in Supabase:

1. `site_crawls` - Stores crawl sessions
2. `crawled_pages` - Stores individual page data
3. `lighthouse_audits` - Stores Lighthouse performance metrics
4. `seo_analyses` - Stores the complete SEO analysis results
5. `seo_issues` - Stores identified SEO issues

## Dependencies

- `crawlee`: Website crawling with JavaScript rendering
- `puppeteer`: Headless browser for JavaScript rendering
- `cheerio`: HTML parsing
- `lighthouse`: Performance analysis
- `chrome-launcher`: Required for Lighthouse

## Installation

Ensure all dependencies are installed:

```bash
npm install crawlee @crawlee/puppeteer lighthouse chrome-launcher
```

## Implementation Details

### Crawling Process

1. Initialize a crawl session in the database
2. Create a Crawlee PuppeteerCrawler instance
3. Configure crawl parameters (depth, rate limiting, etc.)
4. Execute the crawl and store page data
5. Process the results in the database

### Lighthouse Integration

1. Select a sample of pages for performance analysis
2. Launch Chrome in headless mode
3. Run Lighthouse audits on each page
4. Extract and store performance metrics
5. Calculate performance scores based on Core Web Vitals

### Technical SEO Analysis

1. Check SSL certificate validity
2. Verify robots.txt and sitemap.xml
3. Analyze canonical tags and redirects
4. Evaluate mobile compatibility
5. Check for structured data markup

### Content Analysis

1. Extract content from each page
2. Analyze keyword usage and distribution
3. Check for thin or duplicate content
4. Evaluate content structure (headings, paragraphs)
5. Assess readability and content quality

## Future Enhancements

- **Parallelization**: Improve performance by running analyses in parallel
- **Machine Learning**: Add ML-based content quality assessment
- **Competitor Analysis**: Implement benchmarking against competitors
- **Historical Tracking**: Add trend analysis for SEO metrics over time
- **Advanced Reporting**: Enhance visualization and reporting capabilities 