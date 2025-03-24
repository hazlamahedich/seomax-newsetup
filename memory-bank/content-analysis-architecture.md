# Content Analysis Architecture

## Overview

The content analysis system in SEOMax is designed as a modular, extensible architecture with specialized services that analyze different aspects of web content. This architecture allows for comprehensive content evaluation while maintaining separation of concerns and code maintainability.

## Core Components

### 1. ContentAnalyzerService

The main service responsible for comprehensive content analysis:

- **Purpose**: Central service for analyzing content quality, readability, and SEO optimization
- **Key Features**:
  - Readability analysis using multiple algorithms (Flesch-Kincaid, SMOG, Coleman-Liau)
  - Keyword usage analysis (density, distribution, placement)
  - Content structure analysis (headers, paragraphs, lists)
  - Semantic analysis and topic relevance
  - Content suggestions generation
- **Methods**:
  - `analyzeReadability`: Calculates various readability scores
  - `analyzeKeywordUsage`: Evaluates keyword usage and optimization
  - `analyzeStructure`: Examines document structure and organization
  - `generateSeoSuggestions`: Creates actionable improvement suggestions
  - `storeContentAnalysis`: Persists analysis results to the database
  - `getLatestContentAnalysis`: Retrieves most recent analysis for a page
- **Integration Points**: 
  - Integrated with SEOAnalysisIntegration for full-site analysis
  - Used directly by ContentAnalyzer UI component

### 2. ImageAltTextAnalyzerService

Specialized service focused on image accessibility and SEO:

- **Purpose**: Analyze and optimize image alt text for accessibility and SEO
- **Key Features**:
  - Detection of images without alt text
  - Analysis of alt text quality and descriptiveness
  - Evaluation of keyword usage in alt text
  - Suggestions for improved alt text content
  - Alt text quality scoring
- **Methods**:
  - `analyzeImageAltText`: Performs comprehensive alt text analysis
  - `calculateAltTextQualityScore`: Scores alt text quality based on various factors
  - `generateAltTextSuggestions`: Creates suggestions for improvement
  - `addSuggestedAltText`: Generates alt text suggestions for images missing descriptions
  - `storeImageAltTextAnalysis`: Persists analysis results to database
  - `getLatestImageAltTextAnalysis`: Retrieves most recent analysis
- **Integration Points**:
  - Integrated with ContentAnalyzer through dedicated Images tab
  - Used by SEOAnalysisIntegration for site-wide image analysis

### 3. InternalLinkingAnalyzerService

Service dedicated to analyzing website link structure:

- **Purpose**: Evaluate internal linking structure for SEO optimization
- **Key Features**:
  - Identification of orphaned pages (no incoming links)
  - Detection of broken internal links
  - Analysis of link distribution across site
  - Key pages link analysis
  - Link quality and context evaluation
  - Link distribution scoring
- **Methods**:
  - `analyzeInternalLinking`: Performs comprehensive linking analysis
  - `analyzeKeyPagesLinks`: Evaluates linking to important pages
  - `calculateLinkDistributionScore`: Scores overall link structure
  - `generateLinkingSuggestions`: Creates actionable linking recommendations
  - `storeInternalLinkingAnalysis`: Persists analysis results
  - `getLatestInternalLinkingAnalysis`: Retrieves most recent analysis
- **Integration Points**:
  - Integrated with ContentAnalyzer through dedicated Links tab
  - Used by SEOAnalysisIntegration for site-wide linking analysis

## Data Flow

The content analysis system follows a standard workflow:

1. **Content Extraction**: HTML content is extracted from pages
2. **Preprocessing**: Content is cleaned and prepared for analysis
3. **Analysis Execution**:
   - Readability analysis
   - Keyword analysis
   - Structure analysis
   - Image alt text analysis
   - Internal linking analysis
4. **Score Calculation**: Specialized scoring algorithms for each aspect
5. **Suggestion Generation**: AI-enhanced recommendations for improvement
6. **Results Storage**: Database persistence for historical tracking
7. **UI Presentation**: Results displayed in appropriate UI components

## Database Schema

Content analysis results are stored in dedicated tables:

- `content_analysis`: Stores readability, keyword, and structure analysis
- `image_alt_text_analysis`: Stores image-specific analysis results
- `internal_linking_analysis`: Stores linking structure analysis
- `crawled_pages`: Contains the raw HTML content for analysis

## Common Design Patterns

1. **Service Class Pattern**:
   - All services implemented as classes with static methods
   - Clear separation of concerns with specialized services
   - Well-defined interfaces for analysis results
   - Dedicated storage methods for database persistence

2. **Result Interface Pattern**:
   - Each analysis type has a dedicated result interface:
   - `ContentAnalysisResult`
   - `ImageAltTextAnalysisResult`
   - `InternalLinkingAnalysisResult`
   - Strong typing ensures consistency across the application

3. **Analysis-Suggestion Pattern**:
   - Analysis methods focus on data collection and scoring
   - Separate methods generate actionable suggestions
   - Suggestions linked to specific analysis findings
   - Clear severity levels for prioritization

4. **Database Integration Pattern**:
   - Services handle their own database operations
   - Consistent methods for storing and retrieving analysis
   - Typed database access using Supabase client
   - Efficient querying with proper indexing

## UI Integration

The content analysis system is integrated with the UI through:

- **TabsContainer**: Organizes different analysis types in tabs
- **Analysis Cards**: Display analysis results in structured cards
- **Metric Visualizations**: Show scores and metrics with visual indicators
- **Suggestion Lists**: Present actionable recommendations
- **Historical Tracking**: Display trends and improvements over time

## Extension Points

The architecture is designed for extensibility:

1. **New Analysis Types**: Additional services can be created for new analysis types
2. **Enhanced Algorithms**: Analysis methods can be updated with improved algorithms
3. **AI Integration**: Suggestion generation can leverage different AI models
4. **Additional Metrics**: New scoring dimensions can be added to existing services

## Integration with SEO Analysis

Content analysis is fully integrated with the broader SEO analysis system:

- **SEOAnalysisIntegration**: Orchestrates content analysis as part of full analysis
- **Score Aggregation**: Content scores contribute to overall SEO score
- **Issue Aggregation**: Content issues included in comprehensive issue list
- **PDF Reports**: Content analysis results included in PDF exports
