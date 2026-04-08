import { useLanguage } from "@/hooks/use-language";
import { useState, useRef } from "react";
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
import { FileText, Link2, Type, Globe, Plus, Trash2, Edit, Crown, ArrowUpRight, Download, Upload, CheckCircle2, Loader2, Table2, RefreshCw, ExternalLink, Copy } from "lucide-react";
import type { Source, Merchant } from "@shared/schema";
import { subscriptionPlans, type SubscriptionPlanId } from "@shared/schema";

const sourceSchema = z.object({
  type: z.enum(["file", "text", "website", "google-doc", "google-sheet"]),
  name: z.string().min(1, "Name is required"),
  content: z.string().optional(),
  url: z.string().url().optional().or(z.literal("")),
});

type SourceFormData = z.infer<typeof sourceSchema>;

export default function SourcesPage() {
  const { t } = useLanguage();
  const merchantId = localStorage.getItem("merchantId") || "";
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [templateSheetUrl, setTemplateSheetUrl] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      form.reset();
      setUploadedFileName("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setIsDialogOpen(false);
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

  const uploadFileMutation = useMutation({
    mutationFn: async ({ file, name }: { file: File; name: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", name);
      const res = await fetch("/api/sources/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sources"] });
      form.reset();
      setUploadedFileName("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setIsDialogOpen(false);
      toast({ title: "Source added", description: "Document uploaded successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const googleDocMutation = useMutation({
    mutationFn: async ({ url, name }: { url: string; name: string }) => {
      return apiRequest("POST", "/api/sources/google-doc", { url, name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sources"] });
      form.reset();
      setIsDialogOpen(false);
      toast({ title: "Source added", description: "Google Doc imported successfully." });
    },
    onError: () => {
      toast({ title: "Import failed", description: "Could not import Google Doc. Make sure it's publicly accessible.", variant: "destructive" });
    },
  });

  const googleSheetMutation = useMutation({
    mutationFn: async ({ url, name }: { url: string; name: string }) => {
      return apiRequest("POST", "/api/sources/google-sheet", { url, name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sources"] });
      form.reset();
      setIsDialogOpen(false);
      toast({ title: "Source added", description: "Google Sheet imported successfully." });
    },
    onError: () => {
      toast({ title: "Import failed", description: "Could not import Google Sheet. Make sure it's publicly accessible.", variant: "destructive" });
    },
  });

  const templateMutation = useMutation({
    mutationFn: async (url: string) => {
      return apiRequest("POST", "/api/sources/google-sheet", { url, name: "Transaction Record" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sources"] });
      setIsTemplateDialogOpen(false);
      setTemplateSheetUrl("");
      toast({ title: "Transaction Record added", description: "Google Sheet template imported successfully. Auto-sync every 1 minute is active." });
    },
    onError: () => {
      toast({ title: "Import failed", description: "Could not import Google Sheet. Make sure you've copied the template and set sharing to 'Anyone with the link can view'.", variant: "destructive" });
    },
  });

  const TEMPLATE_URL = "https://docs.google.com/spreadsheets/d/1uaFvALDJH3VZR7hGXuxD5rRM-Dd7R7kfcEwyd90bmtc/edit?usp=drivesdk";
  const hasTransactionRecord = sources?.some(s => s.sourceSubtype === "google_sheet" && s.name === "Transaction Record");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onSubmit = (data: SourceFormData) => {
    if (data.type === "file" && selectedFile) {
      uploadFileMutation.mutate({ file: selectedFile, name: data.name || selectedFile.name.replace(/\.[^/.]+$/, "") });
    } else if (data.type === "google-doc" && data.url) {
      googleDocMutation.mutate({ url: data.url, name: data.name || "Google Doc" });
    } else if (data.type === "google-sheet" && data.url) {
      googleSheetMutation.mutate({ url: data.url, name: data.name || "Google Sheet" });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setUploadedFileName(file.name);
    form.setValue("name", file.name.replace(/\.[^/.]+$/, ""));
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      form.reset();
      setUploadedFileName("");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const isSubmitting = createMutation.isPending || uploadFileMutation.isPending || googleDocMutation.isPending || googleSheetMutation.isPending;

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

  const getSourceIcon = (source: Source) => {
    if (source.sourceSubtype === "google_sheet") return Table2;
    switch (source.type) {
      case "file": return FileText;
      case "text": return Type;
      case "website": return Globe;
      default: return FileText;
    }
  };

  const refreshSourceMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/sources/${id}/update`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sources"] });
      toast({
        title: "Source updated",
        description: "Source content has been refreshed.",
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Could not refresh source content.",
        variant: "destructive",
      });
    },
  });

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
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-source">
              <Plus className="w-4 h-4 mr-2" />
              Add Source
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("dashboard.sources.addSource")}</DialogTitle>
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
                      <FormLabel>{t("dashboard.sources.sourceType")}</FormLabel>
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
                              Document (PDF/Word/Excel/TXT)
                            </div>
                          </SelectItem>
                          <SelectItem value="website">
                            <div className="flex items-center gap-2">
                              <Globe className="w-4 h-4" />
                              Website Link
                            </div>
                          </SelectItem>
                          <SelectItem value="google-doc">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              Google Docs
                            </div>
                          </SelectItem>
                          <SelectItem value="google-sheet">
                            <div className="flex items-center gap-2">
                              <Table2 className="w-4 h-4" />
                              Google Sheets
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
                {form.watch("type") === "website" && (
                  <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("dashboard.sources.websiteUrl")}</FormLabel>
                        <FormControl>
                          <Input 
                            type="url"
                            placeholder="https://example.com/faq" 
                            data-testid="input-source-url" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          We'll crawl this page and extract content.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {form.watch("type") === "text" && (
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter your knowledge content here...&#10;&#10;Example:&#10;Q: What are your business hours?&#10;A: We are open Monday to Friday, 9am to 5pm."
                            className="min-h-[150px]"
                            data-testid="input-source-content"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {form.watch("type") === "file" && (
                  <FormItem>
                    <FormLabel>Upload Document</FormLabel>
                    <div className="space-y-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.xlsx,.xls,.txt,.md,.csv,.json,.xml,.html"
                        onChange={handleFileUpload}
                        className="hidden"
                        data-testid="input-file-upload"
                      />
                      <div 
                        className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {isUploadingFile ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Processing file...</p>
                          </div>
                        ) : uploadedFileName ? (
                          <div className="flex flex-col items-center gap-2">
                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                            <p className="text-sm font-medium">{uploadedFileName}</p>
                            <p className="text-xs text-muted-foreground">Click to upload a different file</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Upload className="w-8 h-8 text-muted-foreground" />
                            <p className="text-sm font-medium">Click to upload a file</p>
                            <p className="text-xs text-muted-foreground">PDF, Word (.docx), Excel (.xlsx), TXT, MD, CSV</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </FormItem>
                )}

                {(form.watch("type") === "google-doc" || form.watch("type") === "google-sheet") && (
                  <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {form.watch("type") === "google-doc" ? "Google Docs URL" : "Google Sheets URL"}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="url"
                            placeholder={form.watch("type") === "google-doc" 
                              ? "https://docs.google.com/document/d/..." 
                              : "https://docs.google.com/spreadsheets/d/..."}
                            data-testid="input-google-url" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Document must be publicly accessible (set sharing to "Anyone with the link can view")
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || (form.watch("type") === "file" && !uploadedFileName) || ((form.watch("type") === "google-doc" || form.watch("type") === "google-sheet") && !form.watch("url"))}
                    data-testid="button-submit-source"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {uploadFileMutation.isPending ? "Uploading..." : "Adding..."}
                      </>
                    ) : (
                      "Add Source"
                    )}
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
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("dashboard.sources.title")}</CardTitle>
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

      {!hasTransactionRecord && (
        <Card className="border-primary/20" data-testid="card-transaction-template">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Table2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Transaction Record Template</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Track customer transactions with auto-sync every 1 minute. AI will automatically verify transaction status when customers ask.
                  </p>
                  <div className="flex items-center gap-1 mt-2 overflow-x-auto">
                    {["Username", "Amount", "Status", "Date", "Time"].map((col) => (
                      <Badge key={col} variant="secondary" className="text-xs shrink-0">{col}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                className="shrink-0"
                onClick={() => setIsTemplateDialogOpen(true)}
                data-testid="button-use-template"
              >
                <Copy className="w-4 h-4 mr-2" />
                Use this template
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isTemplateDialogOpen} onOpenChange={(open) => { setIsTemplateDialogOpen(open); if (!open) setTemplateSheetUrl(""); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Use Transaction Record Template</DialogTitle>
            <DialogDescription>
              Copy the template to your Google Drive, then paste your new sheet URL below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="rounded-full w-6 h-6 flex items-center justify-center p-0 shrink-0">1</Badge>
                <span className="text-sm font-medium">Open & copy the template</span>
              </div>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.open(TEMPLATE_URL, "_blank")}
                data-testid="button-open-template"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Template in Google Sheets
              </Button>
              <p className="text-xs text-muted-foreground pl-8">
                After opening, go to <strong>File &gt; Make a copy</strong> to save it to your Google Drive.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="rounded-full w-6 h-6 flex items-center justify-center p-0 shrink-0">2</Badge>
                <span className="text-sm font-medium">Set sharing to public</span>
              </div>
              <p className="text-xs text-muted-foreground pl-8">
                In your copied sheet, click <strong>Share &gt; Anyone with the link &gt; Viewer</strong>.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="rounded-full w-6 h-6 flex items-center justify-center p-0 shrink-0">3</Badge>
                <span className="text-sm font-medium">Paste your sheet URL</span>
              </div>
              <Input
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={templateSheetUrl}
                onChange={(e) => setTemplateSheetUrl(e.target.value)}
                data-testid="input-template-url"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setIsTemplateDialogOpen(false); setTemplateSheetUrl(""); }}>
              Cancel
            </Button>
            <Button
              onClick={() => templateMutation.mutate(templateSheetUrl)}
              disabled={!templateSheetUrl.includes("docs.google.com/spreadsheets") || templateMutation.isPending}
              data-testid="button-add-template"
            >
              {templateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add as Source"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                const Icon = getSourceIcon(source);
                const isGoogleSheet = source.sourceSubtype === "google_sheet";
                const canRefresh = source.type === "website" || isGoogleSheet;
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
                          <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
                            <Badge variant="secondary" className="text-xs">
                              {isGoogleSheet ? "Google Sheet" : source.type}
                            </Badge>
                            {isGoogleSheet && (
                              <Badge variant="outline" className="text-xs" data-testid={`badge-autosync-${source.id}`}>
                                Auto-sync every 1 min
                              </Badge>
                            )}
                            <span>{(source.charCount || 0).toLocaleString()} chars</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {canRefresh && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => refreshSourceMutation.mutate(source.id)}
                            disabled={refreshSourceMutation.isPending}
                            data-testid={`button-refresh-source-${source.id}`}
                          >
                            <RefreshCw className={`w-4 h-4 ${refreshSourceMutation.isPending ? "animate-spin" : ""}`} />
                          </Button>
                        )}
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
