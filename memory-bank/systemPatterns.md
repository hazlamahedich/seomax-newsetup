# System Patterns

## Architecture Overview

SEOMax follows a modern web application architecture with the following key components:

- **Frontend Framework**: Next.js 15+ with App Router for server and client components
- **UI Framework**: React with Tailwind CSS and shadcn/ui for consistent design
- **State Management**: 
  - Server state managed with React Query (TanStack Query)
  - UI state managed with Zustand
- **Authentication**: Next-Auth with Supabase as credential provider
- **Database**: Supabase PostgreSQL with Row-Level Security
- **AI Services**: LangChain for structured AI interactions
- **API Layer**: Server Components and API Routes for data fetching
- **LLM Management**: Dedicated admin interface for model configuration and usage tracking

## Component Structure

SEOMax organizes components hierarchically:

```
/components
  /ui             - Reusable UI components from shadcn
  /dashboard      - Dashboard-specific components
  /content        - Content analysis components
  /keywords       - Keyword research components
  /topics         - Topic cluster components
  /projects       - Project management components
  /auth           - Authentication components
  /layout         - Layout components (navigation, header, footer)
  /providers      - Provider components for auth, theme, etc.
```

### Key Components

1. **Content Analysis Components**:
   - `ContentOptimizer` - Suggests improvements for content SEO
   - `ContentPerformance` - Tracks and visualizes content metrics
   - `ContentGapAnalysis` - Identifies missing keywords compared to competitors
   - `ContentBrief` - Generates structured content briefs
   - `TopicClusterMap` - Visualizes topic relationships

2. **Dashboard Components**:
   - `SidebarNav` - Responsive sidebar navigation with mobile support
   - `UserNav` - User profile and authentication information
   - `ThemeToggle` - Theme switching functionality
   - `DashboardLayout` - Main layout container with responsive design

3. **Project Management Components**:
   - `ProjectsPage` - Main page component for projects listing
   - `ProjectForm` - Reusable form component for creating/editing projects
   - `ProjectCard` - Component displaying project information in a card layout

4. **LLM Management Components**:
   - `LLMManagementPage` - Tab-based interface for model management and usage tracking
   - Model configuration form with provider selection
   - Usage statistics visualization with charts
   - Model testing interface with prompt input and response display

5. **Service Layer Components**:
   - Content services for data operations
   - AI analysis services for intelligent processing
   - Authentication services
   - Project service for project CRUD operations
   - LLM model and usage repositories for AI configuration

## Data Flow Patterns

1. **Content Analysis Flow**:
   - Content is processed through multiple stages:
   - Readability analysis → Keyword usage → Structure analysis → Competitor comparison → Suggestion generation

2. **Server/Client Pattern**:
   - Server components fetch data and pass to client components
   - Client components handle interactivity and state updates
   - React Server Components optimize initial page load
   - Client components handle interactive elements

3. **Project Management Flow**:
   - Projects are fetched using React Query hooks
   - UI state for dialogs managed by local React state
   - CRUD operations use React Query mutations
   - Success/error states flow through React Query's state management
   - Zustand project store keeps a global list of projects

4. **LLM Management Flow**:
   - Models and usage statistics fetched on component mount
   - Tab-based interface for different management aspects
   - Form dialog for adding/editing models
   - Direct database queries as fallback when RPC calls fail
   - Model testing via dedicated API endpoint
   - Usage visualization with charts for cost and token metrics

5. **Error Handling Pattern**:
   - All data fetching wrapped in try/catch blocks
   - Error boundaries at component level
   - User-facing error messages with actionable guidance
   - Error reporting to logging service
   - Loading/Error/Empty states pattern for asynchronous data

6. **Authentication Flow**:
   - Authentication requests handled by NextAuth
   - Session state managed by SessionProvider
   - Protected routes enforced by middleware
   - Graceful error handling for auth API requests
   - Fallback mechanisms for session errors

## State Management

1. **Server State**:
   - React Query (TanStack Query) for caching and revalidation
   - QueryClientProvider at application root level
   - Custom hooks wrapping React Query functionality
   - Configured with defaults:
     - `refetchOnWindowFocus: false` to prevent excessive refetching
     - `retry: 1` for single retry on failure
     - `staleTime: 60 * 1000` for 1-minute cache freshness

2. **UI State**:
   - Zustand for simple, atomic state updates
   - Clear state slices for different features
   - Persisted state for user preferences
   - Project store with proper TypeScript interfaces

3. **React Query + Zustand Integration**:
   - React Query handles server state (data fetching, mutations)
   - Zustand manages UI state and cached data
   - Custom hooks (like `useProjects`) combine both patterns
   - React Query updates trigger Zustand store updates
   - Explicit TypeScript interfaces for type safety
   - Clean separation of concerns:
     - React Query: data fetching, loading states, errors
     - Zustand: local UI state, cross-component shared state

