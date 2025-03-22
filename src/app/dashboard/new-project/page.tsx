'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@supabase/supabase-js";
import { useAuth } from "@/hooks/useAuth";

// Create a Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function NewProjectPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [websiteName, setWebsiteName] = useState('');
  const [keywordList, setKeywordList] = useState('');
  const [competitors, setCompetitors] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!websiteUrl || !websiteName) {
      setError('Website URL and name are required');
      return;
    }
    
    // Validate URL format
    try {
      new URL(websiteUrl);
    } catch {
      setError('Please enter a valid URL (including http:// or https://)');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Save project to Supabase
      const { data, error: supabaseError } = await supabase
        .from('projects')
        .insert([
          { 
            website_url: websiteUrl, 
            website_name: websiteName,
            keywords: keywordList.split('\n').map(k => k.trim()).filter(k => k),
            competitors: competitors.split('\n').map(c => c.trim()).filter(c => c),
            user_id: user?.id
          }
        ])
        .select();
      
      if (supabaseError) {
        setError(supabaseError.message);
        return;
      }
      
      // Redirect to dashboard
      router.push('/dashboard');
      
    } catch (err) {
      setError('Failed to create project');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/dashboard" className="font-bold text-2xl">
            SEOMax
          </Link>
          <nav className="flex items-center space-x-4">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 container py-10">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Add a New Website</h1>
          
          <div className="bg-background border rounded-lg p-6 shadow-sm">
            {error && (
              <div className="mb-4 p-3 rounded bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="website-name" className="text-sm font-medium">
                  Website Name
                </label>
                <input
                  id="website-name"
                  type="text"
                  placeholder="My Website"
                  value={websiteName}
                  onChange={(e) => setWebsiteName(e.target.value)}
                  required
                  className="w-full p-2 border rounded-md"
                />
                <p className="text-xs text-muted-foreground">
                  A name to identify this website in your dashboard
                </p>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="website-url" className="text-sm font-medium">
                  Website URL
                </label>
                <input
                  id="website-url"
                  type="url"
                  placeholder="https://example.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  required
                  className="w-full p-2 border rounded-md"
                />
                <p className="text-xs text-muted-foreground">
                  Include the full URL with http:// or https://
                </p>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="keywords" className="text-sm font-medium">
                  Target Keywords (Optional)
                </label>
                <textarea
                  id="keywords"
                  placeholder="Enter one keyword per line"
                  value={keywordList}
                  onChange={(e) => setKeywordList(e.target.value)}
                  rows={4}
                  className="w-full p-2 border rounded-md"
                />
                <p className="text-xs text-muted-foreground">
                  Enter each keyword on a new line. We'll track rankings for these keywords.
                </p>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="competitors" className="text-sm font-medium">
                  Competitors (Optional)
                </label>
                <textarea
                  id="competitors"
                  placeholder="Enter one competitor URL per line"
                  value={competitors}
                  onChange={(e) => setCompetitors(e.target.value)}
                  rows={4}
                  className="w-full p-2 border rounded-md"
                />
                <p className="text-xs text-muted-foreground">
                  Enter each competitor URL on a new line. We'll benchmark your site against these.
                </p>
              </div>
              
              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Project'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
} 