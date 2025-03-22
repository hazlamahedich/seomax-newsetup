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

3. **Data Layer**:
   - Supabase PostgreSQL for structured data storage
   - Supabase Auth for user authentication
   - Service classes for data operations

4. **AI Integration**:
   - LangChain.js for structured AI workflows (planned)
   - LangGraph.js for complex, multi-step AI processes (planned)
   - Server-side AI processing with client-side results display

5. **Performance Optimization**:
   - Dynamic rendering for data-dependent pages
   - Efficient SQL queries with proper relations
   - Separation of concerns for maintainability

## Key Technical Decisions

1. **App Router & Server Components**:
   - Using Next.js App Router for improved performance and SEO
   - Server components for data fetching and rendering
   - Dynamic exports to ensure latest data is displayed
   - Client components for interactive UI elements

2. **Database Schema Design**:
   - Normalized schema with efficient relationships
   - Content-centric tables structure (pages, analysis, suggestions)
   - Project-based organization of data
   - Implementing row-level security for multi-tenant data

3. **Authentication Flow**:
   - Email/password login via Supabase
   - Session validation on protected routes
   - Redirect to login for unauthenticated users

4. **Content Management Architecture**:
   - Separation of content pages and analysis data
   - Independent competitor content analysis
   - Service classes for data operations
   - Content metrics and visualization components

## Design Patterns in Use

1. **Component Composition**:
   - Building complex UI from smaller, reusable components
   - Tab-based navigation with consistent patterns
   - Card-based content display for consistency

2. **Service Pattern**:
   - Dedicated service classes for data operations
   - Static methods for server component compatibility
   - Proper error handling and logging
   - Centralized data access logic

3. **Page Layout Pattern**:
   - Consistent layout with breadcrumb navigation
   - Tab navigation for section switching
   - Reusable page structures across features

4. **Data Display Patterns**:
   - Card-based item listing
   - Detail views with metrics and visualization
   - Empty state handling with user guidance
   - Loading and error states

5. **Form Handling Pattern**:
   - Server actions for form submission
   - Client-side validation
   - Redirect after successful operations
   - Consistent form layout and button placement

## Component Relationships

1. **Authentication Flow**:
   - AuthProvider → Login/Signup Forms → Project Dashboard

2. **Project Management**:
   - Dashboard → Project List → Project Detail

3. **Content Management Flow**:
   - ContentLayout → TabNavigation → ContentPages/Briefs/Competitors
   - ContentPagesPage → ContentDetail → ContentAnalysis
   - CompetitorAnalysisPage → CompetitorDetail → CompetitorAnalysis

4. **Backlink Analysis Flow**:
   - BacklinksLayout → TabNavigation → Overview/Analysis/Competitors/Reports
   - BacklinksPage → BacklinkMetrics → BacklinkTable
   - BacklinkAnalysisPage → Charts → DetailedBacklinkTable
   - AddBacklinkPage → AddBacklinkForm → BacklinkService

5. **Service Architecture**:
   - ContentPageService → Database Operations → UI Components
   - CompetitorService → Database Operations → UI Components
   - BacklinkService → Database Operations → UI Components
   - Analysis Services → Data Processing → Visualization Components

6. **Navigation Structure**:
   - Breadcrumb → Section Tabs → Content Area
   - Content Listing → Content Detail → Analysis 