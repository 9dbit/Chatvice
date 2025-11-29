import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { FileText, Link2, Type, Globe, Plus, Trash2, Edit, Crown, ArrowUpRight, Download, Upload, CheckCircle2 } from "lucide-react";
import type { Source, Merchant } from "@shared/schema";
import { subscriptionPlans, type SubscriptionPlanId } from "@shared/schema";

const sourceSchema = z.object({
  type: z.enum(["file", "text", "website"]),
  name: z.string().min(1, "Name is required"),
  content: z.string().optional(),
  url: z.string().url().optional().or(z.literal("")),
});

type SourceFormData = z.infer<typeof sourceSchema>;

export default function SourcesPage() {
  const merchantId = localStorage.getItem("merchantId") || "";
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedSources, setSelectedSources] = useState<string[]>([]);

  const { data: merchant } = useQuery<Merchant>({
    queryKey: ["/api/merchant", merchantId],
    enabled: !!merchantId,
  });

  const { data: sources, isLoading } = useQuery<Source[]>({
    queryKey: ["/api/sources"],
  });

  const plan = merchant ? subscriptionPlans[merchant.subscriptionPlanId as SubscriptionPlanId] || subscriptionPlans.free : subscriptionPlans.free;
  const isPro = plan.id === "pro" || plan.id === "enterprise" || plan.id === "custom";
  const sourcesLimit = (plan as any).sourcesLimit || 1;
  const currentSourceCount = sources?.length || 0;
  const canAddMoreSources = sourcesLimit === -1 || currentSourceCount < sourcesLimit;

  const form = useForm<SourceFormData>({
    resolver: zodResolver(sourceSchema),
    defaultValues: {
      type: "text",
      name: "",
      content: "",
      url: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: SourceFormData) => {
      return apiRequest("POST", "/api/sources", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sources"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Source added",
        description: "Your knowledge source has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to add source",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Source> }) => {
      return apiRequest("PUT", `/api/sources/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sources"] });
      toast({
        title: "Source updated",
        description: "Your source has been updated.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/sources/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sources"] });
      toast({
        title: "Source deleted",
        description: "The source has been removed.",
      });
    },
  });

  const onSubmit = (data: SourceFormData) => {
    createMutation.mutate(data);
  };

  const toggleSourceSelection = (id: string) => {
    setSelectedSources(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const filteredSources = sources?.filter(source => {
    if (activeTab === "all") return true;
    return source.type === activeTab;
  }) || [];

  const totalChars = sources?.reduce((sum, s) => sum + (s.charCount || 0), 0) || 0;
  const activeCount = sources?.filter(s => s.isActive).length || 0;

  const getSourceIcon = (type: string) => {
    switch (type) {
      case "file": return FileText;
      case "text": return Type;
      case "website": return Globe;
      default: return FileText;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sources</h1>
          <p className="text-muted-foreground">
            Manage knowledge sources for your AI agents.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-source">
              <Plus className="w-4 h-4 mr-2" />
              Add Source
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Knowledge Source</DialogTitle>
              <DialogDescription>
                Add a new source to train your AI agent.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-source-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="text">
                            <div className="flex items-center gap-2">
                              <Type className="w-4 h-4" />
                              Text Snippet
                            </div>
                          </SelectItem>
                          <SelectItem value="file">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              File (DOC/TXT/PDF)
                            </div>
                          </SelectItem>
                          <SelectItem value="website">
                            <div className="flex items-center gap-2">
                              <Globe className="w-4 h-4" />
                              Website Link
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., FAQ Document" data-testid="input-source-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.watch("type") === "website" ? (
                  <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/faq" data-testid="input-source-url" {...field} />
                        </FormControl>
                        <FormDescription>
                          We'll crawl this page and extract content.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter your knowledge content here..."
                            className="min-h-[120px]"
                            data-testid="input-source-content"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Adding..." : "Add Source"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {!isPro && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Crown className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Upgrade for advanced sources</h3>
                <p className="text-sm text-muted-foreground">
                  Get website crawling, sitemap import, and more with Pro or Enterprise.
                </p>
              </div>
            </div>
            <Link href="/dashboard/plans">
              <Button data-testid="button-upgrade-sources">
                Upgrade
                <ArrowUpRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{sources?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Characters</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalChars.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="text">Text</TabsTrigger>
          <TabsTrigger value="file">Files</TabsTrigger>
          <TabsTrigger value="website">Websites</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="mt-4">
          {filteredSources.length > 0 ? (
            <div className="space-y-3">
              {filteredSources.map((source) => {
                const Icon = getSourceIcon(source.type);
                return (
                  <Card key={source.id} className="hover-elevate" data-testid={`source-card-${source.id}`}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <Checkbox
                          checked={selectedSources.includes(source.id)}
                          onCheckedChange={() => toggleSourceSelection(source.id)}
                          data-testid={`checkbox-source-${source.id}`}
                        />
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <Icon className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{source.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="secondary" className="text-xs">
                              {source.type}
                            </Badge>
                            <span>{(source.charCount || 0).toLocaleString()} chars</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={source.isActive ?? false}
                          onCheckedChange={(checked) => updateMutation.mutate({ id: source.id, data: { isActive: checked } })}
                          data-testid={`switch-source-${source.id}`}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(source.id)}
                          data-testid={`button-delete-source-${source.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-2">No sources yet</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  Add knowledge sources to train your AI agent with your business information.
                </p>
                <Button className="mt-4" onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-source">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Source
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
