import { redirect } from "next/navigation";
import Link from "next/link";
import { PlusCircle, ExternalLink, BarChart3, PieChart, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BacklinkService } from "@/lib/services/backlink-service";
import { createServerClient } from "@/lib/supabase/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const dynamic = "force-dynamic";

// Mock chart component (for simplicity)
function BacklinkChart({ type }: { type: string }) {
  return (
    <div className="w-full h-64 bg-gray-100 rounded-md flex items-center justify-center">
      {type === 'distribution' && (
        <PieChart className="h-12 w-12 text-gray-400" />
      )}
      {type === 'authority' && (
        <BarChart3 className="h-12 w-12 text-gray-400" />
      )}
      <span className="ml-2 text-gray-500">Chart visualization will appear here</span>
    </div>
  );
}

// Server component for the detailed backlinks analysis page
export default async function BacklinksAnalysisPage() {
  const supabase = createServerClient();
  
  // Check if user is authenticated
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect("/login");
  }
  
  // Get the current project ID
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
  
  // Get backlink analysis
  const analysis = await BacklinkService.getOrCreateBacklinkAnalysis(projectId);
  
  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Backlink Analysis</h1>
          <p className="text-muted-foreground">
            Detailed analysis of your backlink profile and performance.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
          <Button asChild>
            <Link href="/dashboard/backlinks/add">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Backlink
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Analysis charts */}
      <Tabs defaultValue="distribution">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="distribution">Link Type Distribution</TabsTrigger>
          <TabsTrigger value="authority">Domain Authority</TabsTrigger>
        </TabsList>
        <TabsContent value="distribution" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Backlink Type Distribution</CardTitle>
              <CardDescription>
                Breakdown of your backlinks by type (external, internal, nofollow).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BacklinkChart type="distribution" />
              
              {/* Distribution stats */}
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {analysis?.backlinks_by_type?.external || 0}
                  </div>
                  <div className="text-sm text-gray-500">External Links</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {analysis?.backlinks_by_type?.internal || 0}
                  </div>
                  <div className="text-sm text-gray-500">Internal Links</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {analysis?.backlinks_by_type?.nofollow || 0}
                  </div>
                  <div className="text-sm text-gray-500">Nofollow Links</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="authority" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Domain Authority Distribution</CardTitle>
              <CardDescription>
                Distribution of backlinks by domain authority score.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BacklinkChart type="authority" />
              
              {/* Authority stats */}
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {backlinks ? 
                      backlinks.filter(b => (b.domain_authority || 0) >= 60).length : 0}
                  </div>
                  <div className="text-sm text-gray-500">High Authority (60+)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {backlinks ? 
                      backlinks.filter(b => (b.domain_authority || 0) >= 30 && (b.domain_authority || 0) < 60).length : 0}
                  </div>
                  <div className="text-sm text-gray-500">Medium Authority (30-59)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {backlinks ? 
                      backlinks.filter(b => (b.domain_authority || 0) < 30).length : 0}
                  </div>
                  <div className="text-sm text-gray-500">Low Authority (&lt;30)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Top anchor texts */}
      <Card>
        <CardHeader>
          <CardTitle>Top Anchor Texts</CardTitle>
          <CardDescription>
            Most common anchor texts used in your backlinks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {analysis && analysis.top_anchor_texts && Object.entries(analysis.top_anchor_texts)
              .sort(([, a], [, b]) => (Number(b)) - (Number(a)))
              .slice(0, 5)
              .map(([text, count], index) => (
                <div key={index} className="bg-gray-50 p-3 rounded-md text-center">
                  <div className="font-medium truncate" title={text}>"{text}"</div>
                  <div className="text-sm text-gray-500">{String(count)} links</div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
      
      {/* All backlinks table */}
      <div>
        <h2 className="text-xl font-semibold mb-4">All Backlinks</h2>
        {backlinks && backlinks.length > 0 ? (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source URL</TableHead>
                  <TableHead>Target URL</TableHead>
                  <TableHead>Anchor Text</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Domain Authority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Discovered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backlinks.map((backlink) => (
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
                      <span className="text-sm truncate block max-w-[150px]" title={backlink.target_url}>
                        {backlink.target_url}
                      </span>
                    </TableCell>
                    <TableCell>
                      {backlink.anchor_text || <span className="text-muted-foreground italic">No anchor text</span>}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        backlink.link_type === 'external' ? 'bg-blue-100 text-blue-800' : 
                        backlink.link_type === 'internal' ? 'bg-green-100 text-green-800' : 
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {backlink.link_type}
                      </span>
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
          </Card>
        ) : (
          <Card className="p-8 text-center">
            <CardTitle className="mb-2 text-xl">No backlinks found</CardTitle>
            <CardDescription className="mb-4">
              Start adding backlinks to analyze your off-site SEO performance.
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
    </div>
  );
} 