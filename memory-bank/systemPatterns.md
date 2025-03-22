# System Patterns: SEOMax Architecture

## System Architecture
SEOMax follows a modern web application architecture with these key components:

1. **Frontend Layer**:
   - Next.js with App Router for server components and API routes
   - React components organized by feature and reusability
   - Tailwind CSS with shadcn/ui for consistent styling
   - Framer Motion for selective animations and transitions

2. **State Management**:
   - Primarily server components with dynamic rendering
   - React server actions for form submissions
   - Local client component state for UI-specific interactions
   - Zustand for global state management across components

3. **Data Layer**:
   - Supabase PostgreSQL for structured data storage
   - Supabase Auth for user authentication
   - Service classes for data operations
   - React Query for efficient data fetching and caching

4. **AI Integration**:
   - LangChain for structured AI workflows and prompt management
   - ChatOpenAI integration for keyword and content analysis
   - Custom prompt templates for specific analysis types
   - Structured output formats for consistent AI responses
   - Error handling for AI service calls

5. **Performance Optimization**:
   - Dynamic rendering for data-dependent pages
   - Efficient SQL queries with proper relations
   - Separation of concerns for maintainability
   - Custom type declarations for third-party libraries

## Key Technical Decisions

1. **App Router & Server Components**:
   - Using Next.js App Router for improved performance and SEO
   - Server components for data fetching and rendering
   - Dynamic exports to ensure latest data is displayed
   - Client components for interactive UI elements

2. **Database Schema Design**:
   - Normalized schema with efficient relationships
   - Project-centric organization with keywords, rankings, and content
   - User-based data segregation
   - Implementing row-level security for multi-tenant data

3. **Authentication Flow**:
   - Email/password login via Supabase
   - Session validation on protected routes
   - Redirect to login for unauthenticated users
   - Custom hook (useAuth) for authentication state

4. **AI Analysis Architecture**:
   - Modular AI services for different analysis types
   - Structured prompt engineering for consistent results
   - JSON parsing of AI responses for structured data
   - Separation of research, analysis, and suggestion generation

## Design Patterns in Use

1. **Component Composition**:
   - Building complex UI from smaller, reusable components
   - Tab-based navigation with consistent patterns
   - Card-based content display for consistency

2. **Service Pattern**:
   - Dedicated service classes for data operations (ProjectService, KeywordService)
   - AI service classes with structured methods (KeywordAnalyzer, ContentAnalyzer)
   - Static methods for server component compatibility
   - Proper error handling and logging
   - Centralized data access logic

3. **Page Layout Pattern**:
   - Consistent layout with navigation links
   - Tab navigation for section switching
   - Project-centric navigation with ID-based routing
   - Conditional rendering based on data state (loading, empty, error)

4. **Data Display Patterns**:
   - Card-based metric display for dashboard
   - Interactive keyword list with selection state
   - Tabbed content display for analysis results
   - Loading and error states with appropriate feedback

5. **Form Handling Pattern**:
   - Controlled components for form inputs
   - Async form submission with loading state
   - Error handling and validation
   - Consistent form layout and button placement

## Component Relationships

1. **Authentication Flow**:
   - AuthProvider → Login/Signup Forms → Dashboard

2. **Project Management Flow**:
   - Dashboard → Project List → Project Detail
   - Project Detail → Project Settings → Edit Project Form
   - New Project Page → Project Form → Project Service

3. **Keyword Research Flow**:
   - Project Detail → Keywords Page → Keyword List
   - Keywords Page → Selected Keyword → Keyword Analysis
   - Keyword Analysis → Research/Competition/Trends Tabs → Analysis Display
   - Add Keyword Form → Keywords Service → Keyword List Update

4. **Content Analysis Flow**:
   - Project Detail → Content Page → Content List
   - Content Page → Content Detail → Content Analysis
   - Content Analysis → Readability/Keywords/Structure Tabs → Suggestions

5. **Service Architecture**:
   - ProjectService → Database Operations → UI Components
   - KeywordService → Database Operations → UI Components
   - KeywordAnalyzer → AI Operations → Analysis Display
   - ContentAnalyzer → AI Operations → Analysis Display

6. **Navigation Structure**:
   - Dashboard → Project List → Project Detail
   - Project Detail → Tab Navigation (Overview, Keywords, Content, Settings)
   - Tab Content → Feature-specific Components 