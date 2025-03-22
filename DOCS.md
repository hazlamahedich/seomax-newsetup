# SEOMax Content Analysis Documentation

This document provides detailed information about the content analysis features in SEOMax, including content optimization, performance tracking, and gap analysis.

## Table of Contents

1. [Content Analysis Overview](#content-analysis-overview)
2. [Content Optimization](#content-optimization)
3. [Content Performance Tracking](#content-performance-tracking)
4. [Content Gap Analysis](#content-gap-analysis)
5. [Content Brief Generation](#content-brief-generation)
6. [Topic Cluster Management](#topic-cluster-management)
7. [Troubleshooting](#troubleshooting)

## Content Analysis Overview

The SEOMax content analysis system helps users improve their content's SEO performance through multiple integrated tools:

- **Content Optimizer**: Apply suggestions to optimize existing content for better SEO
- **Content Performance**: Track impressions, clicks, and rankings over time
- **Content Gap Analysis**: Compare content against competitors to identify opportunities
- **Content Brief Generator**: Create detailed briefs for new content
- **Topic Cluster Map**: Visualize and manage topic relationships for better content strategy

## Content Optimization

The Content Optimizer analyzes existing content and provides actionable suggestions to improve SEO performance, readability, and semantic relevance.

### Features

- Automated content analysis using AI
- Actionable optimization suggestions
- One-click implementation of suggestions
- Manual content editing capabilities
- Suggestion tracking and history
- Visual indicators for optimization progress

### How to Use

1. Navigate to the Content Dashboard
2. Select a content page to optimize
3. Review the suggestions provided by the system
4. Apply or ignore suggestions as needed
5. Edit content manually if desired
6. Save changes when satisfied

### Technical Implementation

The Content Optimizer uses several services:

- `ContentPageService`: For fetching and updating content
- `ContentAnalysisService`: For analyzing content and generating insights
- `ContentSuggestionService`: For managing and applying suggestions

Suggestions are implemented by applying transformations to the content. The system tracks which suggestions have been implemented, allowing for progress monitoring.

## Content Performance Tracking

The Content Performance component provides analytics on how content performs in search engines over time.

### Features

- Impressions, clicks, and position tracking
- CTR (Click-Through Rate) calculation
- Time-based filtering (7, 14, 30, 90 days)
- Visual charts for performance metrics
- Performance summaries and trend analysis

### How to Use

1. Navigate to the Content Dashboard
2. Select a content page
3. Click "Performance" to view metrics
4. Use the date range selector to adjust the time period
5. Navigate tabs to view different performance aspects

### Technical Implementation

Performance data is tracked through:

- `ContentPerformanceService`: For retrieving performance data
- Integration with search console data (when available)
- Synthetic data generation for testing and preview purposes

Data is visualized using Recharts for accurate and responsive charts.

## Content Gap Analysis

The Content Gap Analysis compares your content against competitors to identify opportunities for improvement.

### Features

- Competitor analysis and comparison
- Content gap identification
- Missing keyword detection
- Suggested improvements based on competition
- Competitor tracking and monitoring

### How to Use

1. Navigate to the Content Dashboard
2. Select a content page
3. Click "Gap Analysis"
4. Add competitor URLs for analysis
5. Review the competitors, content gaps, and missing keywords tabs

### Technical Implementation

Gap analysis uses:

- `ContentAnalyzer.compareWithCompetitors()`: To identify differences between content
- `ContentAnalyzer.performGapAnalysis()`: To find topic and keyword gaps
- `ContentGapAnalysisService`: For managing competitor data and analysis results

## Content Brief Generation

The Content Brief Generator creates comprehensive briefs for new content creation.

### Features

- Keyword-focused brief creation
- Structured content outlines
- Research sources and competitor insights
- SEO recommendations
- Collaboration tools for team feedback

### How to Use

1. Navigate to the Content Dashboard
2. Click "Create Brief"
3. Enter target keyword and content parameters
4. Generate the brief
5. Customize sections and add collaborators
6. Export or share the brief with your team

### Technical Implementation

Brief generation leverages:

- `ContentBriefService`: For creating and managing briefs
- AI-powered outline generation based on keyword research
- Collaboration features for team input

## Topic Cluster Management

The Topic Cluster Map visualizes and manages content relationships for improved SEO strategy.

### Features

- Visual topic mapping
- Subtopic and keyword organization
- Content idea generation
- Relationship management between topics
- Interactive visualization

### How to Use

1. Navigate to the Content Dashboard
2. Select "Topic Clusters"
3. Create a new cluster or select an existing one
4. Add main topics and subtopics
5. Assign keywords to each topic
6. Visualize relationships in the interactive map

### Technical Implementation

The Topic Cluster feature uses:

- Canvas-based visualization
- `TopicClusterService`: For managing cluster data
- Interactive UI for relationship management

## Troubleshooting

### Hydration Errors
React hydration errors can occur when the server-rendered HTML doesn't match what the client tries to render. Common causes include:

- Browser extensions modifying the DOM (like Grammarly)
- Server/client conditional code that renders differently
- Date/time formatting differences
- Random values that change on each render

#### Resolution:
1. We've added `suppressHydrationWarning` to both the `html` and `body` elements in `RootLayout` to prevent errors from browser extensions.
2. Default themes are set with a consistent "system" theme to avoid dark/light mode mismatches.

### Session Fetch Errors
"Unexpected end of JSON input" errors can occur when fetching session data, especially during initial load.

#### Resolution:
1. We've configured SessionProvider with a fallback session object:
   ```typescript
   <SessionProvider 
     refetchInterval={0}
     refetchOnWindowFocus={false}
     session={{
       expires: new Date(Date.now() + 2 * 86400).toISOString(),
       user: { id: "", name: null, email: null, image: null }
     }}
   >
   ```

2. Added timeout handling for fetch operations in Supabase client.

### Supabase Connection Issues

#### Resolution:
1. Updated the Supabase client to provide better error handling and fallbacks when environment variables are missing.
2. Added proper export of `createClient` to ensure compatibility across the application.
3. Implemented timeout handling for fetch operations to prevent hanging requests. 