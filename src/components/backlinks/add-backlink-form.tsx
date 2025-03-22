"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, ControllerRenderProps } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "@/components/ui/use-toast";
import { BacklinkService } from "@/lib/services/backlink-service";

// Form validation schema
const formSchema = z.object({
  sourceUrl: z.string().url({ message: "Please enter a valid URL" }),
  targetUrl: z.string().url({ message: "Please enter a valid URL" }),
  anchorText: z.string().optional(),
  linkType: z.enum(["external", "internal", "nofollow"])
});

// Type for form values
type FormValues = z.infer<typeof formSchema>;

interface AddBacklinkFormProps {
  projectId: string;
  userId: string;
}

export default function AddBacklinkForm({ projectId, userId }: AddBacklinkFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sourceUrl: "",
      targetUrl: "",
      anchorText: "",
      linkType: "external"
    },
  });
  
  // Form submit handler
  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    
    try {
      const result = await BacklinkService.addBacklink(
        projectId,
        values.sourceUrl,
        values.targetUrl,
        values.anchorText || undefined,
        values.linkType
      );
      
      if (result) {
        toast({
          title: "Backlink added successfully",
          description: "Your new backlink has been added to the tracking system.",
        });
        router.push("/dashboard/backlinks");
        router.refresh();
      } else {
        toast({
          title: "Error adding backlink",
          description: "There was an error adding your backlink. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error adding backlink:", error);
      toast({
        title: "Error adding backlink",
        description: "There was an error adding your backlink. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="sourceUrl"
          render={({ field }: { field: ControllerRenderProps<FormValues, "sourceUrl"> }) => (
            <FormItem>
              <FormLabel>Source URL</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/page-linking-to-you" {...field} />
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
          render={({ field }: { field: ControllerRenderProps<FormValues, "targetUrl"> }) => (
            <FormItem>
              <FormLabel>Target URL</FormLabel>
              <FormControl>
                <Input placeholder="https://yourwebsite.com/target-page" {...field} />
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
          render={({ field }: { field: ControllerRenderProps<FormValues, "anchorText"> }) => (
            <FormItem>
              <FormLabel>Anchor Text</FormLabel>
              <FormControl>
                <Input placeholder="Click here" {...field} />
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
          render={({ field }: { field: ControllerRenderProps<FormValues, "linkType"> }) => (
            <FormItem>
              <FormLabel>Link Type</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
              >
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