'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';

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

export default function DashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageLoaded, setPageLoaded] = useState(false);

  // SEO metrics (sample data)
  const [seoScore, setSeoScore] = useState(78);
  const [keywordRankings, setKeywordRankings] = useState([
    { keyword: 'digital marketing', position: 12, change: 3 },
    { keyword: 'seo services', position: 8, change: -1 },
    { keyword: 'content strategy', position: 15, change: 5 },
    { keyword: 'local seo', position: 6, change: 2 },
  ]);
  const [trafficData, setTrafficData] = useState({ 
    organic: 1245, 
    direct: 876, 
    referral: 432 
  });
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchProjects();
    }
  }, [user, authLoading, router]);
  
  // Set page as loaded after initial data fetch
  useEffect(() => {
    if (!loading) {
      // Small delay to ensure smooth animation sequence
      const timer = setTimeout(() => {
        setPageLoaded(true);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [loading]);
  
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

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4 }
    }
  };
  
  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  // New animation variants for the recommendations
  const listItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: 0.1 * i,
        duration: 0.4
      }
    })
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center"
        >
          <motion.div
            animate={{ 
              rotate: 360,
              transition: { 
                duration: 1.5,
                repeat: Infinity,
                ease: "linear"
              }
            }}
            className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full mb-3"
          />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <div className="flex min-h-screen flex-col">
        <motion.header 
          className="border-b sticky top-0 z-10 backdrop-blur-md bg-background/80"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="container flex h-16 items-center justify-between">
            <Link href="/dashboard" className="font-bold text-2xl">
              SEOMax
            </Link>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={handleSignOut}>
                Sign out
              </Button>
            </div>
          </div>
        </motion.header>

        <main className="flex-1 container py-10">
          <motion.div 
            className="flex justify-between items-center mb-8"
            initial="hidden"
            animate="visible"
            variants={fadeIn}
          >
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <div className="flex gap-3">
              <Button variant="outline" asChild>
                <Link href="/dashboard/about-enhanced">Try Enhanced Dashboard</Link>
              </Button>
              <Button asChild>
                <Link href="/dashboard/new-project">Add Website</Link>
              </Button>
            </div>
          </motion.div>
          
          {projects.length === 0 ? (
            <motion.div 
              className="text-center py-12 border rounded-lg bg-background"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl font-medium mb-2">No websites added yet</h2>
              <p className="text-muted-foreground mb-6">
                Add your first website to start tracking SEO metrics
              </p>
              <Button asChild>
                <Link href="/dashboard/new-project">Add Website</Link>
              </Button>
            </motion.div>
          ) : (
            <>
              <motion.div 
                className="grid gap-6 md:grid-cols-3 mb-10"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                <motion.div 
                  className="border rounded-lg p-6 bg-background hover:shadow-md transition-shadow"
                  variants={fadeIn}
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                >
                  <div className="text-sm text-muted-foreground mb-2">Average SEO Score</div>
                  <div className="text-3xl font-bold mb-1">{seoScore}/100</div>
                  <div className="text-sm">
                    {seoScore > 60 ? (
                      <span className="text-green-500">Good</span>
                    ) : seoScore > 40 ? (
                      <span className="text-amber-500">Needs Improvement</span>
                    ) : (
                      <span className="text-red-500">Poor</span>
                    )}
                  </div>
                </motion.div>
                
                <motion.div 
                  className="border rounded-lg p-6 bg-background hover:shadow-md transition-shadow"
                  variants={fadeIn}
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                >
                  <div className="text-sm text-muted-foreground mb-2">Organic Traffic</div>
                  <div className="text-3xl font-bold mb-1">{trafficData.organic}</div>
                  <div className="text-sm text-green-500">+12% from last month</div>
                </motion.div>
                
                <motion.div 
                  className="border rounded-lg p-6 bg-background hover:shadow-md transition-shadow"
                  variants={fadeIn}
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                >
                  <div className="text-sm text-muted-foreground mb-2">Indexed Pages</div>
                  <div className="text-3xl font-bold mb-1">34</div>
                  <div className="text-sm text-amber-500">2 with issues</div>
                </motion.div>
              </motion.div>
              
              <div className="grid gap-6 md:grid-cols-2 mb-6">
                <motion.div 
                  className="border rounded-lg p-6 bg-background"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <h2 className="text-xl font-semibold mb-4">Your Websites</h2>
                  <div className="space-y-4">
                    {projects.map((project, index) => (
                      <motion.div 
                        key={project.id} 
                        className="border p-4 rounded-md hover:border-primary/50 hover:shadow-sm transition-all"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 * index }}
                        whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                      >
                        <div className="font-medium mb-1">{project.website_name}</div>
                        <div className="text-sm text-muted-foreground mb-2">{project.website_url}</div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/projects/${project.id}`}>View Details</Link>
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
                
                <motion.div 
                  className="border rounded-lg p-6 bg-background"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <h2 className="text-xl font-semibold mb-4">Keyword Rankings</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b text-sm">
                          <th className="text-left py-2">Keyword</th>
                          <th className="text-right py-2">Position</th>
                          <th className="text-right py-2">Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {keywordRankings.map((ranking, index) => (
                          <tr key={index} className="border-b last:border-0">
                            <td className="py-2">{ranking.keyword}</td>
                            <td className="text-right py-2">{ranking.position}</td>
                            <td className="text-right py-2">
                              {ranking.change > 0 ? (
                                <span className="text-green-500">+{ranking.change}</span>
                              ) : ranking.change < 0 ? (
                                <span className="text-red-500">{ranking.change}</span>
                              ) : (
                                <span className="text-gray-500">0</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              </div>
              
              <div className="grid gap-6 md:grid-cols-2 mb-6">
                <motion.div 
                  className="border rounded-lg p-6 bg-background"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: pageLoaded ? 1 : 0, y: pageLoaded ? 0 : 20 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">SEO Modules</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <motion.div 
                      className="border p-4 rounded-md hover:border-primary/50 hover:shadow-sm transition-all"
                      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                    >
                      <div className="font-medium mb-2">Content Optimization</div>
                      <div className="text-sm text-muted-foreground mb-3">
                        Create, analyze, and optimize content with AI-powered suggestions
                      </div>
                      <Button variant="default" size="sm" asChild>
                        <Link href="/dashboard/content">Open Content Module</Link>
                      </Button>
                    </motion.div>
                    
                    <motion.div 
                      className="border p-4 rounded-md hover:border-primary/50 hover:shadow-sm transition-all"
                      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                    >
                      <div className="font-medium mb-2">Technical SEO (Coming Soon)</div>
                      <div className="text-sm text-muted-foreground mb-3">
                        Identify and fix technical issues affecting your site's performance
                      </div>
                      <Button variant="outline" size="sm" disabled>
                        Coming Soon
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
              
                <motion.div 
                  className="border rounded-lg p-6 bg-background"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: pageLoaded ? 1 : 0, y: pageLoaded ? 0 : 20 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                >
                  <h2 className="text-xl font-semibold mb-4">SEO Recommendations</h2>
                  <ul className="space-y-3">
                    {[
                      { icon: "⚠️", color: "text-amber-500", text: "Improve page load speed on your homepage (currently 3.2s)" },
                      { icon: "✓", color: "text-green-500", text: "All pages have proper meta descriptions" },
                      { icon: "❌", color: "text-red-500", text: "Fix 4 broken links on your services page" },
                      { icon: "⚠️", color: "text-amber-500", text: "Add alt text to 12 images" },
                      { icon: "✓", color: "text-green-500", text: "Mobile-friendly design implemented" }
                    ].map((item, i) => (
                      <motion.li 
                        key={i}
                        className="flex items-start gap-2 border-b pb-2 last:border-0"
                        custom={i}
                        initial="hidden"
                        animate={pageLoaded ? "visible" : "hidden"}
                        variants={listItemVariants}
                        whileHover={{ x: 5, transition: { duration: 0.2 } }}
                      >
                        <span className={`${item.color} text-lg`}>{item.icon}</span>
                        <span>{item.text}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              </div>
            </>
          )}
        </main>
      </div>
    </AnimatePresence>
  );
} 