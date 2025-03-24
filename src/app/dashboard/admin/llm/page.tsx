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
const formSchema = LLMModelSchema.pick({
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

  // Effect to set initial model when models are loaded
  useEffect(() => {
    if (models.length > 0 && !selectedModelId) {
      setSelectedModelId(models[0]?.id || "");
    }
  }, [models, selectedModelId]);

  // Handle test prompt submission
  const handleTestPrompt = async () => {
    if (!selectedModelId || !testPrompt.trim()) {
      toast({
        title: "Validation Error",
        description: "Please select a model and enter a prompt",
        variant: "destructive",
      });
      return;
    }
    
    setTestLoading(true);
    setTestResponse("");
    
    try {
      // Find the selected model
      const model = models.find(m => m.id === selectedModelId);
      if (!model) {
        throw new Error("Selected model not found");
      }
      
      // Call API to test the model
      const response = await fetch("/api/llm/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          modelId: selectedModelId,
          prompt: testPrompt,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error testing model");
      }
      
      const data = await response.json();
      setTestResponse(data.completion || "No response received");
    } catch (error) {
      console.error("Error testing model:", error);
      setTestResponse(`Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`);
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : "Failed to test model",
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
                                    <SelectItem value="cohere">Cohere</SelectItem>
                                    <SelectItem value="together">Together AI</SelectItem>
                                    <SelectItem value="custom">Custom</SelectItem>
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
                                  <Input placeholder="e.g. gpt-4" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="temperature"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Temperature</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0" 
                                    max="1" 
                                    step="0.1" 
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
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
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Max Tokens</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="1" 
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
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
                              <FormDescription>
                                Leave blank to use the key from environment variables
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="baseUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Base URL (Optional)</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="https://api.example.com/v1" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                Custom endpoint URL, if different from the provider default
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="costPerThousandTokens"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cost per 1K Tokens ($)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  step="0.01" 
                                  placeholder="10.00" 
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                />
                              </FormControl>
                              <FormDescription>
                                Used for cost estimation and tracking
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
              <CardTitle>Test LLM Models</CardTitle>
              <CardDescription>
                Try out your configured models with a test prompt
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
                    
                    <Button 
                      onClick={handleTestPrompt} 
                      disabled={testLoading || !selectedModelId || !testPrompt.trim()}
                    >
                      {testLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        "Send Test Prompt"
                      )}
                    </Button>
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