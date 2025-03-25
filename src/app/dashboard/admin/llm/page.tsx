"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/hooks";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { LLMConfigSchema } from "@/lib/ai/litellm-provider";
import { LLMModelSchema } from "@/lib/ai/models/usage";
import { LLMModelRepository, LLMUsageRepository } from "@/lib/ai/models/repository";
import { Label } from "@/components/ui/label";
import { initializeDefaultModel } from "./initialize-model";

// Define the form schema for adding a new LLM model
const formSchema = LLMModelSchema.extend({
  // Override the optional fields with defaults to ensure they're always defined
  costPerThousandTokens: z.number().positive().default(10),
}).pick({
  name: true,
  provider: true,
  modelName: true,
  apiKey: true,
  baseUrl: true,
  temperature: true,
  maxTokens: true,
  costPerThousandTokens: true,
  isDefault: true,
});

// LLM Management Page
export default function LLMManagementPage() {
  const [activeTab, setActiveTab] = useState<string>("models");
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [usageStats, setUsageStats] = useState<any>(null);
  const [dateRange, setDateRange] = useState<string>("7d");
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [editingModel, setEditingModel] = useState<any>(null);
  
  // Test model states
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [testPrompt, setTestPrompt] = useState<string>("");
  const [testResponse, setTestResponse] = useState<string>("");
  const [testLoading, setTestLoading] = useState<boolean>(false);
  const [initializing, setInitializing] = useState<boolean>(false);
  
  const router = useRouter();
  const { user, loading: authLoading, isAdmin } = useSupabaseAuth();
  const { toast } = useToast();
  
  // Check if user is authenticated and is an admin
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      
      if (!isAdmin()) {
        router.push('/dashboard');
        toast({
          title: "Access Denied",
          description: "You don't have permission to access LLM management.",
          variant: "destructive",
        });
        return;
      }
    }
  }, [user, authLoading, router, isAdmin, toast]);
  
  // Create form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      provider: "openai",
      modelName: "",
      apiKey: "",
      baseUrl: "",
      temperature: 0.2,
      maxTokens: 2000,
      costPerThousandTokens: 10,
      isDefault: false,
    },
  });

  // Load models and usage stats
  useEffect(() => {
    let isMounted = true;
    let hasShownError = false;
    
    const fetchData = async () => {
      if (!isMounted) return;
      
      setLoading(true);
      try {
        // First check if the llm_models table exists
        try {
          // Try to fetch models
          const modelData = await LLMModelRepository.getAllModels();
          if (isMounted) {
            setModels(modelData || []);
          }
        } catch (modelError) {
          console.error("Error fetching LLM models:", modelError);
          if (isMounted && !hasShownError) {
            hasShownError = true;
            toast({
              title: "Database Error",
              description: "The LLM models table may not be properly set up. Click 'Initialize' to create the required tables and a default model.",
              variant: "destructive",
            });
            setModels([]);
          }
        }
        
        // Fetch usage stats (separate try/catch to isolate errors)
        try {
          // Setup date range
          const now = new Date();
          let startDate = new Date();
          
          switch (dateRange) {
            case "7d":
              startDate.setDate(now.getDate() - 7);
              break;
            case "30d":
              startDate.setDate(now.getDate() - 30);
              break;
            case "90d":
              startDate.setDate(now.getDate() - 90);
              break;
          }
          
          // Try to get usage stats
          const stats = await LLMUsageRepository.getUsageStats(startDate, now);
          if (isMounted) {
            setUsageStats(stats);
          }
        } catch (statsError) {
          console.error("Error fetching usage stats:", statsError);
          if (isMounted && !hasShownError) {
            hasShownError = true;
            toast({
              title: "Usage Data Error",
              description: "Unable to fetch LLM usage statistics. The usage data table may not be properly set up.",
              variant: "destructive",
            });
            
            // Set default stats
            setUsageStats({
              totalTokens: 0,
              totalCost: 0,
              requestCount: 0,
              usageByModel: {},
              dailyUsage: [],
              dateRange: {
                start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                end: new Date().toISOString(),
              },
            });
          }
        }
      } catch (error) {
        console.error("General error in data fetching:", error);
        // Don't fail completely, just show empty data
        if (isMounted && !hasShownError) {
          hasShownError = true;
          toast({
            title: "Error",
            description: "An unexpected error occurred while loading LLM data.",
            variant: "destructive",
          });
          setModels([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    fetchData();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [dateRange, toast]);

  // Initialize default model
  const handleInitializeModel = async () => {
    setInitializing(true);
    try {
      const result = await initializeDefaultModel();
      
      if (result.created) {
        toast({
          title: "Success",
          description: "Default OpenAI model initialized successfully.",
        });
        
        // Refresh models list
        const modelData = await LLMModelRepository.getAllModels();
        setModels(modelData || []);
      } else if (result.error) {
        toast({
          title: "Initialization Error",
          description: result.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "No Action Needed",
          description: result.message,
        });
      }
    } catch (error) {
      console.error("Error initializing model:", error);
      toast({
        title: "Initialization Error",
        description: error instanceof Error ? error.message : "Failed to initialize default model",
        variant: "destructive",
      });
    } finally {
      setInitializing(false);
    }
  };

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (editingModel) {
        // Update existing model
        await LLMModelRepository.updateModel(editingModel.id, values);
      } else {
        // Create new model
        await LLMModelRepository.createModel(values);
      }
      
      // Refresh models list
      const modelData = await LLMModelRepository.getAllModels();
      setModels(modelData);
      
      // Reset form and close dialog
      form.reset();
      setIsDialogOpen(false);
      setEditingModel(null);
    } catch (error) {
      console.error("Error saving model:", error);
    }
  };

  // Handle edit model
  const handleEditModel = (model: any) => {
    setEditingModel(model);
    
    // Set form values
    form.reset({
      name: model.name,
      provider: model.provider,
      modelName: model.modelName,
      apiKey: model.apiKey || "",
      baseUrl: model.baseUrl || "",
      temperature: model.temperature,
      maxTokens: model.maxTokens,
      costPerThousandTokens: model.costPerThousandTokens || 10,
      isDefault: model.isDefault,
    });
    
    setIsDialogOpen(true);
  };

  // Handle delete model
  const handleDeleteModel = async (id: string) => {
    if (confirm("Are you sure you want to delete this model?")) {
      try {
        await LLMModelRepository.deleteModel(id);
        
        // Refresh models list
        const modelData = await LLMModelRepository.getAllModels();
        setModels(modelData);
      } catch (error) {
        console.error("Error deleting model:", error);
      }
    }
  };

  // Handle dialog open change
  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      form.reset();
      setEditingModel(null);
    }
  };

  // Update the useEffect to both load models and ensure valid selection
  useEffect(() => {
    if (models.length > 0) {
      // Check if the currently selected model exists in the list
      const modelExists = models.some(model => model.id === selectedModelId);
      
      // If the current selection doesn't exist, select the first available model
      if (!modelExists) {
        console.log("Selected model not found in list, selecting first available model");
        setSelectedModelId(models[0].id);
      }
    }
  }, [models, selectedModelId]);

  // Handle test prompt submission
  const handleTestPrompt = async () => {
    if (!selectedModelId || !testPrompt) {
      toast({
        title: "Missing information",
        description: "Please select a model and enter a prompt to test.",
        variant: "destructive",
      });
      return;
    }
    
    // Find the selected model details
    const selectedModel = models.find(m => m.id === selectedModelId);
    
    // Verify the model exists before attempting to use it
    const modelExists = !!selectedModel;
    if (!modelExists) {
      toast({
        title: "Warning",
        description: "The selected model wasn't found in the local list. We'll try to use it directly.",
      });
    } else {
      // If model exists in UI but might not be in DB, try to cache it to ensure it's available
      try {
        console.log("Pre-caching model to ensure availability:", selectedModel.name);
        const cacheResponse = await fetch("/api/llm/cache-model", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: selectedModel })
        });
        
        if (!cacheResponse.ok) {
          console.warn("Warning: Failed to cache model, but continuing anyway:", await cacheResponse.text());
        } else {
          console.log("Model cached successfully");
        }
      } catch (cacheError) {
        console.error("Error pre-caching model:", cacheError);
        // Continue anyway - the test might still work
      }
    }
    
    setTestLoading(true);
    setTestResponse("");
    
    // Log selected model for debugging
    console.log("Testing with model ID:", selectedModelId);
    console.log("Available models:", models);
    console.log("Selected model details:", selectedModel);
    
    try {
      console.log(`Testing model ${selectedModelId} with prompt: ${testPrompt}`);
      
      // Add request timeout of 60 seconds
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      
      try {
        // Include full model details in the request even if the model exists
        // This will serve as a fallback if the server can't find the model
        const requestBody = { 
          modelId: selectedModelId, 
          prompt: testPrompt
        };
        
        // Add model details if available
        if (selectedModel) {
          // Fix any typos in the model name for Ollama models
          let modelName = selectedModel.modelName;
          if (selectedModel.provider === 'local' && modelName.startsWith('eepseek')) {
            modelName = modelName.replace('eepseek', 'deepseek');
            console.log(`Corrected modelName from ${selectedModel.modelName} to ${modelName}`);
          }
          
          Object.assign(requestBody, {
            provider: selectedModel.provider,
            modelName: modelName, // Use the corrected model name
            baseUrl: selectedModel.baseUrl,
            temperature: selectedModel.temperature,
            maxTokens: selectedModel.maxTokens
          });
        } else if (selectedModelId === '97767c8f-76e2-4b3d-870f-4196dbd59473') {
          // Hardcoded fallback for your specific model that's having issues
          // This is based on what you shared in the logs
          Object.assign(requestBody, {
            provider: 'local',
            modelName: 'DeepseekR1 70B local',
            baseUrl: 'http://localhost:11434/v1',
            temperature: 0.2,
            maxTokens: 2000
          });
        }
        
        const response = await fetch("/api/llm/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
      
        let responseText = await response.text();
        console.log("Raw API response:", responseText);
        
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (jsonError) {
          console.error("Error parsing response:", jsonError);
          throw new Error(`API response is not valid JSON: ${responseText}`);
        }
        
        console.log("Parsed API response:", data);
        
        if (!response.ok) {
          const errorMessage = data?.error || `API returned status ${response.status}`;
          console.error("API error details:", data);
          throw new Error(errorMessage);
        }
        
        setTestResponse(data.completion);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timed out after 60 seconds');
        }
        
        // Rethrow the original error
        throw fetchError;
      }
    } catch (error) {
      console.error("Error testing model:", error);
      setTestResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
      
      toast({
        title: "Error testing model",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setTestLoading(false);
    }
  };

  // Add function to refresh models
  const refreshModels = async () => {
    try {
      setLoading(true);
      const modelData = await LLMModelRepository.getAllModels();
      setModels(modelData || []);
      toast({
        title: "Models refreshed",
        description: `Found ${modelData?.length || 0} models`,
      });
    } catch (error) {
      console.error("Error refreshing models:", error);
      toast({
        title: "Refresh failed",
        description: "Could not refresh models list",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Add a new function to handle force initialization
  const handleForceInitialize = async () => {
    try {
      setInitializing(true);
      
      // Create a new OpenAI model regardless of existing models
      const model = await LLMModelRepository.createModel({
        name: "OpenAI GPT-4o (New)",
        provider: "openai",
        modelName: "gpt-4o",
        apiKey: "",  // User will need to add their API key
        temperature: 0.2,
        maxTokens: 2000,
        costPerThousandTokens: 10,
        isDefault: true,
      });
      
      console.log("Created new model with ID:", model?.id);
      
      toast({
        title: "Model created",
        description: `A new OpenAI model has been created${model?.id ? ` with ID: ${model.id}` : ''}. Please add your API key.`,
      });
      
      // Refresh the models list
      await refreshModels();
      
      // Only select the new model if it was successfully created
      if (model?.id) {
        setSelectedModelId(model.id);
      } else {
        toast({
          title: "Warning",
          description: "Model was created but no ID was returned. Model selection may not work correctly.",
          variant: "destructive",
        });
      }
      
    } catch (error) {
      console.error("Error creating model:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create model",
        variant: "destructive",
      });
    } finally {
      setInitializing(false);
    }
  };

  // Add debug info function
  const showDebugInfo = async () => {
    try {
      // Get all models
      const allModels = await LLMModelRepository.getAllModels();
      console.log("All models:", allModels);
      
      // Try to get the model that's failing
      const modelAttempt = await LLMModelRepository.getModelById(selectedModelId);
      console.log("Direct model fetch result:", modelAttempt);
      
      toast({
        title: "Debug Info",
        description: `Models count: ${allModels.length}. Selected model found: ${modelAttempt ? "Yes" : "No"}. See console for details.`,
      });
    } catch (error) {
      console.error("Debug error:", error);
      toast({
        title: "Debug Error",
        description: error instanceof Error ? error.message : "Error running diagnostics",
        variant: "destructive",
      });
    }
  };

  // Add a detailed API diagnostics function
  const runApiDiagnostics = async () => {
    try {
      if (!selectedModelId) {
        toast({
          title: "Missing information",
          description: "Please select a model to debug.",
          variant: "destructive",
        });
        return;
      }

      // Call our debug API to diagnose database connection issues
      const response = await fetch("/api/llm/debug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId: selectedModelId })
      });
      
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      
      const data = await response.json();
      console.log("API Diagnostics Result:", data);
      
      // Show structured results in a toast with more details in console
      toast({
        title: "API Diagnostics Completed",
        description: `Model Found: ${data.modelFound ? "✅" : "❌"}, 
                      Database: ${data.dbDiagnostics.connectionStatus === 'connected' ? "✅" : "❌"}, 
                      Model Count: ${data.dbDiagnostics.modelCount}, 
                      Cache: ${data.cacheStatus}`,
        duration: 5000,
      });
      
      // Provide more detailed feedback based on the diagnostic results
      if (!data.modelFound) {
        if (data.dbDiagnostics.modelCount > 0) {
          toast({
            title: "Issue Identified",
            description: "The database is connected and has models, but the requested model ID was not found.",
            variant: "destructive",
            duration: 5000,
          });
        } else {
          toast({
            title: "No Models Found",
            description: "The database is connected but no models are available. Try initializing the default model.",
            variant: "destructive",
            duration: 5000,
          });
        }
      }
      
      // If database connection failed, provide specific guidance
      if (data.dbDiagnostics.connectionStatus !== 'connected') {
        toast({
          title: "Database Connection Issue",
          description: "Unable to connect to the database. Check environment variables and network connectivity.",
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Error running API diagnostics:", error);
      toast({
        title: "Diagnostics Error",
        description: error instanceof Error ? error.message : "Error running API diagnostics",
        variant: "destructive",
      });
    }
  };

  const debugModelDetails = async () => {
    if (!selectedModelId) {
      toast({
        title: "Missing information",
        description: "Please select a model to debug.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setTestLoading(true);
      // Get all models
      const allModels = await LLMModelRepository.getAllModels();
      console.log("All models:", allModels);
      
      // Try to get the model that's failing
      const modelAttempt = await LLMModelRepository.getModelById(selectedModelId);
      console.log("Direct model fetch result:", modelAttempt);
      
      // Call the debug endpoint using POST method
      const response = await fetch(`/api/llm/debug`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ modelId: selectedModelId })
      });
      
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Debug API response:", data);
      
      setTestResponse(JSON.stringify(data, null, 2));
      
      toast({
        title: "Debug information retrieved",
        description: "Check the console and response area for details.",
      });
    } catch (error) {
      console.error("Error debugging model:", error);
      setTestResponse(String(error));
      toast({
        title: "Error debugging model",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setTestLoading(false);
    }
  };

  // Show loading spinner while checking auth or loading data
  if (authLoading || (loading && !models.length)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">LLM Management</h1>
        <div className="flex gap-2">
          {models.length === 0 && (
            <Button 
              variant="default" 
              onClick={handleInitializeModel}
              disabled={initializing}
            >
              {initializing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Initializing...
                </>
              ) : (
                "Initialize Default Model"
              )}
            </Button>
          )}
          <Button variant="outline" onClick={() => router.back()}>
            Back
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="usage">Usage & Costs</TabsTrigger>
          <TabsTrigger value="test">Test Models</TabsTrigger>
        </TabsList>
        
        {/* Models Tab */}
        <TabsContent value="models">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>LLM Models</CardTitle>
                <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingModel(null);
                      form.reset();
                    }}>
                      Add Model
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>
                        {editingModel ? "Edit Model" : "Add New Model"}
                      </DialogTitle>
                      <DialogDescription>
                        Configure a language model to use with LiteLLM
                      </DialogDescription>
                    </DialogHeader>
                    
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. OpenAI GPT-4" {...field} />
                              </FormControl>
                              <FormDescription>
                                A friendly name for this model configuration
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="provider"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Provider</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a provider" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="openai">OpenAI</SelectItem>
                                    <SelectItem value="anthropic">Anthropic</SelectItem>
                                    <SelectItem value="azure">Azure OpenAI</SelectItem>
                                    <SelectItem value="groq">Groq</SelectItem>
                                    <SelectItem value="together">Together AI</SelectItem>
                                    <SelectItem value="cohere">Cohere</SelectItem>
                                    <SelectItem value="custom">Custom</SelectItem>
                                    <SelectItem value="local">Local Model</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="modelName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Model Name</FormLabel>
                                <FormControl>
                                  <Input placeholder={
                                    form.watch('provider') === 'together' ? "e.g. meta-llama/Llama-3-70b-instruct" : 
                                    form.watch('provider') === 'local' ? "e.g. deepseek-r1 (any identifier)" :
                                    "e.g. gpt-4"
                                  } {...field} />
                                </FormControl>
                                {form.watch('provider') === 'together' && (
                                  <FormDescription>
                                    For Together.ai, use the full model path (e.g. meta-llama/Llama-3-70b-instruct)
                                  </FormDescription>
                                )}
                                {form.watch('provider') === 'local' && (
                                  <FormDescription>
                                    Enter a name to identify your local model (e.g. deepseek-r1)
                                  </FormDescription>
                                )}
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="temperature"
                            render={({ field: { onChange, value, ...rest } }) => (
                              <FormItem>
                                <FormLabel>Temperature</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0" 
                                    max="1" 
                                    step="0.1" 
                                    {...rest}
                                    value={isNaN(parseFloat(String(value))) ? "0.2" : value}
                                    onChange={(e) => {
                                      const parsed = e.target.value === "" ? 0.2 : parseFloat(e.target.value);
                                      onChange(parsed as number);
                                    }}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Value between 0-1, lower for more deterministic
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="maxTokens"
                            render={({ field: { onChange, value, ...rest } }) => (
                              <FormItem>
                                <FormLabel>Max Tokens</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="1" 
                                    {...rest}
                                    value={isNaN(parseFloat(String(value))) ? "2000" : value}
                                    onChange={(e) => {
                                      const parsed = e.target.value === "" ? 2000 : parseInt(e.target.value);
                                      onChange(parsed as number);
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="apiKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>API Key</FormLabel>
                              <FormControl>
                                <Input 
                                  type="password" 
                                  placeholder="Enter API key" 
                                  {...field} 
                                />
                              </FormControl>
                              {form.watch('provider') === 'together' && (
                                <FormDescription>
                                  Enter your Together.ai API key from https://api.together.xyz/settings/api-keys
                                </FormDescription>
                              )}
                              {form.watch('provider') === 'local' && (
                                <FormDescription>
                                  For local models, enter "EMPTY" or leave blank if your server doesn't require an API key
                                </FormDescription>
                              )}
                              {form.watch('provider') !== 'together' && form.watch('provider') !== 'local' && (
                                <FormDescription>
                                  Leave blank to use the key from environment variables
                                </FormDescription>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="baseUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Base URL</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder={
                                    form.watch('provider') === 'together' ? "https://api.together.xyz" : 
                                    form.watch('provider') === 'local' ? "http://localhost:11434/v1" :
                                    "Enter API base URL (if needed)"
                                  } 
                                  {...field} 
                                />
                              </FormControl>
                              {form.watch('provider') === 'together' && (
                                <FormDescription>
                                  For Together.ai, usually https://api.together.xyz
                                </FormDescription>
                              )}
                              {form.watch('provider') === 'local' && (
                                <FormDescription>
                                  For Ollama, use http://localhost:11434/v1. For other local servers, check their documentation.
                                </FormDescription>
                              )}
                              {form.watch('provider') !== 'together' && form.watch('provider') !== 'local' && (
                                <FormDescription>
                                  Optional: only needed for custom endpoint URLs
                                </FormDescription>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="costPerThousandTokens"
                          render={({ field: { onChange, value, ...rest } }) => (
                            <FormItem>
                              <FormLabel>Cost per 1K Tokens</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  step="0.01" 
                                  {...rest}
                                  value={isNaN(parseFloat(String(value))) ? "10" : value}
                                  onChange={(e) => {
                                    const parsed = e.target.value === "" ? 10 : parseFloat(e.target.value);
                                    onChange(parsed as number);
                                  }}
                                />
                              </FormControl>
                              <FormDescription>
                                Estimated cost in USD per 1,000 tokens
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="isDefault"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>
                                  Set as default model
                                </FormLabel>
                                <FormDescription>
                                  This model will be used when no specific model is requested
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        
                        <DialogFooter>
                          <Button type="submit">
                            {editingModel ? "Save Changes" : "Add Model"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
              <CardDescription>
                Configure language models to use with LiteLLM
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading models...</div>
              ) : models.length === 0 ? (
                <div className="text-center py-4">
                  <p className="mb-4">No models configured yet. Add your first model or initialize a default one to get started.</p>
                  <Button onClick={handleInitializeModel} disabled={initializing}>
                    {initializing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Initializing...
                      </>
                    ) : (
                      "Initialize Default Model"
                    )}
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Temperature</TableHead>
                      <TableHead>Max Tokens</TableHead>
                      <TableHead>Default</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {models.map((model) => (
                      <TableRow key={model.id}>
                        <TableCell className="font-medium">{model.name}</TableCell>
                        <TableCell className="capitalize">{model.provider}</TableCell>
                        <TableCell>{model.modelName}</TableCell>
                        <TableCell>{model.temperature}</TableCell>
                        <TableCell>{model.maxTokens}</TableCell>
                        <TableCell>
                          {model.isDefault ? (
                            <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
                              Default
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                Actions
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => handleEditModel(model)}>
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteModel(model.id)}
                                className="text-red-600"
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Usage & Costs Tab */}
        <TabsContent value="usage">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Usage & Costs</CardTitle>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select time range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <CardDescription>
                Monitor your LLM usage and associated costs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading usage statistics...</div>
              ) : !usageStats || !usageStats.dailyUsage || usageStats.dailyUsage.length === 0 ? (
                <div className="text-center py-4">
                  No usage data available for the selected time period.
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          Total Tokens
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {usageStats.totalTokens.toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          Total Cost
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          ${usageStats.totalCost.toFixed(2)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          Total Requests
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {usageStats.requestCount.toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Daily Usage Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Daily Usage</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={usageStats.dailyUsage}
                            margin={{
                              top: 5,
                              right: 30,
                              left: 20,
                              bottom: 5,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis yAxisId="left" />
                            <YAxis yAxisId="right" orientation="right" />
                            <Tooltip />
                            <Legend />
                            <Line
                              yAxisId="left"
                              type="monotone"
                              dataKey="tokens"
                              name="Tokens"
                              stroke="#8884d8"
                              activeDot={{ r: 8 }}
                            />
                            <Line
                              yAxisId="right"
                              type="monotone"
                              dataKey="cost"
                              name="Cost ($)"
                              stroke="#82ca9d"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Model Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Usage by Model</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={Object.entries(usageStats.usageByModel).map(
                              ([model, stats]: [string, any]) => ({
                                model,
                                tokens: stats.tokens,
                                cost: stats.cost,
                                count: stats.count,
                              })
                            )}
                            margin={{
                              top: 5,
                              right: 30,
                              left: 20,
                              bottom: 5,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="model" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar
                              dataKey="tokens"
                              name="Tokens"
                              fill="#8884d8"
                            />
                            <Bar
                              dataKey="cost"
                              name="Cost ($)"
                              fill="#82ca9d"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Test Models Tab */}
        <TabsContent value="test">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Test Models</CardTitle>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={refreshModels}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Refreshing...
                      </>
                    ) : "Refresh Models"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleForceInitialize}
                    disabled={initializing}
                  >
                    {initializing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : "Create New Model"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={showDebugInfo}
                  >
                    Debug Info
                  </Button>
                  <Button
                    variant="outline"
                    onClick={runApiDiagnostics}
                  >
                    API Diagnostics
                  </Button>
                </div>
              </div>
              <CardDescription>
                Test your LLM models with sample prompts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {models.length === 0 ? (
                <div className="text-center py-4">
                  <p className="mb-4">No models available for testing. Add a model first or initialize a default one.</p>
                  <Button onClick={handleInitializeModel} disabled={initializing}>
                    {initializing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Initializing...
                      </>
                    ) : (
                      "Initialize Default Model"
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="model-select">Select Model</Label>
                      <Select 
                        value={selectedModelId} 
                        onValueChange={setSelectedModelId}
                        disabled={models.length === 0}
                      >
                        <SelectTrigger id="model-select">
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent>
                          {models.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="test-prompt">Test Prompt</Label>
                      <textarea
                        id="test-prompt"
                        className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Enter a test prompt here..."
                        rows={5}
                        value={testPrompt}
                        onChange={(e) => setTestPrompt(e.target.value)}
                        disabled={testLoading}
                      ></textarea>
                    </div>
                    
                    <div className="mt-4 flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={debugModelDetails}
                        disabled={testLoading || !selectedModelId}
                      >
                        Debug Model
                      </Button>
                      <Button
                        onClick={handleTestPrompt}
                        disabled={testLoading || !selectedModelId || !testPrompt}
                      >
                        {testLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Testing...
                          </>
                        ) : (
                          "Test"
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="border rounded-md p-4 bg-muted/50 min-h-[200px] max-h-[400px] overflow-auto">
                    {testResponse ? (
                      <div className="whitespace-pre-wrap font-mono text-sm">
                        {testResponse}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Response will appear here after you send a test prompt...
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 