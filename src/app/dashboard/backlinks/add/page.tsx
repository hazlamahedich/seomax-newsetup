import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";
import AddBacklinkForm from "@/components/backlinks/add-backlink-form";

export const dynamic = "force-dynamic";

// Server component for the add backlink page
export default async function AddBacklinkPage() {
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
  
  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/backlinks" className="flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Backlinks
          </Link>
        </Button>
      </div>
      
      {/* Add backlink form */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Add New Backlink</CardTitle>
          <CardDescription>
            Manually add a backlink to track in your SEO analysis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddBacklinkForm projectId={projectId} userId={session.user.id} />
        </CardContent>
        <CardFooter className="flex justify-between border-t px-6 py-4">
          <Button variant="outline" asChild>
            <Link href="/dashboard/backlinks">Cancel</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 