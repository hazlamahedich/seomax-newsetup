'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useSEOAuditStore } from '@/lib/store/seo-audit-store';
import { PlusCircle } from 'lucide-react';
import { DialogTrigger } from '@/components/ui/dialog';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

// Form schema
const formSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  url: z.string().url('Please enter a valid URL'),
});

interface StartAuditDialogProps {
  projectId: string;
  onSuccess?: () => void;
  children?: React.ReactNode;
}

export function StartAuditDialog({ 
  projectId, 
  onSuccess,
  children 
}: StartAuditDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  
  // Get the store methods
  const startAudit = useSEOAuditStore(state => state.startAudit);
  const isLoading = useSEOAuditStore(state => state.isLoading);
  
  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      url: '',
    },
  });
  
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const report = await startAudit(projectId, {
        name: values.name,
        url: values.url,
      });
      
      if (report) {
        toast({
          title: 'Audit Started',
          description: 'Your SEO audit has been started. It may take a few minutes to complete.',
        });
        
        form.reset();
        setOpen(false);
        
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error) {
      console.error('Error starting audit:', error);
      toast({
        title: 'Failed to Start Audit',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Audit
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Start New SEO Audit</DialogTitle>
          <DialogDescription>
            Enter the details for your new SEO audit. The audit will analyze the URL and generate a comprehensive report.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Report Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Main Website Audit" 
                      {...field} 
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for this SEO audit
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website URL</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://example.com" 
                      {...field} 
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    The URL of the website to audit
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  setOpen(false);
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>Start Audit</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 