## Component Patterns

1. **Projects Page Pattern**:
   - Main container with grid layout for responsive design
   - Card components for individual project display
   - Dialog components for CRUD operations
   - Skeleton UI for loading states
   - Error component with retry functionality
   - Empty state component with call-to-action
   - Animation with Framer Motion for enhanced UX
   - Consistent spacing and typography using Tailwind classes

2. **Form Pattern**:
   - Reusable form component for create/edit operations
   - Controlled inputs with React state
   - Form validation with required fields
   - Loading indicator during submission
   - Dialog component for modal presentation
   - Consistent layout and spacing

3. **Dialog Pattern**:
   - Dialog components for user interactions
   - AlertDialog for confirmations
   - Consistent header, content, footer structure
   - Descriptive titles and instructions
   - Clear action buttons with proper variant styling

4. **Tab-based Interface Pattern**:
   - Used for organizing related content in a single view
   - Tab list at the top with clear labels
   - Content sections associated with each tab
   - Active tab visually distinguished
   - Accessible tab navigation
   - Content switching without page reload
   - Used in LLM management for Models, Usage, and Test views

## Authentication Pattern

1. **Auth Flow**:
   - NextAuth session provider with error handling
   - Enhanced middleware for protected routes
   - Session timeout handling
   - Automatic redirect to login
   - Integration with Supabase auth
   - Unified auth hook for consistent authentication
   - Fallback mechanisms for session errors

2. **Auth API Pattern**:
   - Error interception at fetch level
   - Empty session fallback for failed requests
   - Session validation to prevent invalid states
   - Extended auth provider for additional features

## Dashboard Layout Pattern

1. **Responsive Design**:
   - Mobile-first approach with progressive enhancement
   - Mobile sidebar with toggle functionality and overlay
   - Desktop layout with fixed sidebar
   - Proper breakpoints for different device sizes

2. **Component Organization**:
   - Main layout structure in dashboard layout component
   - Sidebar navigation as separate component
   - Header with user profile and theme toggle
   - Content area with maximum width constraint
   - Card-based design for dashboard metrics

## Service Layer Pattern

1. **AI Services**:
   - Class-based approach with instance methods
   - Separation of prompt engineering from implementation
   - Type-safe interfaces for all AI responses
   - ContentAnalyzer and KeywordAnalyzer as core services
   - LiteLLMProvider as a singleton for model access
   - Repository pattern for data access (LLMModelRepository, LLMUsageRepository)

2. **Data Services**:
   - CRUD operations wrapped in service classes
   - Error handling and data transformation
   - Caching strategies for performance
   - ProjectService with standard create/read/update/delete methods
   - Model mapping for transforming database records to application models

## LLM Management Pattern

1. **Model Configuration**:
   - CRUD operations for LLM models
   - Provider selection with presets for common options
   - Form dialog for creating/editing models
   - Configuration options for temperature, max tokens, etc.
   - API key management with environment variable fallback
   - Default model designation

2. **Usage Tracking**:
   - Automatic tracking of token usage and costs
   - Visualization with charts for daily usage
   - Model breakdown for comparing usage between models
   - Date range selection for filtering data
   - Cost calculation based on token usage and rates

3. **Model Testing**:
   - Testing interface with prompt input
   - Model selection from available configurations
   - API endpoint for sending prompts to models
   - Response display with proper formatting
   - Loading state during model invocation
   - Error handling for failed requests

4. **Database Structure**:
   - `llm_models` table for model configurations
   - `llm_usage` table for token usage tracking
   - Foreign key relationships for user attribution
   - Indexes for efficient queries
   - RLS policies for security
   - Combined with direct queries as fallback

5. **LLM Provider Design**:
   - Singleton pattern for global instance access
   - Repository pattern for data operations
   - Adapter pattern for different model providers
   - Factory-like methods for model instantiation
   - Tracking decorators for usage monitoring
   - Fallback mechanisms for error resilience

## Testing Pattern

1. **Component Testing**:
   - React Testing Library for component behavior
   - Mock services for API dependencies
   - User event simulation for interaction testing

## Known Issues and Mitigation Strategies

1. **Hydration Issues**:
   - `suppressHydrationWarning` on html/body elements for browser extensions
   - Consistent initial state between server and client
   - Careful handling of date/time and random values

2. **API Error Handling**:
   - Timeout handling for external services
   - Graceful degradation with fallback UI
   - Detailed error messages for debugging

3. **Session Management**:
   - Fallback session objects to prevent rendering errors
   - Clear timeout configuration
   - Request interception for handling malformed responses
   - Session provider with robust error handling

