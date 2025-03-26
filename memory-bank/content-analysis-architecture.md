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
- **LLM Integration**:
  - Uses LiteLLMProvider for AI model access
  - Handles token calculation errors with fallback approximation
  - Implements robust error handling for model invocation
  - Provides reliable default values when model responses fail

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

### 4. ContentAnalysisPDFService

New service for generating and exporting PDF reports from content analysis results:

- **Purpose**: Create professional, detailed PDF reports from content analysis data
- **Key Features**:
  - Generation of client-side PDFs using jsPDF and html2canvas
  - Server-side PDF generation using Puppeteer for more complex reports
  - Comprehensive report sections for readability, keyword usage, and structure
  - Visual presentation of analysis scores and metrics
  - Actionable recommendations organized by category
  - Professional branding with headers, footers, and styled elements
- **Methods**:
  - `generatePDF`: Client-side PDF generation for immediate download
  - `generatePDFFromReportServerSide`: Server-side generation for complex reports
  - `prepareAnalysisForPDF`: Formats analysis data for PDF generation
- **Components**:
  - `ContentAnalysisPdfButton`: UI component for triggering PDF generation and download
- **Integration Points**:
  - Integrated with ContentAnalyzer UI component
  - Uses data from ContentAnalysisService
  - Stores generated PDFs in Supabase storage

## Key Technical Solutions

### LLM Integration Fixes

The ContentAnalyzer's LLM integration has been strengthened with several improvements:

1. **Error Handling and Resilience**:
   - Added fallback token counting when model token calculation fails
   - Implemented model failover strategies when primary model is unavailable
   - Enhanced logging for model errors with specific error categorization
   - Added default value returns for any type of model failure

2. **Model Provider Management**:
   - LiteLLMProvider now implements singleton pattern to prevent duplicate instances
   - Improved model configuration loading with validation
   - Added proper error handling during model initialization
   - Implemented debug logging for model configuration tracing

3. **Passive Voice Analysis**:
   - Added passive voice percentage analysis to readability schema
   - Updated prompt template to explicitly request passive voice detection
   - Ensured schema and prompts match for consistent analysis
   - Implemented default passive voice percentage when analysis fails

### Prompt Template Chaining Fixes

Addressed several critical issues with prompt templates:

1. **Template Syntax Errors**:
   - Fixed single '}' syntax errors in multiple prompt templates
   - Implemented proper escaping for special characters in templates
   - Added validation for template syntax before usage
   - Created comprehensive debug logging for template compilation

2. **Template Structure**:
   - Ensured input/output schema consistency across all templates
   - Standardized prompt formats for all analysis types
   - Added explicit instructions for handling edge cases
   - Implemented robust parsing for different response formats

3. **Chain Management**:
   - Enhanced chain creation with proper error boundaries
   - Implemented retry logic for chain execution failures
   - Added timeout handling for long-running chain operations
   - Improved chain result validation with schema checking

### Frontend Display Fixes

Resolved data structure mismatches between API and UI:

1. **Data Structure Alignment**:
   - Fixed mismatch between API response structure and frontend expectations
   - Updated ContentAnalyzer component to use correct data paths (analysis.readability instead of analysis.result.readability_analysis)
   - Added proper fallback values for all display fields
   - Implemented comprehensive null/undefined checking

2. **Field Mapping**:
   - Created proper field mapping between database field names and UI display names
   - Updated UI to handle both legacy and new field names (sentence_complexity_score vs sentence_complexity)
   - Added /100 display suffix for score metrics for clarity
   - Implemented "Not analyzed" text for missing data points

3. **UI Enhancements**:
   - Added visual indicators for score quality (color coding)
   - Improved error state handling with informative messages
   - Enhanced loading states with proper spinners and progress indicators
   - Added debug functionality for inspecting data structure issues

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
  - Key fields aligned with frontend expectations
  - Added passive_voice_percentage to readability analysis
  - Schema supports both legacy and new field names for backwards compatibility
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

5. **Error Handling Pattern**:
   - Multi-layered error handling strategy
   - Default value provision for graceful degradation
   - Detailed error logging for troubleshooting
   - User-friendly error messages

## UI Integration

The content analysis system is integrated with the UI through:

- **TabsContainer**: Organizes different analysis types in tabs
- **Analysis Cards**: Display analysis results in structured cards
- **Metric Visualizations**: Show scores and metrics with visual indicators
- **Suggestion Lists**: Present actionable recommendations
- **Historical Tracking**: Display trends and improvements over time

## API Structure and Frontend Mapping

The API returns analysis data in a normalized structure that the frontend components need to correctly map:

```javascript
// API response structure
{
  contentPage: {...},
  analysis: {
    readability: {...},  // Previously accessed as analysis.result.readability_analysis
    keyword: {...},      // Previously accessed as analysis.result.keyword_analysis 
    structure: {...},    // Previously accessed as analysis.result.structure_analysis
    suggestions: {...}
  }
}
```

The UI components have been updated to correctly map these fields, including handling for both new and legacy field names to maintain backward compatibility.

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

## PDF Generation Process

1. **Initialization**:
   - User clicks the "Export PDF" button in the ContentAnalyzer UI
   - ContentAnalysisPdfButton component triggers the PDF generation process

2. **Data Collection**:
   - Current content page and analysis data is extracted
   - Data is validated and prepared for PDF generation
   - Analysis results are organized into appropriate sections

3. **PDF Creation**:
   - jsPDF instance is initialized with A4 page format
   - Document metadata is set (title, author, etc.)
   - Branding elements (header, footer) are added

4. **Content Generation**:
   - Report sections are created sequentially:
     - Title and metadata (URL, date)
     - Overall content score summary
     - Readability analysis with metrics
     - Keyword usage analysis with distribution data
     - Content structure analysis with formatting metrics
     - Recommendations organized by category
   - Multi-page handling with proper pagination

5. **Output**:
   - PDF is converted to data URI or binary format
   - Browser download is triggered for client-side PDFs
   - Server-side PDFs are stored in Supabase storage
   - URL reference is stored in the database

## UI Components

1. **ContentAnalysisPdfButton**:
   - Integrated into ContentAnalyzer interface
   - Handles generation state (idle, loading, success, error)
   - Provides visual feedback during generation process
   - Triggers download when PDF is ready
   - Handles error conditions with appropriate messaging

## Testing

- **Server-side Testing**:
  - `test:content-pdf` script can be used to test PDF generation
  - Command: `npm run test:content-pdf CONTENT_PAGE_ID`
  - Verifies server-side PDF generation and storage

## Troubleshooting and Common Issues

1. **Missing Data in Frontend Display**:
   - Check for data structure mismatches between API and UI
   - Verify field naming consistency (e.g., readability vs readability_analysis)
   - Ensure proper fallback values for null/undefined fields
   - Use the debug button in ContentAnalyzer to inspect data structure

2. **LLM Integration Issues**:
   - Check environment variables for LLM configuration
   - Verify LiteLLMProvider configuration in the logs
   - Look for "Failed to calculate number of tokens" warnings
   - Inspect prompt template errors like "Single '}' in template"

3. **Database Storage Issues**:
   - Check Supabase connection logs
   - Verify schema alignment between application and database
   - Inspect database return values and error messages
   - Test database connection using simple queries

## Future Enhancements

- Customizable PDF templates
- White-label branding options
- Additional visualization charts for metrics
- Comparative analysis between multiple versions
- Scheduled PDF report generation and email delivery
- Enhanced LLM integration with more advanced models
- Improved prompt engineering for better analysis quality
- Real-time analysis updates during content editing
