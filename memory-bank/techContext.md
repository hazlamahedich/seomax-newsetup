# Technical Context: SEOMax Development

## Technologies Used

### Framework & Frontend
- **Next.js 14+**: Using App Router for improved rendering and routing
- **React**: UI library for component-based architecture
- **TypeScript**: For type-safe code and improved developer experience
- **Tailwind CSS**: For utility-first styling
- **shadcn/ui**: Component library built on Radix UI with Tailwind styling
- **Framer Motion**: For animations and transitions
- **React Hook Form**: Form handling and validation
- **Zod**: Schema validation for forms and API data

### State Management
- **Zustand**: Lightweight state management
- **React Query**: For server state management and data fetching
- **Context API**: For specific shared state (auth, themes)

### Backend & Data
- **Supabase**: Backend-as-a-service platform
  - **Authentication**: Email/password login
  - **PostgreSQL Database**: For data storage
  - **Row Level Security**: For data protection
- **Server Components**: For data-fetching and rendering
- **Server Actions**: For form submissions and mutations
- **Service Classes**: For encapsulated data operations

### Data Visualization
- **Chart.js**: For creating interactive charts and graphs
- **react-chartjs-2**: React wrapper for Chart.js

### AI Integration
- **LangChain.js**: Framework for LLM application development (planned)
- **LangGraph.js**: For multi-step AI workflows (planned)
- **Anthropic's Claude API**: For content analysis (planned)

## Development Setup

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

### Local Development
- Node.js 18+ recommended
- npm or yarn for package management
- VS Code with extensions:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - TypeScript Hero

## Technical Constraints

### Supabase Integration
- Authentication tied to Supabase Auth
- Database operations via Supabase client
- Row Level Security for multi-tenant isolation

### Next.js Limitations
- Mixing client and server components requires careful organization
- Some third-party libraries need adaptation for React Server Components

### Performance Considerations
- Heavy visualizations and animations only for key user interactions
- Server components for initial rendering when possible
- Strategic use of client components for interactivity

## Dependencies

### Core Dependencies
- next
- react
- react-dom
- typescript
- tailwindcss
- postcss
- autoprefixer
- @radix-ui/* (various UI primitives)
- class-variance-authority
- clsx
- lucide-react (icons)

### State Management
- zustand
- @tanstack/react-query

### Form Handling
- react-hook-form
- @hookform/resolvers
- zod

### Data Fetching
- @supabase/auth-helpers-nextjs
- @supabase/supabase-js

### Backlink Analysis
- chart.js
- react-chartjs-2
- date-fns (for date formatting in reports)
- react-datepicker (for scheduling reports)

### Animation
- framer-motion

### Future Additions
- langchain
- ai (Vercel AI SDK)
- zod-to-json-schema (for API schema definition) 