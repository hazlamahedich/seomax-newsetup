# SEOMax - AI-Powered SEO Platform

SEOMax is a modern web application built to help users optimize their websites for search engines using AI-powered analysis and recommendations.

## Features

- **User Authentication**: Secure signup, login, and account management
- **Project Management**: Create and manage multiple projects for different websites
- **Content Analysis**: Analyze website content for readability, keywords, and structure
- **Content Page Management**: Add and analyze individual pages from your website
- **Competitor Analysis**: Compare your content against competitors
- **Content Optimization**: Get AI-powered suggestions to improve your content
- **Content Briefs**: Create and manage content briefs for new articles

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui component library
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL (via Supabase)
- **State Management**: Server components with dynamic rendering
- **Styling**: Tailwind CSS with custom theming
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 16.8 or later
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/seomax.git
cd seomax
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory with the following variables:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

```
seomax/
├── src/                # Application source code
│   ├── app/            # Next.js app router files
│   │   ├── dashboard/  # Protected dashboard routes
│   │   ├── login/      # Authentication pages
│   │   └── ...         # Other app routes
│   ├── components/     # Reusable UI components
│   │   ├── ui/         # UI component library
│   │   ├── content/    # Content-specific components
│   │   └── ...         # Other component categories
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility functions and libraries
│   │   ├── services/   # Service layer for backend communication
│   │   ├── supabase/   # Supabase client configuration
│   │   └── types/      # TypeScript type definitions
│   └── styles/         # Global styles
├── public/             # Static files
├── .env.local          # Environment variables (create this file)
├── next.config.js      # Next.js configuration
├── package.json        # Project dependencies
├── tailwind.config.js  # Tailwind CSS configuration
└── tsconfig.json       # TypeScript configuration
```

## Database Schema

The application uses Supabase as the database with the following main tables:

- **users** - User account information
- **projects** - Website projects for content optimization
- **content_pages** - Individual pages from websites for analysis
- **content_analysis** - Analysis results for content pages
- **content_suggestions** - Improvement suggestions for content
- **competitor_content** - Competitor content for comparison
- **competitor_analysis** - Analysis of competitor content
- **content_briefs** - Content briefs for creating new content
- **topic_clusters** - Topic clusters for content organization

## Content Management Features

- **Content Page Analysis**: Analyze readability, keyword usage, and structure
- **Competitor Content Analysis**: Compare your content against competitors
- **Content Optimization Suggestions**: Get AI-powered recommendations
- **Content Brief Generator**: Create detailed briefs for new content
- **Topic Clustering**: Organize content by related topics

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.io/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