4. **State Management Integration**:
   - Proper initialization of React Query client
   - Preventing circular dependencies between stores
   - Clear patterns for updating both Zustand and React Query state
   - TypeScript interfaces for type safety across state management
   - Default empty arrays in destructuring to prevent null/undefined errors

5. **Form Context Issues**:
   - Using appropriate shadcn/ui components within Form context
   - Replacing FormLabel with Label when outside Form context
   - Proper context hierarchy for dependent components
   - Consistent use of form libraries (react-hook-form)
   - Isolation of form logic within dedicated components

## SEO Audit System Architecture

The SEO Audit feature follows a comprehensive architecture pattern to analyze websites, generate scores, and create professional reports.

### Core Components

1. **Analyzer Module**
   - `SiteCrawlerService`: Handles website crawling and data collection
   - `TechnicalSEOService`: Performs technical SEO analysis and issue detection
   - `ContentAnalysisService`: Analyzes content quality and relevance
   - `BacklinkAnalysisService`: Evaluates backlink profiles and quality
   - `SocialMediaAnalysisService`: Detects and verifies social media presence

2. **Scoring System**
   - Uses weighted scoring algorithms for different SEO aspects
   - Calculates category-specific scores and overall grades
   - Implements A+ to F grade scale with visual indicators
   - Supports customizable weights for different SEO factors

3. **Reporting System**
   - `PDFGenerationService`: Creates professional PDF reports
   - `ReportTemplateService`: Manages report templates and customization
   - Report components with data visualization for scores and issues
   - White-labeling capabilities for agency/client use cases

### Architectural Patterns

1. **Service-Based Approach**
   - Specialized services for different analysis types
   - Clear separation of concerns between crawling, analysis, and reporting
   - Modular design allowing for independent feature enhancement

2. **State Management**
   - Zustand store for SEO audit state
   - Clear separation between UI state and analysis data
   - Optimistic updates for better user experience
   - Proper loading, error, and success states

3. **Database Structure**
   - Normalized tables for audit reports, categories, scores, issues, and recommendations
   - Efficient query patterns for retrieving complex audit data
   - Proper indexing for performance optimization
   - Structured JSON fields for flexible data storage

4. **Integration Pattern**
   - LLM service integration for AI-powered analysis
   - Puppeteer integration for JavaScript rendering
   - Open APIs for backlink and social media data
   - Service adapters for third-party integrations

### Data Flow

1. **Audit Initiation**
   - User submits URL for analysis
   - System creates audit record with pending status
   - Crawl job is queued for processing

2. **Data Collection**
   - Site crawler extracts URLs, HTML, and metadata
   - Pages are analyzed for content, structure, and technical issues
   - External data is gathered (backlinks, social profiles, etc.)

3. **Analysis Processing**
   - Raw data is processed by specialized analyzers
   - Issues are detected and categorized by severity
   - Category scores are calculated based on findings
   - Recommendations are generated using the LLM service

4. **Report Generation**
   - Analysis results are compiled into a structured report
   - Scores and metrics are visualized with charts
   - PDF is generated with proper formatting and branding
   - Report is stored for future reference

### UI Components

1. **Dashboard Components**
   - `SEOAuditDashboard`: Main dashboard with overview metrics
   - `AuditReportList`: List of audit reports with filtering
   - `AuditReportCard`: Card view for individual reports
   - `StartAuditDialog`: Dialog for initiating new audits

2. **Report Components**
   - `AuditReportDetail`: Detailed view of audit results
   - `CategoryScoresChart`: Visualization of category scores
   - `TechnicalIssuesBreakdown`: Breakdown of technical issues
   - `RecommendationList`: Prioritized recommendations
   - `ScoreGaugeChart`: Visual indicator for overall score

3. **PDF Components**
   - `SEOAuditPdfButton`: Trigger for PDF generation
   - `PDFCustomizationDialog`: Options for PDF customization
   - `WhiteLabelSettings`: Configuration for white-labeling

### Implementation Approach

The SEO Audit system follows a phased implementation approach:

1. **Core Framework** (Complete)
   - Basic site crawler with HTML parsing
   - Technical issue detection
   - Category scoring system
   - PDF report generation

2. **Enhanced Analysis** (Planned)
   - JavaScript rendering with Puppeteer
   - Schema markup validation
   - Mobile-friendliness testing
   - Content analysis with LLM integration
   - Duplicate content detection

3. **Extended Features** (Planned)
   - Backlink analysis
   - Social media integration
   - Local SEO assessment
   - Competitor analysis and benchmarking

4. **Advanced Reporting** (Planned)
   - Customizable report templates
   - White-labeling capabilities
   - Interactive web reports
   - Advanced data visualizations

This architecture allows for progressive enhancement of the SEO Audit feature while maintaining a stable foundation for existing functionality. New analyzers and report elements can be added without disrupting the core system, and the LLM integration provides AI-powered enhancements for various analysis components. 