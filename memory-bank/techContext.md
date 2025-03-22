# Technical Context: SEOMax Development

## Technologies Used

### Framework & Frontend
- **Next.js 15+**: Using App Router for improved rendering and routing
- **React 19**: UI library for component-based architecture
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
- **Recharts**: For creating interactive charts and graphs
- **Card-based metrics**: For displaying key performance indicators

### AI Integration
- **LangChain**: Framework for LLM application development
- **ChatOpenAI**: For interfacing with OpenAI's models
- **Custom Prompt Templates**: For structured AI interactions
- **Structured Output Parsing**: For consistent JSON responses
- **Custom Type Declarations**: For TypeScript compatibility

## Development Setup

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
OPENAI_API_KEY=<your-openai-api-key>
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

### LangChain Limitations
- Need custom type declarations for some LangChain modules
- Some modules like text splitters may not be available in the npm registry
- Potential differences between documentation and actual package exports

### Performance Considerations
- Heavy AI operations performed server-side to avoid client-side latency
- Server components for initial rendering when possible
- Strategic use of client components for interactivity
- AI requests optimized to minimize token usage

## Dependencies

### Core Dependencies
- next: 15.2.3
- react: ^19.0.0
- react-dom: ^19.0.0
- typescript: ^5
- tailwindcss: ^4
- postcss: ^4
- @radix-ui/* (various UI primitives)
- class-variance-authority: ^0.7.1
- clsx: ^2.1.1
- lucide-react: ^0.483.0 (icons)

### State Management
- zustand
- @tanstack/react-query: ^5.69.0

### Form Handling
- react-hook-form: ^7.54.2
- @hookform/resolvers: ^4.1.3
- zod: ^3.24.2

### Data Fetching
- @supabase/supabase-js: ^2.49.1

### AI and Content Analysis
- langchain: ^0.3.19
- jsdom: ^26.0.0
- @mozilla/readability: ^0.6.0

### Animation and UI
- framer-motion: ^12.5.0
- recharts: ^2.12.2
- tailwind-merge: ^3.0.2
- next-themes: ^0.4.6 