"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";

// Form validation schema
const formSchema = z.object({
  sourceUrl: z.string().url({ message: "Please enter a valid URL" }),
  targetUrl: z.string().url({ message: "Please enter a valid URL" }),
  anchorText: z.string().optional(),
  linkType: z.string().default('external'),
});

// Type for form values
type FormValues = z.infer<typeof formSchema>;

interface AddBacklinkFormProps {
  projectId: string;
}

export default function AddBacklinkForm({ projectId }: AddBacklinkFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const supabase = createClient();
  
  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sourceUrl: "",
      targetUrl: "",
      anchorText: "",
      linkType: "external",
    },
  });
  
  // Form submit handler
  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    
    try {
      // Add the backlink directly using Supabase
      const { data, error } = await supabase
        .from('backlinks')
        .insert([
          {
            project_id: projectId,
            source_url: values.sourceUrl,
            target_url: values.targetUrl,
            anchor_text: values.anchorText || null,
            link_type: values.linkType,
            status: 'active',
            first_discovered: new Date().toISOString(),
            last_checked: new Date().toISOString(),
            // Mock values for demo
            page_authority: Math.floor(Math.random() * 100),
            domain_authority: Math.floor(Math.random() * 100),
          }
        ])
        .select();
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Success!",
        description: "Backlink added successfully",
        variant: "default",
      });
      
      form.reset();
      router.refresh();
      
    } catch (error: any) {
      console.error('Error adding backlink:', error);
      toast({
        title: "Error",
        description: `Failed to add backlink: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="sourceUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Source URL</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/page-with-backlink" {...field} />
              </FormControl>
              <FormDescription>
                The URL of the page containing the link to your website.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="targetUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target URL</FormLabel>
              <FormControl>
                <Input placeholder="https://yoursite.com/target-page" {...field} />
              </FormControl>
              <FormDescription>
                The URL of your page being linked to.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="anchorText"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Anchor Text</FormLabel>
              <FormControl>
                <Input placeholder="Optional anchor text" {...field} />
              </FormControl>
              <FormDescription>
                The clickable text of the link (optional).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="linkType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Link Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select link type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="external">External</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="nofollow">Nofollow</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                The type of link that is pointing to your page.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Adding..." : "Add Backlink"}
        </Button>
      </form>
    </Form>
  );
} 