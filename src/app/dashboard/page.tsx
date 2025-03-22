'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  FileText, 
  Globe, 
  LayoutDashboard, 
  Link2, 
  Plus, 
  Search, 
  Settings, 
  Zap
} from 'lucide-react';

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
  keywords: string[];
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
              {user && (
                <div className="text-sm text-muted-foreground">
                  {user.email}
                </div>
              )}
              <Button variant="ghost" onClick={handleSignOut}>
                Sign out
              </Button>
            </div>
          </div>
        </motion.header>

        <div className="flex flex-1">
          <motion.div 
            className="hidden md:block w-64 border-r p-4 space-y-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="space-y-1">
              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link href="/dashboard">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
              <Button variant="ghost" className="w-full justify-start text-muted-foreground" disabled>
                <Search className="mr-2 h-4 w-4" />
                Keyword Research
              </Button>
              <Button variant="ghost" className="w-full justify-start text-muted-foreground" disabled>
                <FileText className="mr-2 h-4 w-4" />
                Content Analysis
              </Button>
              <Button variant="ghost" className="w-full justify-start text-muted-foreground" disabled>
                <Link2 className="mr-2 h-4 w-4" />
                Backlinks
              </Button>
              <Button variant="ghost" className="w-full justify-start text-muted-foreground" disabled>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </div>
            
            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium mb-2">Your Websites</h3>
              <div className="space-y-1">
                {projects.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No websites yet</p>
                ) : (
                  projects.map((project) => (
                    <Button 
                      key={project.id} 
                      variant="ghost" 
                      className="w-full justify-start text-xs" 
                      asChild
                    >
                      <Link href={`/dashboard/projects/${project.id}`}>
                        <Globe className="mr-2 h-3 w-3" />
                        <span className="truncate">{project.website_name}</span>
                      </Link>
                    </Button>
                  ))
                )}
                <Button variant="ghost" className="w-full justify-start text-xs mt-2" asChild>
                  <Link href="/dashboard/new-project">
                    <Plus className="mr-2 h-3 w-3" />
                    Add Website
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>

          <main className="flex-1 container py-10">
            <motion.div 
              className="flex justify-between items-center mb-8"
              initial="hidden"
              animate="visible"
              variants={fadeIn}
            >
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <div className="flex gap-3">
                <Button asChild>
                  <Link href="/dashboard/new-project">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Website
                  </Link>
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
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                  <Globe className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-medium mb-2">No websites added yet</h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Add your first website to start tracking SEO metrics and get AI-powered recommendations
                </p>
                <Button asChild>
                  <Link href="/dashboard/new-project">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Website
                  </Link>
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
                    <div className="flex items-center space-x-1 mb-3">
                      {seoScore > 60 ? (
                        <span className="text-green-500 text-sm">Good</span>
                      ) : seoScore > 40 ? (
                        <span className="text-amber-500 text-sm">Needs Improvement</span>
                      ) : (
                        <span className="text-red-500 text-sm">Poor</span>
                      )}
                      <span className="text-xs text-muted-foreground">(across all websites)</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${
                          seoScore > 70 ? 'bg-green-500' : 
                          seoScore > 50 ? 'bg-blue-500' : 
                          seoScore > 30 ? 'bg-amber-500' : 
                          'bg-red-500'
                        }`}
                        style={{ width: `${seoScore}%` }}
                      />
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    className="border rounded-lg p-6 bg-background hover:shadow-md transition-shadow"
                    variants={fadeIn}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                  >
                    <div className="text-sm text-muted-foreground mb-2">Organic Traffic</div>
                    <div className="text-3xl font-bold mb-1">{trafficData.organic}</div>
                    <div className="flex items-center space-x-2 mb-3">
                      <span className="text-green-500 text-sm">+12%</span>
                      <span className="text-xs text-muted-foreground">from last month</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                      <span>Organic</span>
                      <span className="w-3 h-3 bg-blue-500 rounded-full ml-2"></span>
                      <span>Direct: {trafficData.direct}</span>
                      <span className="w-3 h-3 bg-purple-500 rounded-full ml-2"></span>
                      <span>Referral: {trafficData.referral}</span>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    className="border rounded-lg p-6 bg-background hover:shadow-md transition-shadow"
                    variants={fadeIn}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                  >
                    <div className="text-sm text-muted-foreground mb-2">Total Websites</div>
                    <div className="text-3xl font-bold mb-1">{projects.length}</div>
                    <div className="flex items-center mb-3">
                      <span className="text-xs text-muted-foreground">
                        {projects.reduce((total, project) => total + (project.keywords?.length || 0), 0)} keywords tracked
                      </span>
                    </div>
                    <Button variant="outline" className="w-full text-sm" size="sm" asChild>
                      <Link href="/dashboard/new-project">
                        <Plus className="mr-1 h-3 w-3" />
                        Add Another Website
                      </Link>
                    </Button>
                  </motion.div>
                </motion.div>

                <motion.div variants={fadeIn} initial="hidden" animate="visible">
                  <Tabs defaultValue="websites" className="mb-8">
                    <TabsList>
                      <TabsTrigger value="websites">Your Websites</TabsTrigger>
                      <TabsTrigger value="keywords">Top Keywords</TabsTrigger>
                      <TabsTrigger value="actions">Recommended Actions</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="websites" className="mt-6">
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {projects.map((project, index) => (
                          <motion.div
                            key={project.id}
                            variants={listItemVariants}
                            custom={index}
                            initial="hidden"
                            animate="visible"
                          >
                            <Card className="overflow-hidden hover:shadow-md transition-shadow">
                              <CardHeader className="p-6 pb-4">
                                <CardTitle className="flex justify-between items-center">
                                  <span className="truncate">{project.website_name}</span>
                                  <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded-full">
                                    {getRandomScore()}/100
                                  </span>
                                </CardTitle>
                                <CardDescription className="truncate">
                                  {project.website_url}
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="p-6 pt-0">
                                <div className="flex items-center text-sm text-muted-foreground mb-4">
                                  <div className="flex items-center">
                                    <span className="w-2.5 h-2.5 bg-primary rounded-full mr-1.5"></span>
                                    <span>{project.keywords?.length || 0} keywords</span>
                                  </div>
                                  <div className="flex items-center ml-4">
                                    <span className="w-2.5 h-2.5 bg-green-500 rounded-full mr-1.5"></span>
                                    <span>{getRandomNumber(3, 12)} in top 10</span>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <Button variant="outline" size="sm" asChild>
                                    <Link href={`/dashboard/projects/${project.id}`}>
                                      <BarChart3 className="mr-2 h-3.5 w-3.5" />
                                      Dashboard
                                    </Link>
                                  </Button>
                                  <Button size="sm" asChild>
                                    <Link href={`/dashboard/projects/${project.id}/keywords`}>
                                      <Search className="mr-2 h-3.5 w-3.5" />
                                      Keywords
                                    </Link>
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                        
                        <motion.div
                          variants={listItemVariants}
                          custom={projects.length}
                          initial="hidden"
                          animate="visible"
                        >
                          <Card className="border-dashed h-full flex items-center justify-center">
                            <Button variant="ghost" asChild>
                              <Link href="/dashboard/new-project" className="flex flex-col items-center py-12">
                                <Plus className="h-8 w-8 mb-3 text-muted-foreground" />
                                <span>Add Website</span>
                              </Link>
                            </Button>
                          </Card>
                        </motion.div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="keywords" className="mt-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Top Keywords Performance</CardTitle>
                          <CardDescription>
                            Current rankings for your most important keywords
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left font-medium py-2">Keyword</th>
                                  <th className="text-center font-medium py-2">Position</th>
                                  <th className="text-center font-medium py-2">Change</th>
                                  <th className="text-right font-medium py-2">Search Volume</th>
                                </tr>
                              </thead>
                              <tbody>
                                {keywordRankings.map((kw, idx) => (
                                  <tr key={idx} className="border-b last:border-0 hover:bg-muted/50">
                                    <td className="py-3">{kw.keyword}</td>
                                    <td className="py-3 text-center">
                                      <span className="inline-block px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                                        {kw.position}
                                      </span>
                                    </td>
                                    <td className="py-3 text-center">
                                      {kw.change > 0 ? (
                                        <span className="text-green-500">↑{kw.change}</span>
                                      ) : kw.change < 0 ? (
                                        <span className="text-red-500">↓{Math.abs(kw.change)}</span>
                                      ) : (
                                        <span className="text-gray-500">-</span>
                                      )}
                                    </td>
                                    <td className="py-3 text-right">{getRandomNumber(500, 5000)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    
                    <TabsContent value="actions" className="mt-6">
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Keyword Research</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                              Discover new keyword opportunities with our AI research tool
                            </p>
                            {projects.length > 0 && (
                              <Button asChild>
                                <Link href={`/dashboard/projects/${projects[0].id}/keywords`}>
                                  <Search className="mr-2 h-4 w-4" />
                                  Research Keywords
                                </Link>
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Content Optimization</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                              Analyze and improve your content for better rankings
                            </p>
                            <Button variant="outline" disabled>
                              <FileText className="mr-2 h-4 w-4" />
                              Coming Soon
                            </Button>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Technical SEO</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                              Fix technical issues that are affecting your rankings
                            </p>
                            <Button variant="outline" disabled>
                              <Zap className="mr-2 h-4 w-4" />
                              Coming Soon
                            </Button>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>
                  </Tabs>
                </motion.div>
              </>
            )}
          </main>
        </div>
      </div>
    </AnimatePresence>
  );
}

// Helper functions for random demo data
function getRandomScore() {
  return Math.floor(Math.random() * 30) + 60;
}

function getRandomNumber(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
} 