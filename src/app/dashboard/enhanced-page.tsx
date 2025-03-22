'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import { Settings, Plus, Search, Activity, Lightbulb, Loader2 } from 'lucide-react';
import { useOnboarding } from '@/lib/hooks/useOnboarding';
import { OnboardingTour } from '@/components/ui/onboarding-tour';
import { InteractiveDashboard, DashboardPanel } from '@/components/ui/interactive-dashboard';
import { AnimatedCard, AnimatedMetricCard } from '@/components/ui/animated-card';
import { AnimatedChart, AnimatedProgressBar } from '@/components/ui/animated-chart';
import { NLQInterface } from '@/components/ui/nlq-interface';
import { fadeIn, staggerContainer } from '@/lib/motion';

// Create a Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface Project {
  id: string;
  website_name: string;
  website_url: string;
  created_at: string;
}

export default function EnhancedDashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDashboardEditable, setIsDashboardEditable] = useState(false);
  const { isOpen, setIsOpen, startFlow, completeFlow, skipFlow } = useOnboarding();
  
  // Sample data
  const [seoScore, setSeoScore] = useState(78);
  const [keywordRankings, setKeywordRankings] = useState([
    { keyword: 'digital marketing', position: 12, change: 3 },
    { keyword: 'seo services', position: 8, change: -1 },
    { keyword: 'content strategy', position: 15, change: 5 },
    { keyword: 'local seo', position: 6, change: 2 },
  ]);
  
  const trafficData = [
    { name: 'Jan', Organic: 400, Direct: 240, Referral: 140 },
    { name: 'Feb', Organic: 300, Direct: 220, Referral: 160 },
    { name: 'Mar', Organic: 520, Direct: 280, Referral: 170 },
    { name: 'Apr', Organic: 580, Direct: 250, Referral: 190 },
    { name: 'May', Organic: 600, Direct: 300, Referral: 220 },
    { name: 'Jun', Organic: 750, Direct: 320, Referral: 230 },
  ];
  
  const technicalIssues = [
    { issue: 'Slow page load speed', severity: 'high', pages: 3 },
    { issue: 'Missing meta descriptions', severity: 'medium', pages: 8 },
    { issue: 'Broken links', severity: 'medium', pages: 4 },
    { issue: 'Missing alt tags', severity: 'low', pages: 12 },
  ];
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchProjects();
    }
  }, [user, authLoading, router]);
  
  // Start onboarding tour if it's a new user
  useEffect(() => {
    if (user && projects.length === 0 && !loading) {
      // Delay to ensure DOM elements are rendered
      const timer = setTimeout(() => {
        startFlow('dashboard');
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [user, projects, loading]);
  
  const fetchProjects = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id);
        
      if (error) {
        console.error('Error fetching projects:', error);
      } else {
        setProjects(data || []);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  // Handle NLQ submission
  const handleNLQSubmit = async (query: string): Promise<string> => {
    // In a real implementation, this would call an API endpoint
    // For now, return a mock response
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (query.toLowerCase().includes('keyword')) {
      return "Based on my analysis, the best keywords for your site include 'seo optimization', 'website ranking', and 'search engine visibility'. These have good search volume and relatively low competition.";
    } else if (query.toLowerCase().includes('speed')) {
      return "Your page load speed can be improved by optimizing images, enabling browser caching, and minifying CSS and JavaScript files. Currently, your homepage takes 3.2 seconds to load.";
    } else if (query.toLowerCase().includes('backlink')) {
      return "You should target quality backlinks from industry publications, local business directories, and partner websites. Focus on earning links from domains with high authority.";
    } else {
      return "I've analyzed your question. To improve your SEO, focus on creating quality content, optimizing your page titles and meta descriptions, and building relevant backlinks.";
    }
  };

  // Dashboard items configuration
  const dashboardItems = [
    {
      id: 'seo-score',
      title: 'SEO Health',
      size: 'medium' as const,
      content: (
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-3xl font-bold">{seoScore}/100</span>
            <div className="bg-primary/10 p-2 rounded-full">
              <Activity className="h-5 w-5 text-primary" />
            </div>
          </div>
          <AnimatedProgressBar 
            value={seoScore} 
            label="Overall Score" 
            size="large"
          />
          <div className="grid grid-cols-2 gap-4 mt-2">
            <AnimatedProgressBar value={85} label="On-Page" />
            <AnimatedProgressBar value={62} label="Off-Page" />
            <AnimatedProgressBar value={91} label="Technical" />
            <AnimatedProgressBar value={74} label="Content" />
          </div>
        </div>
      )
    },
    {
      id: 'traffic-overview',
      title: 'Traffic Overview',
      size: 'large' as const,
      content: (
        <AnimatedChart
          data={trafficData}
          type="area"
          height={220}
          dataKeys={[
            { key: 'Organic', color: '#0ea5e9' },
            { key: 'Direct', color: '#8b5cf6' },
            { key: 'Referral', color: '#10b981' },
          ]}
        />
      )
    },
    {
      id: 'keyword-rankings',
      title: 'Keyword Rankings',
      size: 'medium' as const,
      content: (
        <div className="space-y-3">
          {keywordRankings.map((item, index) => (
            <motion.div 
              key={item.keyword}
              className="flex justify-between items-center border-b pb-2 last:border-0"
              variants={fadeIn('up', index * 0.1)}
              initial="hidden"
              animate="show"
            >
              <span className="font-medium truncate pr-2">{item.keyword}</span>
              <div className="flex items-center">
                <span className="bg-muted px-2 py-1 rounded text-sm mr-2">
                  #{item.position}
                </span>
                <span className={
                  item.change > 0 ? "text-green-500" : 
                  item.change < 0 ? "text-red-500" : 
                  "text-muted-foreground"
                }>
                  {item.change > 0 ? `↑${item.change}` : 
                   item.change < 0 ? `↓${Math.abs(item.change)}` : 
                   '—'}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )
    },
    {
      id: 'quick-metrics',
      title: 'Quick Metrics',
      size: 'small' as const,
      content: (
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">Indexed Pages</span>
            <span className="text-xl font-bold">34</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">Backlinks</span>
            <span className="text-xl font-bold">126</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">Page Speed</span>
            <span className="text-xl font-bold">83%</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">Mobile Score</span>
            <span className="text-xl font-bold">91%</span>
          </div>
        </div>
      )
    },
    {
      id: 'technical-issues',
      title: 'Technical Issues',
      size: 'medium' as const,
      content: (
        <div className="space-y-3">
          {technicalIssues.map((issue, index) => (
            <motion.div 
              key={issue.issue}
              className="flex items-center border-b pb-2 last:border-0"
              variants={fadeIn('up', index * 0.1)}
              initial="hidden"
              animate="show"
            >
              <div className={`w-2 h-2 rounded-full mr-3 ${
                issue.severity === 'high' ? 'bg-red-500' :
                issue.severity === 'medium' ? 'bg-amber-500' :
                'bg-blue-500'
              }`} />
              <div className="flex-1">
                <div className="font-medium text-sm">{issue.issue}</div>
                <div className="text-xs text-muted-foreground">
                  Affects {issue.pages} pages
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-8 px-2">
                Fix
              </Button>
            </motion.div>
          ))}
        </div>
      )
    },
    {
      id: 'seo-assistant',
      title: 'SEO Assistant',
      size: 'large' as const,
      content: (
        <div className="flex flex-col space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <span className="font-medium">Ask SEO Questions</span>
          </div>
          <NLQInterface onSubmit={handleNLQSubmit} />
        </div>
      )
    }
  ];

  // Onboarding tour steps
  const onboardingSteps = [
    {
      target: "#seo-score",
      title: "SEO Health Score",
      content: "This is your overall SEO health score. It shows how well your website is optimized for search engines.",
      placement: "right" as const
    },
    {
      target: "#traffic-overview",
      title: "Traffic Overview",
      content: "Here you can see your website's traffic trends over time, segmented by source.",
      placement: "bottom" as const
    },
    {
      target: "#keyword-rankings",
      title: "Keyword Rankings",
      content: "Track your most important keywords and their positions in search results.",
      placement: "left" as const
    },
    {
      target: "#seo-assistant",
      title: "SEO Assistant",
      content: "Have questions about SEO? Ask our AI-powered assistant for recommendations.",
      placement: "top" as const
    },
    {
      target: ".dashboard-edit-button",
      title: "Customize Your Dashboard",
      content: "You can customize your dashboard by rearranging cards to focus on what matters most to you.",
      placement: "bottom" as const
    }
  ];

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b sticky top-0 z-10 backdrop-blur-md bg-background/80">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/dashboard" className="font-bold text-2xl">
            SEOMax
          </Link>
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={() => setIsDashboardEditable(!isDashboardEditable)} className="dashboard-edit-button">
              {isDashboardEditable ? 'Save Layout' : 'Edit Dashboard'} 
            </Button>
            <Button variant="ghost" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container py-10">
        <motion.div 
          className="flex justify-between items-center mb-8"
          variants={fadeIn('up', 0)}
          initial="hidden"
          animate="show"
        >
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button asChild>
            <Link href="/dashboard/new-project">
              <Plus className="h-4 w-4 mr-2" />
              Add Website
            </Link>
          </Button>
        </motion.div>
        
        {projects.length === 0 ? (
          <motion.div 
            className="text-center py-16 border rounded-lg bg-background"
            variants={fadeIn('up', 0.2)}
            initial="hidden"
            animate="show"
          >
            <h2 className="text-2xl font-medium mb-2">Welcome to SEOMax!</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              To get started, add your first website and we'll analyze it to provide personalized SEO insights.
            </p>
            <Button asChild size="lg">
              <Link href="/dashboard/new-project">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Website
              </Link>
            </Button>
          </motion.div>
        ) : (
          <>
            {/* Project selector */}
            <motion.div 
              className="mb-8"
              variants={fadeIn('up', 0.1)}
              initial="hidden"
              animate="show"
            >
              <div className="flex gap-4 items-center overflow-x-auto pb-2">
                {projects.map((project, index) => (
                  <motion.div
                    key={project.id}
                    className={`px-4 py-2 rounded-lg cursor-pointer border ${index === 0 ? 'border-primary bg-primary/10' : 'border-border'}`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {project.website_name}
                  </motion.div>
                ))}
              </div>
            </motion.div>
            
            {/* Interactive dashboard */}
            <motion.div
              variants={staggerContainer(0.1, 0.2)}
              initial="hidden"
              animate="show"
              className="mb-8"
            >
              <InteractiveDashboard 
                items={dashboardItems}
                editable={isDashboardEditable}
              />
            </motion.div>
          </>
        )}
      </main>
      
      {/* Onboarding tour */}
      <OnboardingTour 
        steps={onboardingSteps}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        onComplete={() => completeFlow('dashboard')}
        onSkip={() => skipFlow('dashboard')}
      />
    </div>
  );
} 