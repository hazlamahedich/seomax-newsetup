'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Save, Trash2 } from 'lucide-react';

// Create a Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface Project {
  id: string;
  user_id: string;
  website_name: string;
  website_url: string;
  target_keywords: string[];
  competitors: string[];
  created_at: string;
}

export default function SettingsPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const router = useRouter();
  const projectId = params.id;
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    website_name: '',
    website_url: '',
    target_keywords: '',
    competitors: ''
  });
  
  useEffect(() => {
    if (user) {
      fetchProject();
    }
  }, [user, projectId]);
  
  const fetchProject = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single();
        
      if (error) {
        console.error('Error fetching project:', error);
        router.push('/dashboard');
      } else if (data) {
        setProject(data);
        setFormData({
          website_name: data.website_name,
          website_url: data.website_url,
          target_keywords: data.target_keywords?.join(', ') || '',
          competitors: data.competitors?.join(', ') || ''
        });
      }
    } catch (err) {
      console.error('Error fetching project:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const saveChanges = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      const targetKeywords = formData.target_keywords
        .split(',')
        .map(keyword => keyword.trim())
        .filter(Boolean);
        
      const competitors = formData.competitors
        .split(',')
        .map(competitor => competitor.trim())
        .filter(Boolean);
      
      const { error } = await supabase
        .from('projects')
        .update({
          website_name: formData.website_name,
          website_url: formData.website_url,
          target_keywords: targetKeywords,
          competitors: competitors
        })
        .eq('id', projectId)
        .eq('user_id', user.id);
        
      if (error) {
        console.error('Error updating project:', error);
        setError('Failed to update project settings');
      } else {
        setSuccess('Project settings updated successfully');
        fetchProject(); // Refresh project data
      }
    } catch (err) {
      console.error('Error updating project:', err);
      setError('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };
  
  const deleteProject = async () => {
    if (!user || !confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;
    
    try {
      setDeleting(true);
      setError('');
      
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', user.id);
        
      if (error) {
        console.error('Error deleting project:', error);
        setError('Failed to delete project');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Error deleting project:', err);
      setError('An unexpected error occurred');
    } finally {
      setDeleting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Project Settings</h1>
        <p className="text-muted-foreground">
          Manage your website settings and preferences
        </p>
      </div>
      
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="danger">Danger Zone</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Website Information</CardTitle>
              <CardDescription>
                Basic details about your website project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="website_name">Website Name</Label>
                <Input
                  id="website_name"
                  name="website_name"
                  value={formData.website_name}
                  onChange={handleInputChange}
                  placeholder="My Awesome Website"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="website_url">Website URL</Label>
                <Input
                  id="website_url"
                  name="website_url"
                  value={formData.website_url}
                  onChange={handleInputChange}
                  placeholder="https://example.com"
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>SEO Targeting</CardTitle>
              <CardDescription>
                Define your target keywords and competitors
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="target_keywords">Target Keywords</Label>
                <Textarea
                  id="target_keywords"
                  name="target_keywords"
                  value={formData.target_keywords}
                  onChange={handleInputChange}
                  placeholder="seo, digital marketing, web design"
                  className="min-h-[100px]"
                />
                <p className="text-sm text-muted-foreground">
                  Enter keywords separated by commas
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="competitors">Competitors</Label>
                <Textarea
                  id="competitors"
                  name="competitors"
                  value={formData.competitors}
                  onChange={handleInputChange}
                  placeholder="competitor1.com, competitor2.com"
                  className="min-h-[100px]"
                />
                <p className="text-sm text-muted-foreground">
                  Enter competitor websites separated by commas
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <div>
                {error && (
                  <Alert variant="destructive" className="max-w-md">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                {success && (
                  <div className="text-sm text-green-500">{success}</div>
                )}
              </div>
              
              <Button onClick={saveChanges} disabled={saving}>
                {saving ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>
                Configure advanced options for your project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Advanced settings will be available in a future update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="danger" className="space-y-6">
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions that can't be undone
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-md p-4">
                <h3 className="font-medium mb-2">Delete Project</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  This will permanently delete your project and all associated data. This action cannot be undone.
                </p>
                <Button 
                  variant="destructive" 
                  onClick={deleteProject} 
                  disabled={deleting}
                >
                  {deleting ? (
                    <>Deleting...</>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Project
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 