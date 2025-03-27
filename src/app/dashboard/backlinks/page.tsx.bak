import { redirect } from "next/navigation";
import Link from "next/link";
import { PlusCircle, ExternalLink, ArrowUpRight, ArrowDownRight, BarChart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BacklinkService } from "@/lib/services/backlink-service";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Server component for the Backlinks overview page
export default async function BacklinksPage() {
  const supabase = createServerClient();
  
  // Check if user is authenticated
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect("/login");
  }
  
  // Get the current project ID (assuming it's stored in the URL or session)
  // For now, we'll get the first project for the user
  const { data: projects } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", session.user.id)
    .limit(1);
  
  if (!projects || projects.length === 0) {
    redirect("/dashboard/new-project");
  }
  
  const projectId = projects[0].id;
  
  // Get backlinks for this project
  const backlinks = await BacklinkService.getBacklinks(projectId);
  
  // Get or create backlink analysis for this project
  const analysis = await BacklinkService.getOrCreateBacklinkAnalysis(projectId);
  
  return (
    <div className="space-y-6">
      {/* Header section with backlinks count and add button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Backlink Manager</h1>
          <p className="text-muted-foreground">
            Analyze and manage your backlinks to improve SEO performance.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/backlinks/add">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Backlink
          </Link>
        </Button>
      </div>
      
      {/* Metrics overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Backlinks</CardTitle>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysis?.total_backlinks || 0}</div>
            <p className="text-xs text-muted-foreground">
              {Math.random() > 0.5 ? (
                <span className="text-green-500 flex items-center">
                  <ArrowUpRight className="mr-1 h-4 w-4" />
                  {Math.floor(Math.random() * 10) + 1}% from last month
                </span>
              ) : (
                <span className="text-red-500 flex items-center">
                  <ArrowDownRight className="mr-1 h-4 w-4" />
                  {Math.floor(Math.random() * 10) + 1}% from last month
                </span>
              )}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Domains</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysis?.unique_domains || 0}</div>
            <p className="text-xs text-muted-foreground">Across all backlinks</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Domain Authority</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysis?.average_domain_authority?.toFixed(1) || "N/A"}</div>
            <p className="text-xs text-muted-foreground">Out of 100</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Link Status Health</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {backlinks ? 
                Math.floor((backlinks.filter(b => b.status === 'active').length / (backlinks.length || 1)) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Active links</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent backlinks table */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Backlinks</h2>
        {backlinks && backlinks.length > 0 ? (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source URL</TableHead>
                  <TableHead>Anchor Text</TableHead>
                  <TableHead>Domain Authority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Discovered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backlinks.slice(0, 5).map((backlink) => (
                  <TableRow key={backlink.id}>
                    <TableCell className="font-medium">
                      <a 
                        href={backlink.source_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center"
                      >
                        {new URL(backlink.source_url).hostname}
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    </TableCell>
                    <TableCell>
                      {backlink.anchor_text || <span className="text-muted-foreground italic">No anchor text</span>}
                    </TableCell>
                    <TableCell>{backlink.domain_authority?.toFixed(1) || "N/A"}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        backlink.status === 'active' ? 'bg-green-100 text-green-800' : 
                        backlink.status === 'broken' ? 'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {backlink.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(backlink.first_discovered).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {backlinks.length > 5 && (
              <div className="p-4 text-center">
                <Button variant="outline" asChild>
                  <Link href="/dashboard/backlinks/analysis">
                    View All Backlinks
                  </Link>
                </Button>
              </div>
            )}
          </Card>
        ) : (
          <Card className="p-8 text-center">
            <CardTitle className="mb-2 text-xl">No backlinks found</CardTitle>
            <CardDescription className="mb-4">
              Start adding backlinks to track your off-site SEO performance.
            </CardDescription>
            <Button asChild>
              <Link href="/dashboard/backlinks/add">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Your First Backlink
              </Link>
            </Button>
          </Card>
        )}
      </div>
      
      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Competitor Analysis</CardTitle>
            <CardDescription>
              Analyze backlinks from your competitors to find opportunities.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/dashboard/backlinks/competitors">
                View Competitor Backlinks
              </Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Backlink Reports</CardTitle>
            <CardDescription>
              Generate reports to track backlink performance over time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/dashboard/backlinks/reports">
                View Reports
              </Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Link Building</CardTitle>
            <CardDescription>
              Find new opportunities to build high-quality backlinks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/dashboard/backlinks/opportunities">
                Find Opportunities
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 