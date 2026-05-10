import { useLanguage } from "@/hooks/use-language";
import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isPlanLimitError } from "@/lib/planLimitUtils";
import transactionBannerPath from "@assets/generated_images/transaction_record_banner.png";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Database, Save, Globe, Loader2, Plus, Bot, Trash2, ExternalLink, Check, X, RefreshCw, Copy, ChevronDown, ChevronRight, Sparkles, HelpCircle, Edit2, GripVertical, MessageSquare, Lock, Crown, BookOpen, Eye, Search, Filter, FileText, Tag, Clock, Upload, CheckCircle2, Type, Table2, Zap, Pencil, Link2, Unlink, Power, Brain } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { SiGooglesheets } from "react-icons/si";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Inbox as InboxIcon } from "lucide-react";
import type { Merchant, CrawledLink, Agent, SuggestedQuestion, KnowledgebaseArticle, Source, KnowledgeEntry, PasswordRecoveryRequest } from "@shared/schema";
import { subscriptionPlans, type SubscriptionPlanId } from "@shared/schema";
import { PlanLimitPopup } from "@/components/plan-limit-popup";

// Business type and category constants for Help Articles
const BUSINESS_TYPES = [
  { value: "retail_physical", label: "Retail - Physical Products" },
  { value: "retail_digital", label: "Retail - Digital Products" },
  { value: "company_profile", label: "Company/Service Profile" },
];

const RETAIL_PHYSICAL_CATEGORIES = [
  { value: "fashion", label: "Fashion & Apparel" },
  { value: "electronics", label: "Electronics & Gadgets" },
  { value: "food_beverage", label: "Food & Beverage" },
  { value: "health_beauty", label: "Health & Beauty" },
  { value: "home_furniture", label: "Home & Furniture" },
  { value: "sports_outdoor", label: "Sports & Outdoor" },
  { value: "toys_games", label: "Toys & Games" },
  { value: "jewelry_watches", label: "Jewelry & Watches" },
  { value: "automotive", label: "Automotive & Parts" },
  { value: "pet_supplies", label: "Pet Supplies" },
];

const RETAIL_DIGITAL_CATEGORIES = [
  { value: "software", label: "Software & SaaS" },
  { value: "ebooks_courses", label: "E-books & Online Courses" },
  { value: "gaming", label: "Games & Digital Entertainment" },
  { value: "streaming", label: "Streaming & Media" },
  { value: "photography", label: "Digital Photos & Graphics" },
  { value: "music_audio", label: "Music & Audio" },
];

const COMPANY_CATEGORIES = [
  { value: "architect", label: "Architect & Design Firm" },
  { value: "banking_finance", label: "Banking & Financial Services" },
  { value: "consulting", label: "Consulting Firm" },
  { value: "dental_clinic", label: "Dental Clinic" },
  { value: "education", label: "Educational Institution" },
  { value: "fitness_gym", label: "Fitness & Gym" },
  { value: "government", label: "Government Agency" },
  { value: "hotel_resort", label: "Hotel & Resort" },
  { value: "insurance", label: "Insurance Company" },
  { value: "jewelry_store", label: "Jewelry Store" },
  { value: "kitchen_catering", label: "Kitchen & Catering" },
  { value: "legal_law", label: "Law Firm" },
  { value: "medical_hospital", label: "Medical & Hospital" },
  { value: "ngo_nonprofit", label: "NGO & Nonprofit" },
  { value: "optical_eyecare", label: "Optical & Eye Care" },
  { value: "photography_studio", label: "Photography Studio" },
  { value: "quality_testing", label: "Quality & Testing Lab" },
  { value: "real_estate", label: "Real Estate Agency" },
  { value: "salon_spa", label: "Salon & Spa" },
  { value: "travel_agency", label: "Travel Agency" },
  { value: "university", label: "University" },
  { value: "veterinary", label: "Veterinary Clinic" },
  { value: "warehouse_logistics", label: "Warehouse & Logistics" },
  { value: "xray_diagnostic", label: "X-Ray & Diagnostic Center" },
  { value: "yoga_wellness", label: "Yoga & Wellness" },
  { value: "zoo_wildlife", label: "Zoo & Wildlife Park" },
];

function getCategoriesForBusinessType(businessType: string) {
  switch (businessType) {
    case "retail_physical":
      return RETAIL_PHYSICAL_CATEGORIES;
    case "retail_digital":
      return RETAIL_DIGITAL_CATEGORIES;
    case "company_profile":
      return COMPANY_CATEGORIES;
    default:
      return [];
  }
}

function getCategoryLabel(businessType: string, category: string) {
  const categories = getCategoriesForBusinessType(businessType);
  const found = categories.find(c => c.value === category);
  return found?.label || category;
}

function getBusinessTypeLabel(businessType: string) {
  const found = BUSINESS_TYPES.find(t => t.value === businessType);
  return found?.label || businessType;
}

function SourceNameEditor({ sourceId, name, onSave }: { sourceId: string; name: string; onSave: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setValue(name); }, [name]);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  const handleSave = () => {
    setEditing(false);
    const trimmed = value.trim();
    if (trimmed && trimmed !== name) {
      onSave(trimmed);
    } else {
      setValue(name);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") { setValue(name); setEditing(false); } }}
        className="text-sm font-semibold bg-transparent border-b outline-none w-full"
        style={{ color: "white", borderColor: "#6366f1" }}
        data-testid={`input-source-name-${sourceId}`}
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex items-center gap-1 text-sm font-semibold truncate text-left hover:opacity-80 cursor-pointer bg-transparent border-none p-0"
      style={{ color: "white" }}
      title="Click to edit name"
      data-testid={`button-edit-name-${sourceId}`}
    >
      <span className="truncate">{name}</span>
      <Pencil className="w-3 h-3 shrink-0 opacity-50" />
    </button>
  );
}

type SaveStage = "saving" | "learning" | "thinking" | "done" | null;

function SaveButtonContent({ stage }: { stage: SaveStage }) {
  if (stage === "saving") {
    return (
      <>
        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
        Saving...
      </>
    );
  }
  if (stage === "learning") {
    return (
      <>
        <Brain className="w-4 h-4 mr-1 animate-pulse" />
        AI Learning...
      </>
    );
  }
  if (stage === "thinking") {
    return (
      <>
        <Sparkles className="w-4 h-4 mr-1 animate-spin" />
        AI Thinking...
      </>
    );
  }
  if (stage === "done") {
    return (
      <>
        <CheckCircle2 className="w-4 h-4 mr-1 text-green-500" />
        Done
      </>
    );
  }
  return (
    <>
      <Save className="w-4 h-4 mr-1" />
      Save
    </>
  );
}

interface SortableEntryCardProps {
  entry: KnowledgeEntry;
  localContent: string;
  localName: string;
  isSaving: boolean;
  currentStage: SaveStage;
  hasChanges: boolean;
  onNameChange: (val: string) => void;
  onContentChange: (val: string) => void;
  onSave: () => void;
  onDelete: () => void;
  onToggleActive: (checked: boolean) => void;
  onToggleLink: () => void;
  onCheckClarity: () => void;
}

function SortableEntryCard({
  entry, localContent, localName, isSaving, currentStage, hasChanges,
  onNameChange, onContentChange, onSave, onDelete, onToggleActive, onToggleLink, onCheckClarity,
}: SortableEntryCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Collapsible defaultOpen={true} asChild>
        <Card className={`transition-opacity ${!entry.isActive ? "opacity-60" : ""} flex flex-col`} data-testid={`card-entry-${entry.id}`}>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 cursor-pointer group px-3 pt-3">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing shrink-0 touch-none"
                    onClick={(e) => e.stopPropagation()}
                    data-testid={`drag-handle-${entry.id}`}
                  >
                    <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90 sm:hidden" />
                  <Input
                    value={localName}
                    onChange={(e) => onNameChange(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="font-medium border-none shadow-none focus-visible:ring-1 h-7 text-xs sm:text-sm"
                    data-testid={`input-entry-name-${entry.id}`}
                  />
                </div>
                <div className="flex items-center justify-between gap-1" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1 flex-wrap">
                    <Badge variant="outline" className="text-[9px] gap-0.5 px-1.5 py-0 text-primary border-primary/30">
                      <Database className="w-2.5 h-2.5" />
                      Training Data
                    </Badge>
                    {entry.isLinked && (
                      <Badge variant="secondary" className="text-[9px] gap-0.5 px-1.5 py-0">
                        <Link2 className="w-2.5 h-2.5" />
                        All Agents
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={onToggleLink}
                      title={entry.isLinked ? "Unlink from all agents (make agent-specific)" : "Link to all agents (share across all)"}
                      data-testid={`button-toggle-link-${entry.id}`}
                    >
                      {entry.isLinked ? <Link2 className="w-3 h-3 text-primary" /> : <Unlink className="w-3 h-3 text-muted-foreground" />}
                    </Button>
                    <div className="flex items-center gap-1">
                      <Switch
                        checked={entry.isActive}
                        onCheckedChange={onToggleActive}
                        className="h-4 w-7 [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-3"
                        data-testid={`switch-entry-active-${entry.id}`}
                      />
                      <span className="text-[10px] text-muted-foreground">{entry.isActive ? "Active" : "Off"}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => { e.stopPropagation(); onCheckClarity(); }}
                    title="Check clarity of this entry"
                    data-testid={`button-check-clarity-${entry.id}`}
                  >
                    <Sparkles className="w-3 h-3 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={onDelete}
                    data-testid={`button-delete-entry-${entry.id}`}
                  >
                    <Trash2 className="w-3 h-3 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <Textarea
                placeholder="Enter knowledge content for this entry..."
                value={localContent}
                onChange={(e) => onContentChange(e.target.value)}
                className="min-h-[300px] resize-none text-xs sm:text-sm"
                disabled={!entry.isActive || isSaving}
                data-testid={`textarea-entry-content-${entry.id}`}
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">
                  {localContent.length} characters
                </p>
                <Button
                  size="sm"
                  onClick={onSave}
                  disabled={isSaving || !hasChanges}
                  data-testid={`button-save-entry-${entry.id}`}
                >
                  <SaveButtonContent stage={currentStage} />
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}

export default function KnowledgePage() {
  const { t } = useLanguage();
  const merchantId = localStorage.getItem("merchantId") || "";
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [crawlUrl, setCrawlUrl] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedImportAgent, setSelectedImportAgent] = useState<string | null>(null);
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<SuggestedQuestion | null>(null);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  
  // Help Articles state
  const [activeTab, setActiveTab] = useState("training");
  const [articleSearchQuery, setArticleSearchQuery] = useState("");
  const [articleStatusFilter, setArticleStatusFilter] = useState<string>("all");
  
  // Knowledge Template state
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [templateCategory, setTemplateCategory] = useState<string>("all");
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [templateApplyMode, setTemplateApplyMode] = useState<"replace" | "append">("replace");
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  
  // AI Analysis state for knowledge content
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [saveStage, setSaveStage] = useState<"idle" | "reading" | "learning" | "thinking">("idle");
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<{
    hasIssues: boolean;
    anomalies: string[];
    simplifications: { original: string; simplified: string }[];
    improvements: string[];
  } | null>(null);
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<KnowledgebaseArticle | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  
  // Sources state
  const [showLimitPopup, setShowLimitPopup] = useState(false);
  const [isSourceDialogOpen, setIsSourceDialogOpen] = useState(false);
  const [isTransactionTemplateOpen, setIsTransactionTemplateOpen] = useState(false);
  const [transactionTemplateUrl, setTransactionTemplateUrl] = useState("");

  // Password Recovery state
  const [prSheetUrl, setPrSheetUrl] = useState("");
  const [prWriteBackUrl, setPrWriteBackUrl] = useState("");
  const [prEnabled, setPrEnabled] = useState(false);
  const [prInstructions, setPrInstructions] = useState("");
  const [prFormIntroText, setPrFormIntroText] = useState("");
  const [prTestResult, setPrTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [prIsTesting, setPrIsTesting] = useState(false);
  const [prIsSaving, setPrIsSaving] = useState(false);
  const [prIsFetching, setPrIsFetching] = useState(false);
  const [prDeleteDialogOpen, setPrDeleteDialogOpen] = useState(false);
  const [prAdvancedOpen, setPrAdvancedOpen] = useState(false);
  const [prMessagesOpen, setPrMessagesOpen] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // File preview confirmation state
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [filePreview, setFilePreview] = useState<{
    fileName: string;
    fileSize: number;
    content: string;
    url?: string;
    type: string;
    metadata: {
      pageCount?: number;
      sheetCount?: number;
      wordCount?: number;
      charCount?: number;
      lineCount?: number;
      fileType?: string;
      summary?: string;
    };
  } | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  
  const sourceSchema = z.object({
    type: z.enum(["file", "text", "website", "google-doc", "google-sheet"]),
    name: z.string().min(1, "Name is required"),
    content: z.string().optional(),
    url: z.string().url().optional().or(z.literal("")),
  });
  
  const sourceForm = useForm<z.infer<typeof sourceSchema>>({
    resolver: zodResolver(sourceSchema),
    defaultValues: { type: "text", name: "", content: "", url: "" },
  });
  
  const [generateForm, setGenerateForm] = useState({
    businessType: "",
    category: "",
    topic: "",
    businessInfo: "",
  });
  const [editorForm, setEditorForm] = useState({
    title: "",
    content: "",
    tags: [] as string[],
    category: "",
    status: "draft",
    businessType: "",
    businessCategory: "",
  });
  const [newTag, setNewTag] = useState("");

  const { data: agents } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const { data: merchant } = useQuery<Merchant>({
    queryKey: ["/api/merchant", merchantId],
    enabled: !!merchantId,
  });

  const { data: suggestedQuestions = [] } = useQuery<SuggestedQuestion[]>({
    queryKey: ["/api/suggested-questions"],
    enabled: !!merchantId,
  });

  const plan = merchant ? subscriptionPlans[merchant.subscriptionPlanId as SubscriptionPlanId] || subscriptionPlans.free : subscriptionPlans.free;
  // Use custom limits for custom plan, otherwise use base plan limits
  const sourcesLimit = merchant?.subscriptionPlanId === 'custom' && merchant.customSourcesLimit != null
    ? merchant.customSourcesLimit
    : plan.sourcesLimit;
  const effectiveSuggestedQuestionsLimit = merchant?.subscriptionPlanId === 'custom' && (merchant as any).customSuggestedQuestionsLimit !== undefined 
    ? (merchant as any).customSuggestedQuestionsLimit 
    : plan.suggestedQuestionsLimit;
  const isQuestionFeatureAvailable = effectiveSuggestedQuestionsLimit !== 0;
  const questionsLimit = effectiveSuggestedQuestionsLimit === -1 ? Infinity : effectiveSuggestedQuestionsLimit;
  const canAddMoreQuestions = suggestedQuestions.length < questionsLimit;

  // Local state for selecting which agent's knowledge to edit
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  
  // Initialize selectedAgentId from first agent when agents data loads
  useEffect(() => {
    if (agents && agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

  const otherAgents = agents?.filter(a => a.id !== selectedAgentId) || [];
  const selectedAgent = agents?.find(a => a.id === selectedAgentId);
  
  // Handle agent selection change
  const handleAgentSelect = (agentId: string) => {
    setSelectedAgentId(agentId);
    setContent(""); // Clear content when switching agents
    // Reset PR form state so it reloads from the new agent's config
    setPrConfigLoaded(false);
  };

  const { data: knowledge, isLoading } = useQuery<{ content: string }>({
    queryKey: selectedAgentId 
      ? [`/api/knowledge/agent/${selectedAgentId}`]
      : [`/api/knowledge/${merchantId}`],
    enabled: !!merchantId,
  });

  const { data: knowledgeEntries = [], isLoading: entriesLoading } = useQuery<KnowledgeEntry[]>({
    queryKey: ["/api/knowledge-entries", selectedAgentId],
    queryFn: async () => {
      const url = selectedAgentId 
        ? `/api/knowledge-entries?agentId=${selectedAgentId}` 
        : `/api/knowledge-entries`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(t("dashboard.knowledge.fetchFailed"));
      return res.json();
    },
    enabled: !!merchantId && !!selectedAgentId,
  });

  const [entryContents, setEntryContents] = useState<Record<string, string>>({});
  const [entryNames, setEntryNames] = useState<Record<string, string>>({});
  const [savingEntryId, setSavingEntryId] = useState<string | null>(null);
  const [savingStage, setSavingStage] = useState<"saving" | "learning" | "thinking" | "done" | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [newEntryName, setNewEntryName] = useState("");
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [localEntryOrder, setLocalEntryOrder] = useState<string[]>([]);

  // KB Review & Organize state
  type KbSuggestion = {
    sourceEntryId: string;
    sourceEntryName: string;
    targetEntryId: string;
    targetEntryName: string;
    contentSnippet: string;
    reason: string;
  };
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [reviewAnalyzed, setReviewAnalyzed] = useState(false);
  const [reviewSuggestions, setReviewSuggestions] = useState<KbSuggestion[]>([]);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<number>>(new Set());
  const [approveDialog, setApproveDialog] = useState<{ suggestion: KbSuggestion; index: number } | null>(null);
  const [modifyDialog, setModifyDialog] = useState<{ suggestion: KbSuggestion; index: number } | null>(null);
  const [modifyContent, setModifyContent] = useState("");
  const [applyingIndex, setApplyingIndex] = useState<number | null>(null);

  // Clarity Checker state
  type ClarityAmbiguity = { excerpt: string; issue: string; options: string[] };
  type ClaritySuggestion = { excerpt: string; simplified: string };
  const [clarityEntryId, setClarityEntryId] = useState<string | null>(null);
  const [clarityEntryName, setClarityEntryName] = useState<string>("");
  const [isClarityOpen, setIsClarityOpen] = useState(false);
  const [isClarityLoading, setIsClarityLoading] = useState(false);
  const [clarityResult, setClarityResult] = useState<{ hasIssues: boolean; ambiguities: ClarityAmbiguity[]; suggestions: ClaritySuggestion[] } | null>(null);
  const [appliedClarityOptions, setAppliedClarityOptions] = useState<Record<number, string>>({});
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<number>>(new Set());

  const handleOpenClarityCheck = async (entryId: string, entryName: string) => {
    setClarityEntryId(entryId);
    setClarityEntryName(entryName);
    setClarityResult(null);
    setAppliedClarityOptions({});
    setAppliedSuggestions(new Set());
    setIsClarityOpen(true);
    setIsClarityLoading(true);
    try {
      const res = await apiRequest("POST", `/api/knowledge-entries/${entryId}/check-clarity`, {});
      const data = await res.json();
      setClarityResult(data);
    } catch {
      toast({ title: "Clarity check failed", description: t("common.tryAgain"), variant: "destructive" });
      setIsClarityOpen(false);
    } finally {
      setIsClarityLoading(false);
    }
  };

  const handleApplyClarityOption = async (ambiguityIndex: number, option: string, excerpt: string) => {
    if (!clarityEntryId) return;
    const entry = knowledgeEntries.find(e => e.id === clarityEntryId);
    if (!entry) return;
    const currentContent = entryContents[clarityEntryId] ?? entry.content ?? "";
    const newContent = currentContent.includes(excerpt)
      ? currentContent.replace(excerpt, option)
      : currentContent;
    setEntryContents(prev => ({ ...prev, [clarityEntryId]: newContent }));
    setAppliedClarityOptions(prev => ({ ...prev, [ambiguityIndex]: option }));
    await apiRequest("POST", `/api/knowledge-entries/${clarityEntryId}/save`, { content: newContent }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["/api/knowledge-entries", selectedAgentId] });
  };

  const handleApplyClaritySuggestion = async (suggestionIndex: number, simplified: string, excerpt: string) => {
    if (!clarityEntryId) return;
    const entry = knowledgeEntries.find(e => e.id === clarityEntryId);
    if (!entry) return;
    const currentContent = entryContents[clarityEntryId] ?? entry.content ?? "";
    const newContent = currentContent.includes(excerpt)
      ? currentContent.replace(excerpt, simplified)
      : currentContent;
    setEntryContents(prev => ({ ...prev, [clarityEntryId]: newContent }));
    setAppliedSuggestions(prev => new Set([...prev, suggestionIndex]));
    await apiRequest("POST", `/api/knowledge-entries/${clarityEntryId}/save`, { content: newContent }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["/api/knowledge-entries", selectedAgentId] });
  };

  // Search & Replace state
  const [isSearchReplaceOpen, setIsSearchReplaceOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [searchResults, setSearchResults] = useState<{ entryId: string; entryName: string; matchCount: number; contexts: string[] }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false);
  const [selectedReplaceEntries, setSelectedReplaceEntries] = useState<Set<string>>(new Set());
  const [isReplacing, setIsReplacing] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  useEffect(() => {
    if (knowledgeEntries.length > 0) {
      setLocalEntryOrder(knowledgeEntries.map(e => e.id));
    }
  }, [knowledgeEntries]);

  const sortedEntries = localEntryOrder.length > 0
    ? localEntryOrder.map(id => knowledgeEntries.find(e => e.id === id)).filter(Boolean) as typeof knowledgeEntries
    : knowledgeEntries;

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setLocalEntryOrder(prev => {
      const oldIndex = prev.indexOf(active.id as string);
      const newIndex = prev.indexOf(over.id as string);
      const newOrder = arrayMove(prev, oldIndex, newIndex);
      const orders = newOrder.map((id, i) => ({ id, sortOrder: i }));
      apiRequest("POST", "/api/knowledge-entries/reorder", { orders }).catch(() => {
        toast({ title: t("dashboard.knowledge.reorderFailed"), description: t("dashboard.knowledge.reorderFailedDesc"), variant: "destructive" });
      });
      return newOrder;
    });
  }, [toast]);

  useEffect(() => {
    if (knowledgeEntries.length > 0) {
      const contents: Record<string, string> = {};
      const names: Record<string, string> = {};
      knowledgeEntries.forEach(e => {
        if (!(e.id in entryContents)) contents[e.id] = e.content;
        if (!(e.id in entryNames)) names[e.id] = e.name;
      });
      setEntryContents(prev => ({ ...contents, ...prev }));
      setEntryNames(prev => ({ ...names, ...prev }));
    }
  }, [knowledgeEntries]);

  useEffect(() => {
    setEntryContents({});
    setEntryNames({});
    setLocalEntryOrder([]);
  }, [selectedAgentId]);

  const createEntryMutation = useMutation({
    mutationFn: async (data: { name: string; agentId?: string; isLinked?: boolean }) => {
      const res = await apiRequest("POST", "/api/knowledge-entries", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-entries", selectedAgentId] });
      setNewEntryName("");
      setIsAddingEntry(false);
      toast({ title: t("dashboard.knowledge.entryCreated"), description: t("dashboard.knowledge.entryCreatedDesc") });
    },
    onError: () => {
      toast({ title: t("dashboard.knowledge.createFailed"), description: t("common.tryAgain"), variant: "destructive" });
    },
  });

  const saveEntryMutation = useMutation({
    mutationFn: async ({ id, content, name }: { id: string; content?: string; name?: string }) => {
      setSavingEntryId(id);
      setSavingStage("saving");
      const res = await apiRequest("POST", `/api/knowledge-entries/${id}/save`, { content, name });
      return res.json();
    },
    onSuccess: async (_data, _variables) => {
      setSavingStage("learning");
      await new Promise(r => setTimeout(r, 600));

      setSavingStage("done");
      await new Promise(r => setTimeout(r, 600));

      setSavingEntryId(null);
      setSavingStage(null);
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-entries", selectedAgentId] });
      toast({ title: t("dashboard.knowledge.entrySaved"), description: t("dashboard.knowledge.entrySavedDesc") });
    },
    onError: () => {
      setSavingEntryId(null);
      setSavingStage(null);
      toast({ title: t("dashboard.knowledge.saveFailed"), description: t("common.tryAgain"), variant: "destructive" });
    },
  });

  const toggleEntryActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/knowledge-entries/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-entries", selectedAgentId] });
    },
    onError: () => {
      toast({ title: t("dashboard.knowledge.updateFailed"), variant: "destructive" });
    },
  });

  const toggleEntryLinkMutation = useMutation({
    mutationFn: async ({ id, agentId }: { id: string; agentId?: string }) => {
      const res = await apiRequest("POST", `/api/knowledge-entries/${id}/toggle-link`, { agentId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-entries", selectedAgentId] });
      toast({ title: t("dashboard.knowledge.linkStatusUpdated"), description: t("dashboard.knowledge.linkStatusUpdatedDesc") });
    },
    onError: () => {
      toast({ title: t("common.updateFailed"), variant: "destructive" });
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/knowledge-entries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-entries", selectedAgentId] });
      setDeleteConfirmId(null);
      toast({ title: t("dashboard.knowledge.entryDeleted"), description: "Knowledge entry has been removed." });
    },
    onError: () => {
      toast({ title: t("common.deleteFailed"), variant: "destructive" });
    },
  });

  const handleRunReview = async () => {
    setIsReviewLoading(true);
    setReviewSuggestions([]);
    setDismissedSuggestions(new Set());
    setReviewAnalyzed(false);
    try {
      const res = await apiRequest("POST", "/api/knowledge/review-duplicates", { agentId: selectedAgentId });
      const data = await res.json();
      setReviewSuggestions(data.suggestions || []);
      setReviewAnalyzed(true);
    } catch {
      toast({ title: t("dashboard.knowledge.reviewFailed"), description: t("dashboard.knowledge.reviewFailedDesc"), variant: "destructive" });
    } finally {
      setIsReviewLoading(false);
    }
  };

  const handleApplySuggestion = async (suggestion: KbSuggestion, index: number, snippetOverride?: string) => {
    setApplyingIndex(index);
    try {
      await apiRequest("POST", "/api/knowledge/apply-suggestion", {
        sourceEntryId: suggestion.sourceEntryId,
        targetEntryId: suggestion.targetEntryId,
        contentSnippet: snippetOverride ?? suggestion.contentSnippet,
        originalSnippet: suggestion.contentSnippet,
      });
      setDismissedSuggestions(prev => new Set([...prev, index]));
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-entries", selectedAgentId] });
      toast({ title: t("dashboard.knowledge.contentMoved"), description: `Moved to "${suggestion.targetEntryName}" successfully.` });
    } catch {
      toast({ title: t("dashboard.knowledge.applyFailed"), description: t("dashboard.knowledge.moveFailedDesc"), variant: "destructive" });
    } finally {
      setApplyingIndex(null);
      setApproveDialog(null);
      setModifyDialog(null);
    }
  };

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (value: string) => {
    setSearchText(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!value.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await apiRequest("POST", "/api/knowledge/search-replace", { searchText: value, replaceText: "", agentId: selectedAgentId });
        const data = await res.json();
        setSearchResults(data.results || []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  const handleReplaceAll = async () => {
    const entryIds = selectedReplaceEntries.size > 0
      ? Array.from(selectedReplaceEntries)
      : searchResults.map(r => r.entryId);
    setIsReplacing(true);
    try {
      await apiRequest("POST", "/api/knowledge/search-replace", {
        searchText,
        replaceText,
        entryIds,
        agentId: selectedAgentId,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-entries", selectedAgentId] });
      const totalMatches = searchResults.filter(r => entryIds.includes(r.entryId)).reduce((sum, r) => sum + r.matchCount, 0);
      toast({ title: t("dashboard.knowledge.replacementComplete"), description: `Replaced ${totalMatches} occurrence${totalMatches !== 1 ? "s" : ""} across ${entryIds.length} entr${entryIds.length !== 1 ? "ies" : "y"}.` });
      setSearchText("");
      setReplaceText("");
      setSearchResults([]);
      setSelectedReplaceEntries(new Set());
      setReplaceConfirmOpen(false);
      setIsSearchReplaceOpen(false);
    } catch {
      toast({ title: t("dashboard.knowledge.replaceFailed"), description: t("dashboard.knowledge.replaceFailedDesc"), variant: "destructive" });
    } finally {
      setIsReplacing(false);
    }
  };

  const { data: crawledLinks = [], isLoading: linksLoading } = useQuery<CrawledLink[]>({
    queryKey: ["/api/knowledge/links", merchantId],
    enabled: !!merchantId,
  });

  // Sources query
  const { data: sources = [], isLoading: sourcesLoading } = useQuery<Source[]>({
    queryKey: ["/api/sources"],
    enabled: !!merchantId,
    refetchInterval: 5000,
  });

  // Password Recovery config query — scoped to the selected agent
  const prConfigUrl = selectedAgentId
    ? `/api/merchant/password-recovery-config?agentId=${selectedAgentId}`
    : `/api/merchant/password-recovery-config`;
  const { data: prConfig } = useQuery<{ id: string; sheetCsvUrl: string; writeBackUrl?: string; isActive: boolean; aiInstructions?: string; formIntroText?: string; lastSyncedAt?: string } | null>({
    queryKey: ["/api/merchant/password-recovery-config", selectedAgentId],
    queryFn: async () => {
      const res = await fetch(prConfigUrl, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!merchantId,
  });

  // Password Recovery request history — auto-refreshes every 10s while on the sources tab
  const { data: prRequests = [], isLoading: prRequestsLoading, isError: prRequestsError } = useQuery<PasswordRecoveryRequest[]>({
    queryKey: ["/api/merchant/password-recovery-requests/list"],
    queryFn: async () => {
      const res = await fetch("/api/merchant/password-recovery-requests/list", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch password recovery requests");
      return res.json();
    },
    enabled: !!merchantId && activeTab === "sources",
    refetchInterval: activeTab === "sources" ? 10000 : false,
  });

  // Sync PR config to local state when fetched (only if user hasn't started editing)
  const [prConfigLoaded, setPrConfigLoaded] = useState(false);
  useEffect(() => {
    if (prConfigLoaded) return;
    if (prConfig === undefined) return; // Still loading — wait
    if (prConfig) {
      setPrSheetUrl(prConfig.sheetCsvUrl || "");
      setPrWriteBackUrl(prConfig.writeBackUrl || "");
      setPrEnabled(prConfig.isActive || false);
      setPrInstructions(prConfig.aiInstructions || "");
      setPrFormIntroText(prConfig.formIntroText || "");
    } else {
      // Agent has no config — clear fields so previous agent's values don't persist
      setPrSheetUrl("");
      setPrWriteBackUrl("");
      setPrEnabled(false);
      setPrInstructions("");
      setPrFormIntroText("");
    }
    setPrConfigLoaded(true);
  }, [prConfig, prConfigLoaded]);

  // Whether the Reset Password sheet is "connected" — used to swap the
  // Step 2 placeholder skeleton for a Google Sheets logo.
  const isSheetConnected =
    prTestResult?.success === true ||
    (!!prConfig?.sheetCsvUrl && !!prConfig?.lastSyncedAt && prSheetUrl === prConfig.sheetCsvUrl);

  // Help Articles queries
  const { data: articles = [], isLoading: articlesLoading } = useQuery<KnowledgebaseArticle[]>({
    queryKey: ["/api/knowledgebase/articles", articleStatusFilter !== "all" ? articleStatusFilter : undefined],
    enabled: !!merchantId,
  });

  // Knowledge Templates query (for merchants)
  const { data: knowledgeTemplates = [], isLoading: templatesLoading, isError: templatesError } = useQuery<any[]>({
    queryKey: ["/api/knowledge-templates"],
    enabled: !!merchantId && isTemplateDialogOpen,
    retry: 2,
    staleTime: 60000,
  });
  
  // Apply template mutation
  const applyTemplateMutation = useMutation({
    mutationFn: async ({ templateId, agentId, mode }: { templateId: string; agentId?: string; mode: "replace" | "append" }) => {
      const response = await apiRequest("POST", `/api/knowledge-templates/${templateId}/apply`, {
        agentId,
        mode,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/knowledge/agent/${selectedAgentId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/knowledge/${merchantId}`] });
      setIsConfirmDialogOpen(false);
      setSelectedTemplate(null);
      setIsTemplateDialogOpen(false);
      toast({
        title: t("dashboard.knowledge.templateApplied"),
        description: templateApplyMode === "append" ? "Template successfully added to knowledge base" : "Knowledge base successfully updated with template",
      });
    },
    onError: (error: any) => {
      toast({
        title: t("dashboard.knowledge.templateFailed"),
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (data: { businessType: string; category: string; topic?: string; businessInfo?: string }): Promise<{ article: KnowledgebaseArticle; suggestedTopics: string[] }> => {
      const response = await apiRequest("POST", "/api/knowledgebase/generate", data);
      return response.json();
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledgebase/articles"] });
      setIsGenerateOpen(false);
      setGenerateForm({ businessType: "", category: "", topic: "", businessInfo: "" });
      toast({
        title: t("dashboard.knowledge.articleGenerated"),
        description: t("dashboard.knowledge.articleCreatedDesc"),
      });
      setSelectedArticle(response.article);
      setEditorForm({
        title: response.article.title,
        content: response.article.content,
        tags: response.article.tags || [],
        category: response.article.category || "",
        status: response.article.status || "draft",
        businessType: response.article.businessType || "",
        businessCategory: response.article.businessCategory || "",
      });
      setIsEditorOpen(true);
    },
    retry: 2,
    onError: (error: any) => {
      toast({
        title: t("common.generationFailed"),
        description: error?.message || "Failed to generate article. Please try again.",
        variant: "destructive",
      });
    },
  });

  const saveArticleMutation = useMutation({
    mutationFn: async (data: Partial<KnowledgebaseArticle>) => {
      if (selectedArticle) {
        return apiRequest("PUT", `/api/knowledgebase/articles/${selectedArticle.id}`, data);
      } else {
        return apiRequest("POST", "/api/knowledgebase/articles", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledgebase/articles"] });
      setIsEditorOpen(false);
      setSelectedArticle(null);
      toast({
        title: t("dashboard.knowledge.articleSaved"),
        description: t("dashboard.knowledge.articleSavedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("dashboard.knowledge.saveFailed"),
        description: t("dashboard.knowledge.articleSaveFailedDesc"),
        variant: "destructive",
      });
    },
  });

  const deleteArticleMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/knowledgebase/articles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledgebase/articles"] });
      toast({
        title: t("dashboard.knowledge.articleDeleted"),
        description: t("dashboard.knowledge.articleDeletedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("common.deleteFailed"),
        description: t("dashboard.knowledge.articleDeleteFailedDesc"),
        variant: "destructive",
      });
    },
  });

  // Source mutations
  const createSourceMutation = useMutation({
    mutationFn: async (data: { type: string; name: string; content?: string; url?: string }) => {
      return apiRequest("POST", "/api/sources", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sources"] });
      toast({ title: t("dashboard.knowledge.sourceAdded"), description: t("dashboard.knowledge.sourceAddedDesc") });
      setIsSourceDialogOpen(false);
      sourceForm.reset();
      setUploadedFileName("");
      setSelectedFile(null);
    },
    onError: (error: any) => {
      if (isPlanLimitError(error)) {
        setIsSourceDialogOpen(false);
        setShowLimitPopup(true);
        return;
      }
      toast({ title: t("common.error"), description: error.message || "Failed to add source.", variant: "destructive" });
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/sources/upload", { method: "POST", body: formData, credentials: "include" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const err = Object.assign(
          new Error(body.message || body.error || "Upload failed"),
          {
            requiresUpgrade: body.requiresUpgrade === true,
            ...(body.limit !== undefined ? { limit: body.limit as number } : {}),
          }
        );
        throw err;
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sources"] });
      toast({ title: t("dashboard.knowledge.fileUploaded"), description: t("dashboard.knowledge.fileUploadedDesc") });
      setIsSourceDialogOpen(false);
      sourceForm.reset();
      setUploadedFileName("");
      setSelectedFile(null);
    },
    onError: (error: any) => {
      if (isPlanLimitError(error)) {
        setIsSourceDialogOpen(false);
        setShowLimitPopup(true);
        return;
      }
      toast({ title: t("common.uploadFailed"), description: error.message || "Failed to upload file.", variant: "destructive" });
    },
  });

  const googleDocMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", "/api/sources/google-doc", { url });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sources"] });
      toast({ title: t("dashboard.knowledge.docImported"), description: t("dashboard.knowledge.docImportedDesc") });
      setIsSourceDialogOpen(false);
      sourceForm.reset();
    },
    onError: (error: any) => {
      if (isPlanLimitError(error)) {
        setIsSourceDialogOpen(false);
        setShowLimitPopup(true);
        return;
      }
      toast({ title: t("dashboard.knowledge.importFailed"), description: error.message || "Failed to import Google Doc.", variant: "destructive" });
    },
  });

  const googleSheetMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", "/api/sources/google-sheet", { url });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sources"] });
      toast({ title: t("dashboard.knowledge.sheetImported"), description: t("dashboard.knowledge.sheetImportedDesc") });
      setIsSourceDialogOpen(false);
      sourceForm.reset();
    },
    onError: (error: any) => {
      if (isPlanLimitError(error)) {
        setIsSourceDialogOpen(false);
        setShowLimitPopup(true);
        return;
      }
      toast({ title: t("dashboard.knowledge.importFailed"), description: error.message || "Failed to import Google Sheet.", variant: "destructive" });
    },
  });

  const transactionTemplateMutation = useMutation({
    mutationFn: async (url: string) => {
      return apiRequest("POST", "/api/sources/google-sheet", { url, name: "Transaction Record" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sources"] });
      setIsTransactionTemplateOpen(false);
      setTransactionTemplateUrl("");
      toast({ title: t("dashboard.knowledge.transactionAdded"), description: "Google Sheet template imported. Auto-sync every 1 minute is active." });
    },
    onError: (error: any) => {
      if (isPlanLimitError(error)) {
        setIsTransactionTemplateOpen(false);
        setShowLimitPopup(true);
        return;
      }
      toast({ title: t("dashboard.knowledge.importFailed"), description: "Could not import Google Sheet. Make sure you've copied the template and set sharing to 'Anyone with the link can view'.", variant: "destructive" });
    },
  });

  const TRANSACTION_TEMPLATE_URL = "https://docs.google.com/spreadsheets/d/1uaFvALDJH3VZR7hGXuxD5rRM-Dd7R7kfcEwyd90bmtc/edit?usp=drivesdk";
  const hasTransactionRecord = sources.some(s => s.sourceSubtype === "google_sheet" && s.name === "Transaction Record");

  const toggleSourceMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PUT", `/api/sources/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sources"] });
      toast({ title: t("dashboard.knowledge.sourceUpdated"), description: t("dashboard.knowledge.sourceUpdatedDesc") });
    },
    onError: (error: any) => {
      toast({ title: t("dashboard.knowledge.updateFailed"), description: error.message || "Could not update source. Please try again.", variant: "destructive" });
    },
  });

  const deleteSourceMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/sources/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sources"] });
      toast({ title: t("dashboard.knowledge.sourceDeleted"), description: t("dashboard.knowledge.sourceDeletedDesc") });
    },
    onError: (error: any) => {
      toast({ title: t("common.error"), description: error.message || "Failed to delete source.", variant: "destructive" });
    },
  });

  const requestUpdateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/sources/${id}/update`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sources"] });
      toast({ title: t("dashboard.knowledge.updateRequested"), description: t("dashboard.knowledge.updateRequestedDesc") });
    },
    onError: (error: any) => {
      toast({ title: t("common.error"), description: error.message || "Failed to request update.", variant: "destructive" });
    },
  });

  const [fetchingSourceIds, setFetchingSourceIds] = useState<Set<string>>(new Set());

  const manualFetchMutation = useMutation({
    mutationFn: async (id: string) => {
      setFetchingSourceIds(prev => new Set(prev).add(id));
      const res = await apiRequest("POST", `/api/sources/${id}/fetch`);
      return res.json();
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sources"] });
      setFetchingSourceIds(prev => { const next = new Set(prev); next.delete(id); return next; });
      toast({ title: t("dashboard.knowledge.fetchedSuccessfully"), description: t("dashboard.knowledge.fetchedDesc") });
    },
    onError: (error: any, id) => {
      setFetchingSourceIds(prev => { const next = new Set(prev); next.delete(id); return next; });
      toast({ title: t("dashboard.knowledge.fetchFailed2"), description: error.message || "Could not fetch source data.", variant: "destructive" });
    },
  });

  const updateNameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await apiRequest("PATCH", `/api/sources/${id}/name`, { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sources"] });
    },
    onError: (error: any) => {
      toast({ title: t("common.error"), description: error.message || "Failed to update name.", variant: "destructive" });
    },
  });

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(articleSearchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(articleSearchQuery.toLowerCase());
    const matchesStatus = articleStatusFilter === "all" || article.status === articleStatusFilter;
    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    if (knowledge?.content) {
      setContent(knowledge.content);
    }
  }, [knowledge]);

  const saveMutation = useMutation({
    mutationFn: async (knowledgeText: string) => {
      setSaveStage("reading");
      setAnalysisProgress(10);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      setSaveStage("learning");
      setAnalysisProgress(40);
      
      const response = await apiRequest("POST", "/api/knowledge/set", {
        merchantId,
        knowledgeText,
        agentId: selectedAgentId || undefined,
      });
      
      setSaveStage("thinking");
      setAnalysisProgress(80);
      await new Promise(resolve => setTimeout(resolve, 400));
      
      return response;
    },
    onSuccess: () => {
      setAnalysisProgress(100);
      setTimeout(() => {
        setSaveStage("idle");
        setAnalysisProgress(0);
      }, 500);
      
      queryClient.invalidateQueries({ queryKey: selectedAgentId 
        ? [`/api/knowledge/agent/${selectedAgentId}`]
        : [`/api/knowledge/${merchantId}`] 
      });
      toast({
        title: t("dashboard.knowledge.savedSuccessfully"),
        description: t("dashboard.knowledge.savedToAIDesc"),
      });
    },
    onError: () => {
      setSaveStage("idle");
      setAnalysisProgress(0);
      toast({
        title: t("common.failedToSave"),
        description: t("common.tryAgainDesc"),
        variant: "destructive",
      });
    },
  });

  // Analyze knowledge content mutation
  const analyzeMutation = useMutation({
    mutationFn: async (contentText: string) => {
      const res = await apiRequest("POST", "/api/knowledge/analyze", { content: contentText });
      return res.json() as Promise<{
        success: boolean;
        hasIssues: boolean;
        estimatedProcessingTime: number;
        anomalies: string[];
        simplifications: { original: string; simplified: string }[];
        improvements: string[];
      }>;
    },
    onSuccess: (data) => {
      setIsAnalyzing(false);
      setAnalysisProgress(100);
      if (data.hasIssues) {
        setAnalysisResult({
          hasIssues: data.hasIssues,
          anomalies: data.anomalies,
          simplifications: data.simplifications,
          improvements: data.improvements,
        });
        setShowAnalysisDialog(true);
      } else {
        // No issues found, proceed to save
        saveMutation.mutate(content);
      }
    },
    onError: () => {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
      // On error, still save the content
      saveMutation.mutate(content);
    },
  });

  // Handle save with analysis
  const handleSaveWithAnalysis = () => {
    if (!content.trim()) {
      toast({
        title: t("dashboard.knowledge.emptyContent"),
        description: t("dashboard.knowledge.emptyContentDesc"),
        variant: "destructive",
      });
      return;
    }
    
    // Calculate estimated time
    const wordCount = content.split(/\s+/).length;
    const estSeconds = Math.max(3, Math.min(30, Math.ceil(wordCount / 100)));
    setEstimatedTime(estSeconds);
    
    // Start analysis with progress animation
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setAnalysisResult(null);
    
    // Animate progress bar
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 90) {
        progress = 90;
        clearInterval(interval);
      }
      setAnalysisProgress(Math.min(progress, 90));
    }, 500);
    
    analyzeMutation.mutate(content);
  };

  // Apply simplification suggestion
  const applySimplification = (original: string, simplified: string) => {
    const newContent = content.replace(original, simplified);
    setContent(newContent);
    toast({
      title: t("dashboard.knowledge.simplificationApplied"),
      description: t("dashboard.knowledge.simplificationDesc"),
    });
  };

  // Proceed to save after analysis (skip suggestions)
  const proceedToSave = () => {
    setShowAnalysisDialog(false);
    saveMutation.mutate(content);
  };

  const crawlMutation = useMutation<{ content: string; linkId: string }, Error, string>({
    mutationFn: async (url: string) => {
      const res = await apiRequest("POST", "/api/knowledge/crawl", { url });
      return res.json() as Promise<{ content: string; linkId: string }>;
    },
    onSuccess: () => {
      setCrawlUrl("");
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/links", merchantId] });
      queryClient.invalidateQueries({ queryKey: selectedAgentId 
        ? [`/api/knowledge/agent/${selectedAgentId}`]
        : [`/api/knowledge/${merchantId}`] 
      });
      toast({
        title: t("dashboard.knowledge.websiteSynced"),
        description: t("dashboard.knowledge.websiteSyncedDesc"),
      });
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/links", merchantId] });
      toast({
        title: t("dashboard.knowledge.syncFailed"),
        description: error.message || "Failed to extract content from the URL.",
        variant: "destructive",
      });
    },
  });

  const recrawlMutation = useMutation<{ content: string; lastSyncedAt: string }, Error, string>({
    mutationFn: async (linkId: string) => {
      const res = await apiRequest("POST", `/api/knowledge/recrawl/${linkId}`);
      return res.json() as Promise<{ content: string; lastSyncedAt: string }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/links", merchantId] });
      queryClient.invalidateQueries({ queryKey: selectedAgentId 
        ? [`/api/knowledge/agent/${selectedAgentId}`]
        : [`/api/knowledge/${merchantId}`] 
      });
      toast({
        title: t("dashboard.knowledge.websiteUpdated"),
        description: t("dashboard.knowledge.websiteUpdatedDesc"),
      });
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/links", merchantId] });
      toast({
        title: t("dashboard.knowledge.updateFailed"),
        description: error.message || "Failed to refresh content from the URL.",
        variant: "destructive",
      });
    },
  });

  const deleteLinkMutation = useMutation({
    mutationFn: async (linkId: string) => {
      return apiRequest("DELETE", `/api/knowledge/links/${linkId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/links", merchantId] });
      toast({
        title: t("dashboard.knowledge.linkDeleted"),
        description: t("dashboard.knowledge.linkDeletedDesc"),
      });
    },
  });

  const importFromAgentMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const res = await apiRequest("GET", `/api/knowledge/agent/${agentId}`);
      return res.json() as Promise<{ content: string }>;
    },
    onSuccess: (data) => {
      if (data.content) {
        const separator = content.trim() ? "\n\n---\n\n" : "";
        setContent(content + separator + data.content);
        toast({
          title: t("dashboard.knowledge.imported"),
          description: t("dashboard.knowledge.toast.theKnowledgeFromTheDesc"),
        });
      } else {
        toast({
          title: t("dashboard.knowledge.noKnowledge"),
          description: t("dashboard.knowledge.noKnowledgeDesc"),
          variant: "destructive",
        });
      }
      setImportDialogOpen(false);
      setSelectedImportAgent(null);
    },
    onError: () => {
      toast({
        title: t("dashboard.knowledge.importFailed"),
        description: t("dashboard.knowledge.importFailedDesc"),
        variant: "destructive",
      });
    },
  });

  const handleImportFromAgent = () => {
    if (selectedImportAgent) {
      importFromAgentMutation.mutate(selectedImportAgent);
    }
  };

  const createQuestionMutation = useMutation({
    mutationFn: async (data: { question: string; answer: string }) => {
      return apiRequest("POST", "/api/suggested-questions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suggested-questions"] });
      setIsAddQuestionOpen(false);
      setNewQuestion("");
      setNewAnswer("");
      toast({
        title: t("dashboard.knowledge.questionAdded"),
        description: t("dashboard.knowledge.questionAddedDesc"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("dashboard.knowledge.questionAddFailed"),
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: async (data: { id: string; question: string; answer: string; isActive: boolean }) => {
      const { id, ...rest } = data;
      return apiRequest("PUT", `/api/suggested-questions/${id}`, rest);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suggested-questions"] });
      setEditingQuestion(null);
      toast({
        title: t("dashboard.knowledge.questionUpdated"),
        description: t("dashboard.knowledge.questionSavedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("common.updateFailed"),
        description: t("common.tryAgain"),
        variant: "destructive",
      });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/suggested-questions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suggested-questions"] });
      toast({
        title: t("dashboard.knowledge.questionDeleted"),
        description: t("dashboard.knowledge.questionDeletedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("common.deleteFailed"),
        description: t("common.tryAgain"),
        variant: "destructive",
      });
    },
  });

  const handleCreateQuestion = () => {
    if (!newQuestion.trim() || !newAnswer.trim()) {
      toast({
        title: t("dashboard.knowledge.missingFields"),
        description: t("dashboard.knowledge.missingFieldsDesc"),
        variant: "destructive",
      });
      return;
    }
    createQuestionMutation.mutate({ question: newQuestion, answer: newAnswer });
  };

  const handleUpdateQuestion = () => {
    if (!editingQuestion) return;
    updateQuestionMutation.mutate({
      id: editingQuestion.id,
      question: editingQuestion.question,
      answer: editingQuestion.answer,
      isActive: editingQuestion.isActive ?? true,
    });
  };

  const handleToggleQuestionActive = (q: SuggestedQuestion) => {
    updateQuestionMutation.mutate({
      id: q.id,
      question: q.question,
      answer: q.answer,
      isActive: !(q.isActive ?? true),
    });
  };

  const handleSave = () => {
    handleSaveWithAnalysis();
  };

  const previewFile = async (file: File) => {
    setIsPreviewing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("preview", "true");
      const response = await fetch("/api/sources/upload", { method: "POST", body: formData, credentials: "include" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || "Preview failed");
      setFilePreview({
        fileName: data.fileName || file.name,
        fileSize: file.size,
        content: data.content,
        type: "file",
        metadata: data.metadata || {},
      });
      setIsPreviewDialogOpen(true);
    } catch (error: any) {
      toast({ title: t("dashboard.knowledge.previewFailed"), description: error.message || "Could not preview file", variant: "destructive" });
    } finally {
      setIsPreviewing(false);
    }
  };

  const previewGoogleDoc = async (url: string) => {
    setIsPreviewing(true);
    try {
      const response = await fetch("/api/sources/google-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, preview: true }),
        credentials: "include"
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || "Preview failed");
      setFilePreview({
        fileName: data.fileName || "Google Doc",
        fileSize: data.content?.length || 0,
        content: data.content,
        url,
        type: "google-doc",
        metadata: data.metadata || {},
      });
      setIsPreviewDialogOpen(true);
    } catch (error: any) {
      toast({ title: t("dashboard.knowledge.previewFailed"), description: error.message || "Could not preview Google Doc", variant: "destructive" });
    } finally {
      setIsPreviewing(false);
    }
  };

  const previewGoogleSheet = async (url: string) => {
    setIsPreviewing(true);
    try {
      const response = await fetch("/api/sources/google-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, preview: true }),
        credentials: "include"
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || "Preview failed");
      setFilePreview({
        fileName: data.fileName || "Google Sheet",
        fileSize: data.content?.length || 0,
        content: data.content,
        url,
        type: "google-sheet",
        metadata: data.metadata || {},
      });
      setIsPreviewDialogOpen(true);
    } catch (error: any) {
      toast({ title: t("dashboard.knowledge.previewFailed"), description: error.message || "Could not preview Google Sheet", variant: "destructive" });
    } finally {
      setIsPreviewing(false);
    }
  };

  const confirmAndSaveSource = () => {
    if (!filePreview) return;
    
    if (filePreview.type === "file" && selectedFile) {
      uploadFileMutation.mutate(selectedFile);
    } else if (filePreview.type === "google-doc" && filePreview.url) {
      googleDocMutation.mutate(filePreview.url);
    } else if (filePreview.type === "google-sheet" && filePreview.url) {
      googleSheetMutation.mutate(filePreview.url);
    }
    
    setIsPreviewDialogOpen(false);
    setFilePreview(null);
  };

  const onSourceSubmit = async (data: z.infer<typeof sourceSchema>) => {
    if (data.type === "file" && selectedFile) {
      await previewFile(selectedFile);
    } else if (data.type === "google-doc" && data.url) {
      await previewGoogleDoc(data.url);
    } else if (data.type === "google-sheet" && data.url) {
      await previewGoogleSheet(data.url);
    } else if (data.type === "text" || data.type === "website") {
      createSourceMutation.mutate({
        type: data.type,
        name: data.name,
        content: data.content,
        url: data.url,
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadedFileName(file.name);
      sourceForm.setValue("name", file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleSourceDialogClose = (open: boolean) => {
    if (!open) {
      setIsSourceDialogOpen(false);
      sourceForm.reset();
      setUploadedFileName("");
      setSelectedFile(null);
    } else {
      setIsSourceDialogOpen(true);
    }
  };

  const SYNC_INTERVAL_SECONDS = 10;

  const getCountdown = (lastSyncedAt: string | Date | null | undefined): number => {
    if (!lastSyncedAt) return 0;
    const lastSync = new Date(lastSyncedAt).getTime();
    const nextSync = lastSync + SYNC_INTERVAL_SECONDS * 1000;
    const remaining = Math.max(0, Math.ceil((nextSync - Date.now()) / 1000));
    return remaining;
  };

  const getTimeAgo = (date: string | Date | null | undefined): string => {
    if (!date) return "Never";
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 5) return "Just now";
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const getSourceTypeIcon = (type: string) => {
    switch (type) {
      case "file": return <Upload className="w-4 h-4" />;
      case "text": return <Type className="w-4 h-4" />;
      case "website": return <Globe className="w-4 h-4" />;
      case "google-doc": return <FileText className="w-4 h-4" />;
      case "google-sheet": return <FileText className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const isSourceSubmitting = createSourceMutation.isPending || uploadFileMutation.isPending || googleDocMutation.isPending || googleSheetMutation.isPending || isPreviewing;

  const handleCrawl = () => {
    if (!crawlUrl.trim()) {
      toast({
        title: t("common.urlRequired"),
        description: t("dashboard.knowledge.urlRequiredDesc"),
        variant: "destructive",
      });
      return;
    }
    crawlMutation.mutate(crawlUrl.trim());
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Unknown";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Knowledge Base</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">
            Train your AI with company info, FAQs, and help articles.
          </p>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="training" className="flex items-center gap-2" data-testid="tab-training">
            <Database className="w-4 h-4" />
            <span className="hidden sm:inline">Training Data</span>
            <span className="sm:hidden">Training</span>
          </TabsTrigger>
          <TabsTrigger value="sources" className="flex items-center gap-2" data-testid="tab-sources">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Active Sources</span>
            <span className="sm:hidden">Sources</span>
          </TabsTrigger>
          <TabsTrigger value="articles" className="flex items-center gap-2" data-testid="tab-articles">
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Create with AI</span>
            <span className="sm:hidden">AI Create</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="training" className="mt-4">
    <div className="space-y-4 sm:space-y-6 h-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div></div>
          {agents && agents.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap hidden sm:inline">Training:</span>
              <Select
                value={selectedAgentId || "none"}
                onValueChange={(value) => {
                  if (value !== "none") {
                    handleAgentSelect(value);
                  }
                }}
              >
                <SelectTrigger className="w-[160px] sm:w-[200px]" data-testid="select-agent-knowledge">
                  <div className="flex items-center gap-2">
                    {selectedAgent ? (
                      <>
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={selectedAgent.photoUrl || ""} />
                          <AvatarFallback className="text-[10px]">
                            <Bot className="w-3 h-3" />
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{selectedAgent.name}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Select agent...</span>
                    )}
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {!selectedAgentId && (
                    <SelectItem value="none" disabled>
                      <span className="text-muted-foreground">Select an agent to train...</span>
                    </SelectItem>
                  )}
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id} data-testid={`select-agent-option-${agent.id}`}>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={agent.photoUrl || ""} />
                          <AvatarFallback className="text-[10px]">
                            <Bot className="w-3 h-3" />
                          </AvatarFallback>
                        </Avatar>
                        <span>{agent.name}</span>
                        {agent.id === selectedAgentId && (
                          <Badge variant="secondary" className="text-[10px] ml-1">Selected</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Knowledge Entries */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">Knowledge Entries</h3>
            <Badge variant="secondary">{knowledgeEntries.length}</Badge>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => { setIsSearchReplaceOpen(true); setSearchText(""); setReplaceText(""); setSearchResults([]); setSelectedReplaceEntries(new Set()); }}
              disabled={!selectedAgentId || knowledgeEntries.length === 0}
              data-testid="button-search-replace"
            >
              <Search className="w-3.5 h-3.5 mr-1" />
              <Edit2 className="w-3 h-3 mr-2" />
              Search & Replace
            </Button>
            <Button
              variant="outline"
              onClick={() => { setReviewSuggestions([]); setDismissedSuggestions(new Set()); setReviewAnalyzed(false); setIsReviewOpen(true); handleRunReview(); }}
              disabled={!selectedAgentId || knowledgeEntries.length < 2}
              data-testid="button-review-organize"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Review & Organize
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsTemplateDialogOpen(true)}
              data-testid="button-use-template"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Use Template
            </Button>
            <Button
              onClick={() => setIsAddingEntry(true)}
              disabled={!selectedAgentId}
              data-testid="button-add-entry"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Knowledge
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Create multiple knowledge entries to organize your AI training data. Linked entries are shared across all agents.
        </p>

        {isAddingEntry && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Entry name (e.g. Return Policy, FAQ, Store Hours)"
                  value={newEntryName}
                  onChange={(e) => setNewEntryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newEntryName.trim()) {
                      createEntryMutation.mutate({ name: newEntryName.trim(), agentId: selectedAgentId || undefined });
                    }
                    if (e.key === "Escape") { setIsAddingEntry(false); setNewEntryName(""); }
                  }}
                  autoFocus
                  data-testid="input-new-entry-name"
                />
                <Button
                  onClick={() => {
                    if (newEntryName.trim()) {
                      createEntryMutation.mutate({ name: newEntryName.trim(), agentId: selectedAgentId || undefined });
                    }
                  }}
                  disabled={!newEntryName.trim() || createEntryMutation.isPending}
                  data-testid="button-confirm-add-entry"
                >
                  {createEntryMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setIsAddingEntry(false); setNewEntryName(""); }}
                  data-testid="button-cancel-add-entry"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {entriesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortedEntries.map(e => e.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {sortedEntries.map((entry) => {
                  const localContent = entryContents[entry.id] ?? entry.content;
                  const localName = entryNames[entry.id] ?? entry.name;
                  const isSaving = savingEntryId === entry.id;
                  const currentStage = isSaving ? savingStage : null;
                  const hasChanges = localContent !== entry.content || localName !== entry.name;

                  return (
                    <SortableEntryCard
                      key={entry.id}
                      entry={entry}
                      localContent={localContent}
                      localName={localName}
                      isSaving={isSaving}
                      currentStage={currentStage}
                      hasChanges={hasChanges}
                      onNameChange={(val) => setEntryNames(prev => ({ ...prev, [entry.id]: val }))}
                      onContentChange={(val) => setEntryContents(prev => ({ ...prev, [entry.id]: val }))}
                      onSave={() => saveEntryMutation.mutate({ id: entry.id, content: localContent, name: localName })}
                      onDelete={() => setDeleteConfirmId(entry.id)}
                      onToggleActive={(checked) => toggleEntryActiveMutation.mutate({ id: entry.id, isActive: checked })}
                      onToggleLink={() => toggleEntryLinkMutation.mutate({ id: entry.id, agentId: selectedAgentId || undefined })}
                      onCheckClarity={() => handleOpenClarityCheck(entry.id, entry.name)}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Delete Entry Confirmation Dialog */}
        <Dialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Knowledge Entry</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this entry? This action cannot be undone and the AI will no longer use this content.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)} data-testid="button-cancel-delete-entry">
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => { if (deleteConfirmId) deleteEntryMutation.mutate(deleteConfirmId); }}
                disabled={deleteEntryMutation.isPending}
                data-testid="button-confirm-delete-entry"
              >
                {deleteEntryMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Review & Organize Dialog */}
        <Dialog open={isReviewOpen} onOpenChange={(open) => { if (!open) { setIsReviewOpen(false); setReviewSuggestions([]); setReviewAnalyzed(false); } }}>
          <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Review & Organize Knowledge Base
              </DialogTitle>
              <DialogDescription>
                AI will analyze your knowledge entries and suggest content that may be in the wrong place.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              {!isReviewLoading && !reviewAnalyzed && (
                <div className="flex flex-col items-center justify-center py-10 gap-4">
                  <Brain className="w-12 h-12 text-muted-foreground" />
                  <p className="text-muted-foreground text-sm text-center">
                    Click "Analyze Now" to scan your knowledge base for misplaced or duplicated content.
                  </p>
                  <Button onClick={handleRunReview} disabled={isReviewLoading} data-testid="button-run-review">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analyze Now
                  </Button>
                </div>
              )}
              {isReviewLoading && (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-muted-foreground text-sm">Analyzing knowledge base...</p>
                </div>
              )}
              {!isReviewLoading && reviewAnalyzed && reviewSuggestions.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 gap-3" data-testid="review-well-organized">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                  <p className="font-medium">Knowledge base looks well organized!</p>
                  <p className="text-sm text-muted-foreground">No misplaced content was detected.</p>
                  <Button variant="outline" onClick={handleRunReview} data-testid="button-rerun-review-empty">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Re-analyze
                  </Button>
                </div>
              )}
              {!isReviewLoading && reviewAnalyzed && reviewSuggestions.length > 0 && (() => {
                const allDismissed = reviewSuggestions.every((_, i) => dismissedSuggestions.has(i));
                if (allDismissed) {
                  return (
                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                      <CheckCircle2 className="w-10 h-10 text-green-500" />
                      <p className="font-medium">All done!</p>
                      <p className="text-sm text-muted-foreground">All suggestions have been handled.</p>
                      <Button variant="outline" onClick={handleRunReview} data-testid="button-rerun-review">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Re-analyze
                      </Button>
                    </div>
                  );
                }
                return (
                  <div className="space-y-3 py-1">
                    {reviewSuggestions.map((suggestion, index) => {
                      const isDismissed = dismissedSuggestions.has(index);
                      const isApplying = applyingIndex === index;
                      return (
                        <Card
                          key={index}
                          className={`border transition-all duration-300 ${isDismissed ? "opacity-40 line-through pointer-events-none" : ""}`}
                          data-testid={`card-suggestion-${index}`}
                        >
                          <CardContent className="pt-4 space-y-3">
                            <div className="flex items-center gap-2 text-sm font-medium flex-wrap">
                              <Badge variant="secondary" className="max-w-[140px] truncate">{suggestion.sourceEntryName}</Badge>
                              <span className="text-muted-foreground shrink-0">→</span>
                              <Badge variant="outline" className="max-w-[140px] truncate">{suggestion.targetEntryName}</Badge>
                            </div>
                            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">
                              {suggestion.contentSnippet}
                            </div>
                            <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
                            {!isDismissed && (
                              <div className="flex gap-2 flex-wrap">
                                <Button
                                  size="sm"
                                  onClick={() => setApproveDialog({ suggestion, index })}
                                  disabled={isApplying}
                                  data-testid={`button-approve-suggestion-${index}`}
                                >
                                  {isApplying ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => { setModifyContent(suggestion.contentSnippet); setModifyDialog({ suggestion, index }); }}
                                  disabled={isApplying}
                                  data-testid={`button-modify-suggestion-${index}`}
                                >
                                  <Edit2 className="w-3 h-3 mr-1" />
                                  Modify
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setDismissedSuggestions(prev => new Set([...prev, index]))}
                                  disabled={isApplying}
                                  data-testid={`button-decline-suggestion-${index}`}
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  Decline
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
            {!isReviewLoading && reviewSuggestions.length > 0 && dismissedSuggestions.size < reviewSuggestions.length && (
              <DialogFooter className="mt-2">
                <Button variant="outline" onClick={handleRunReview} size="sm" data-testid="button-reanalyze">
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Re-analyze
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>

        {/* Clarity Checker Dialog */}
        <Dialog open={isClarityOpen} onOpenChange={(open) => { if (!open) { setIsClarityOpen(false); setClarityResult(null); } }}>
          <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Check Clarity — {clarityEntryName}
              </DialogTitle>
              <DialogDescription>
                AI reviews this entry for ambiguous instructions or verbose text that could cause inconsistent answers.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto space-y-4">
              {isClarityLoading && (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-muted-foreground text-sm">Analyzing entry for clarity issues...</p>
                </div>
              )}
              {!isClarityLoading && clarityResult && !clarityResult.hasIssues && (
                <div className="flex flex-col items-center justify-center py-10 gap-3" data-testid="clarity-no-issues">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                  <p className="font-medium">Entry looks clear!</p>
                  <p className="text-sm text-muted-foreground">No ambiguous instructions or verbose sentences detected.</p>
                </div>
              )}
              {!isClarityLoading && clarityResult && clarityResult.hasIssues && (
                <>
                  {clarityResult.ambiguities.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-foreground">Ambiguous Instructions</p>
                      {clarityResult.ambiguities.map((amb, idx) => {
                        const applied = appliedClarityOptions[idx];
                        return (
                          <Card key={idx} className={applied ? "opacity-60" : ""}>
                            <CardContent className="pt-3 space-y-2">
                              <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground whitespace-pre-wrap">
                                {amb.excerpt}
                              </div>
                              <p className="text-xs text-muted-foreground">{amb.issue}</p>
                              {applied ? (
                                <div className="flex items-center gap-1.5 text-xs text-green-600">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Applied: {applied}
                                </div>
                              ) : (
                                <div className="space-y-1.5">
                                  <p className="text-xs font-medium">Choose a clearer version:</p>
                                  {amb.options.map((opt, oi) => (
                                    <Button
                                      key={oi}
                                      variant="outline"
                                      size="sm"
                                      className="w-full justify-start text-left h-auto py-2 text-xs whitespace-normal"
                                      onClick={() => handleApplyClarityOption(idx, opt, amb.excerpt)}
                                      data-testid={`button-clarity-option-${idx}-${oi}`}
                                    >
                                      {opt}
                                    </Button>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                  {clarityResult.suggestions.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-foreground">Simplification Suggestions</p>
                      {clarityResult.suggestions.map((sug, idx) => {
                        const applied = appliedSuggestions.has(idx);
                        return (
                          <Card key={idx} className={applied ? "opacity-60" : ""}>
                            <CardContent className="pt-3 space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <p className="text-[10px] text-muted-foreground mb-1 font-medium">Original</p>
                                  <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">
                                    {sug.excerpt}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-[10px] text-muted-foreground mb-1 font-medium">Simplified</p>
                                  <div className="rounded-md bg-muted px-3 py-2 text-xs whitespace-pre-wrap line-clamp-4">
                                    {sug.simplified}
                                  </div>
                                </div>
                              </div>
                              {applied ? (
                                <div className="flex items-center gap-1.5 text-xs text-green-600">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Applied
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleApplyClaritySuggestion(idx, sug.simplified, sug.excerpt)}
                                  data-testid={`button-clarity-simplify-${idx}`}
                                >
                                  <Check className="w-3 h-3 mr-1" />
                                  Apply Simplification
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Approve Confirmation Dialog */}
        <Dialog open={!!approveDialog} onOpenChange={(open) => { if (!open) setApproveDialog(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Move</DialogTitle>
              <DialogDescription>
                This will move the selected content from <strong>{approveDialog?.suggestion.sourceEntryName}</strong> to <strong>{approveDialog?.suggestion.targetEntryName}</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground whitespace-pre-wrap max-h-40 overflow-y-auto">
              {approveDialog?.suggestion.contentSnippet}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setApproveDialog(null)} data-testid="button-cancel-approve">{t("dashboard.common.cancel")}</Button>
              <Button
                onClick={() => { if (approveDialog) handleApplySuggestion(approveDialog.suggestion, approveDialog.index); }}
                disabled={applyingIndex !== null}
                data-testid="button-confirm-approve"
              >
                {applyingIndex !== null ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                Move Content
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modify Dialog */}
        <Dialog open={!!modifyDialog} onOpenChange={(open) => { if (!open) setModifyDialog(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modify Before Moving</DialogTitle>
              <DialogDescription>
                Edit the content snippet before moving it from <strong>{modifyDialog?.suggestion.sourceEntryName}</strong> to <strong>{modifyDialog?.suggestion.targetEntryName}</strong>.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={modifyContent}
              onChange={(e) => setModifyContent(e.target.value)}
              className="min-h-[120px] text-sm"
              data-testid="textarea-modify-content"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setModifyDialog(null)} data-testid="button-cancel-modify">{t("dashboard.common.cancel")}</Button>
              <Button
                onClick={() => { if (modifyDialog) handleApplySuggestion(modifyDialog.suggestion, modifyDialog.index, modifyContent); }}
                disabled={!modifyContent.trim() || applyingIndex !== null}
                data-testid="button-confirm-modify"
              >
                {applyingIndex !== null ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                Move Content
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Search & Replace Dialog */}
        <Dialog open={isSearchReplaceOpen} onOpenChange={(open) => { if (!open) { setIsSearchReplaceOpen(false); setSearchText(""); setReplaceText(""); setSearchResults([]); setSelectedReplaceEntries(new Set()); } }}>
          <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-primary" />
                Search & Replace
              </DialogTitle>
              <DialogDescription>
                Find and replace text across all knowledge entries for the selected agent.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  {isSearching && <Loader2 className="absolute left-2.5 top-2.5 w-4 h-4 animate-spin text-muted-foreground" />}
                  {!isSearching && <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />}
                  <Input
                    placeholder="Search text..."
                    value={searchText}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-text"
                  />
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <Input
                  placeholder="Replace with..."
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  data-testid="input-replace-text"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto mt-2 space-y-2">
              {!searchText && (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <Search className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Start typing to search across all entries</p>
                </div>
              )}
              {searchText && !isSearching && searchResults.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <X className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No results found for "{searchText}"</p>
                </div>
              )}
              {searchResults.map((result) => {
                const isSelected = selectedReplaceEntries.has(result.entryId);
                return (
                  <Card key={result.entryId} className={`border ${isSelected ? "border-primary" : ""}`} data-testid={`card-search-result-${result.entryId}`}>
                    <CardContent className="pt-3 pb-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              setSelectedReplaceEntries(prev => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(result.entryId);
                                else next.delete(result.entryId);
                                return next;
                              });
                            }}
                            className="w-4 h-4 accent-primary shrink-0"
                            data-testid={`checkbox-result-${result.entryId}`}
                          />
                          <span className="font-medium text-sm truncate">{result.entryName}</span>
                          <Badge variant="secondary" className="shrink-0">{result.matchCount} match{result.matchCount !== 1 ? "es" : ""}</Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isReplacing}
                          onClick={async () => {
                            setIsReplacing(true);
                            try {
                              await apiRequest("POST", "/api/knowledge/search-replace", {
                                searchText,
                                replaceText,
                                entryIds: [result.entryId],
                                agentId: selectedAgentId,
                              });
                              queryClient.invalidateQueries({ queryKey: ["/api/knowledge-entries", selectedAgentId] });
                              toast({ title: t("dashboard.knowledge.replaced"), description: `Replaced ${result.matchCount} occurrence${result.matchCount !== 1 ? "s" : ""} in "${result.entryName}".` });
                              setSearchResults(prev => prev.filter(r => r.entryId !== result.entryId));
                              setSelectedReplaceEntries(prev => { const n = new Set(prev); n.delete(result.entryId); return n; });
                            } catch {
                              toast({ title: t("dashboard.knowledge.replaceFailed"), variant: "destructive" });
                            } finally {
                              setIsReplacing(false);
                            }
                          }}
                          data-testid={`button-replace-entry-${result.entryId}`}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Replace
                        </Button>
                      </div>
                      <div className="space-y-1">
                        {result.contexts.map((ctx, ci) => (
                          <p key={ci} className="text-xs text-muted-foreground bg-muted rounded px-2 py-1">
                            ...{ctx.replace(new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), (match) => `【${match}】`)}...
                          </p>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {searchResults.length > 0 && (
              <DialogFooter className="mt-2 flex-col sm:flex-row gap-2">
                <div className="text-xs text-muted-foreground self-center">
                  {selectedReplaceEntries.size > 0
                    ? `${selectedReplaceEntries.size} entr${selectedReplaceEntries.size !== 1 ? "ies" : "y"} selected`
                    : `${searchResults.length} entr${searchResults.length !== 1 ? "ies" : "y"} found`}
                </div>
                <Button
                  onClick={() => setReplaceConfirmOpen(true)}
                  disabled={isReplacing}
                  data-testid="button-replace-all"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Replace {selectedReplaceEntries.size > 0 ? "Selected" : "All"}
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>

        {/* Replace Confirm Dialog */}
        <Dialog open={replaceConfirmOpen} onOpenChange={(open) => { if (!open) setReplaceConfirmOpen(false); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Replacement</DialogTitle>
              <DialogDescription>
                {(() => {
                  const entryIds = selectedReplaceEntries.size > 0 ? Array.from(selectedReplaceEntries) : searchResults.map(r => r.entryId);
                  const totalMatches = searchResults.filter(r => entryIds.includes(r.entryId)).reduce((sum, r) => sum + r.matchCount, 0);
                  return `This will replace ${totalMatches} occurrence${totalMatches !== 1 ? "s" : ""} of "${searchText}" with "${replaceText}" across ${entryIds.length} entr${entryIds.length !== 1 ? "ies" : "y"}. This action cannot be undone.`;
                })()}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReplaceConfirmOpen(false)} data-testid="button-cancel-replace">{t("dashboard.common.cancel")}</Button>
              <Button
                onClick={handleReplaceAll}
                disabled={isReplacing}
                data-testid="button-confirm-replace-all"
              >
                {isReplacing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                Confirm Replace
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import from Website */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              <CardTitle>Sync Website Content</CardTitle>
            </div>
            <CardDescription>
              Add a website URL to automatically extract and sync content to your AI knowledge base. Content will be refreshed every 60 minutes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="https://example.com/faq"
                value={crawlUrl}
                onChange={(e) => setCrawlUrl(e.target.value)}
                disabled={crawlMutation.isPending}
                data-testid="input-crawl-url"
              />
              <Button
                onClick={handleCrawl}
                disabled={crawlMutation.isPending}
                data-testid="button-extract-content"
              >
                {crawlMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Add Source"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Crawled Links List */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Active Sources</CardTitle>
              <Badge variant="secondary">{crawledLinks.length} sources</Badge>
            </div>
            <CardDescription>
              Websites synced to your AI knowledge base. Auto-refreshed every 60 minutes. Google Sheets sync every 1 minute.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {linksLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : crawledLinks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No sources yet. Add a website URL above to start syncing.
              </p>
            ) : (
              <div className="space-y-2">
                {crawledLinks.map((link) => {
                  const isSyncing = link.syncStatus === "syncing" || recrawlMutation.isPending;
                  const isActive = link.isActive && link.status === "completed";
                  const lastSync = link.lastSyncedAt ? new Date(link.lastSyncedAt) : null;
                  
                  return (
                    <div
                      key={link.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover-elevate"
                      data-testid={`crawled-link-${link.id}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex-shrink-0 relative">
                          {isSyncing ? (
                            <RefreshCw className="w-4 h-4 text-primary animate-spin" />
                          ) : link.status === "failed" ? (
                            <X className="w-4 h-4 text-red-500" />
                          ) : isActive ? (
                            <div className="relative">
                              <div className="w-3 h-3 bg-green-500 rounded-full" />
                              <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping opacity-75" />
                            </div>
                          ) : (
                            <div className="w-3 h-3 bg-muted-foreground rounded-full" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{link.url}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>
                              {lastSync 
                                ? `Last sync: ${formatDate(lastSync)}`
                                : `Added: ${formatDate(link.crawledAt)}`
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => recrawlMutation.mutate(link.id)}
                          disabled={isSyncing || recrawlMutation.isPending}
                          data-testid={`button-recrawl-${link.id}`}
                          className="text-xs"
                        >
                          {isSyncing ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Update
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                        >
                          <a href={link.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteLinkMutation.mutate(link.id)}
                          disabled={deleteLinkMutation.isPending}
                          data-testid={`button-delete-link-${link.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Suggested Questions Section */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-primary" />
                <CardTitle>Suggested Questions</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {suggestedQuestions.length}{questionsLimit === Infinity ? "" : ` / ${questionsLimit}`}
                </Badge>
                {!isQuestionFeatureAvailable ? (
                  <Badge variant="outline" className="bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400">
                    <Lock className="w-3 h-3 mr-1" />
                    Upgrade
                  </Badge>
                ) : null}
              </div>
            </div>
            <CardDescription>
              Pre-defined questions shown as quick buttons in the chat widget.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isQuestionFeatureAvailable ? (
              <div className="text-center py-6 px-4">
                <Crown className="w-10 h-10 mx-auto text-amber-500 mb-2" />
                <p className="text-sm font-medium mb-1">Suggested Questions</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Upgrade to a paid plan to add suggested questions that guide customer conversations.
                </p>
                <Button asChild size="sm">
                  <Link href="/dashboard/billing">View Plans</Link>
                </Button>
              </div>
            ) : (
              <>
                {/* Add New Question Form */}
                {isAddQuestionOpen ? (
                  <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Question</Label>
                      <Input
                        placeholder="e.g., What are your store hours?"
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        data-testid="input-new-question"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Answer</Label>
                      <Textarea
                        placeholder="Enter the answer that Chatvice will use..."
                        value={newAnswer}
                        onChange={(e) => setNewAnswer(e.target.value)}
                        className="min-h-[80px] resize-none"
                        data-testid="textarea-new-answer"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsAddQuestionOpen(false);
                          setNewQuestion("");
                          setNewAnswer("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleCreateQuestion}
                        disabled={createQuestionMutation.isPending}
                        data-testid="button-save-new-question"
                      >
                        {createQuestionMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Check className="w-4 h-4 mr-2" />
                        )}
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setIsAddQuestionOpen(true)}
                    disabled={!canAddMoreQuestions}
                    data-testid="button-add-question"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {canAddMoreQuestions ? "Add Question" : `Limit Reached (${questionsLimit})`}
                  </Button>
                )}

                {/* Questions List */}
                {suggestedQuestions.length > 0 ? (
                  <div className="space-y-2">
                    {suggestedQuestions.map((q) => (
                      <div
                        key={q.id}
                        className={`p-3 border rounded-lg transition-colors ${
                          q.isActive !== false ? "bg-card" : "bg-muted/40 opacity-60"
                        }`}
                        data-testid={`suggested-question-${q.id}`}
                      >
                        {editingQuestion?.id === q.id ? (
                          <div className="space-y-3">
                            <Input
                              value={editingQuestion.question}
                              onChange={(e) =>
                                setEditingQuestion({ ...editingQuestion, question: e.target.value })
                              }
                              data-testid="input-edit-question"
                            />
                            <Textarea
                              value={editingQuestion.answer}
                              onChange={(e) =>
                                setEditingQuestion({ ...editingQuestion, answer: e.target.value })
                              }
                              className="min-h-[60px] resize-none"
                              data-testid="textarea-edit-answer"
                            />
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingQuestion(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleUpdateQuestion}
                                disabled={updateQuestionMutation.isPending}
                                data-testid="button-save-edit"
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <MessageSquare className="w-4 h-4 text-primary flex-shrink-0" />
                                <p className="text-sm font-medium truncate">{q.question}</p>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2 ml-6">
                                {q.answer}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Switch
                                checked={q.isActive !== false}
                                onCheckedChange={() => handleToggleQuestionActive(q)}
                                data-testid={`switch-question-active-${q.id}`}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingQuestion(q)}
                                data-testid={`button-edit-question-${q.id}`}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteQuestionMutation.mutate(q.id)}
                                disabled={deleteQuestionMutation.isPending}
                                data-testid={`button-delete-question-${q.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : !isAddQuestionOpen ? (
                  <div className="text-center py-6">
                    <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">No suggested questions yet.</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add questions to help guide customer conversations.
                    </p>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>

      {/* Import from Agent Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Knowledge from Agent</DialogTitle>
            <DialogDescription>
              Select an agent to import their knowledge base content. This will append to your current knowledge.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              {otherAgents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => setSelectedImportAgent(agent.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors hover-elevate ${
                    selectedImportAgent === agent.id
                      ? "border-primary bg-primary/10"
                      : "border-border"
                  }`}
                  data-testid={`button-select-agent-${agent.id}`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={agent.photoUrl || undefined} alt={agent.name} />
                    <AvatarFallback>
                      <Bot className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="font-medium">{agent.name}</p>
                    <p className="text-sm text-muted-foreground">{agent.description || "No description"}</p>
                  </div>
                  {selectedImportAgent === agent.id && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </button>
              ))}
              {otherAgents.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No other agents available to import from.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImportFromAgent}
              disabled={!selectedImportAgent || importFromAgentMutation.isPending}
              data-testid="button-confirm-import"
            >
              {importFromAgentMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Analysis Results Dialog */}
      <Dialog open={showAnalysisDialog} onOpenChange={setShowAnalysisDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              Knowledge Analysis Results
            </DialogTitle>
            <DialogDescription>
              AI has analyzed your knowledge base and found some suggestions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Anomalies/Conflicts */}
            {analysisResult?.anomalies && analysisResult.anomalies.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-destructive flex items-center gap-2">
                  <X className="w-4 h-4" />
                  Anomalies / Conflicts Found
                </h4>
                <div className="space-y-2">
                  {analysisResult.anomalies.map((anomaly, idx) => (
                    <div key={idx} className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm">
                      {anomaly}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Simplification Suggestions */}
            {analysisResult?.simplifications && analysisResult.simplifications.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  Simplification Suggestions
                </h4>
                <div className="space-y-3">
                  {analysisResult.simplifications.map((simp, idx) => (
                    <div key={idx} className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md space-y-2">
                      <div className="text-xs text-muted-foreground">Original:</div>
                      <div className="text-sm bg-muted p-2 rounded">{simp.original}</div>
                      <div className="text-xs text-muted-foreground">Simplified:</div>
                      <div className="text-sm bg-primary/10 p-2 rounded">{simp.simplified}</div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => applySimplification(simp.original, simp.simplified)}
                        className="mt-2"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Apply This Change
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* General Improvements */}
            {analysisResult?.improvements && analysisResult.improvements.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-green-600 dark:text-green-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Improvement Suggestions
                </h4>
                <div className="space-y-2">
                  {analysisResult.improvements.map((improvement, idx) => (
                    <div key={idx} className="p-3 bg-green-500/10 border border-green-500/20 rounded-md text-sm">
                      {improvement}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* No issues message */}
            {(!analysisResult?.anomalies?.length && !analysisResult?.simplifications?.length && !analysisResult?.improvements?.length) && (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <p className="font-medium">No issues found!</p>
                <p className="text-sm">Your knowledge base content looks good.</p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAnalysisDialog(false)}>
              Edit Content
            </Button>
            <Button onClick={proceedToSave}>
              <Save className="w-4 h-4 mr-2" />
              Save Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Knowledge Template Selection Dialog */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={(open) => {
        setIsTemplateDialogOpen(open);
        if (!open) {
          queryClient.removeQueries({ queryKey: ["/api/knowledge-templates"] });
        }
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Select Knowledge Template
            </DialogTitle>
            <DialogDescription>
              Choose a template that matches your business communication style
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Category filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Category:</span>
              <div className="flex gap-1 flex-wrap">
                {[
                  { value: "all", label: "All" },
                  { value: "casual", label: "Casual" },
                  { value: "formal", label: "Formal" },
                  { value: "corporate", label: "Corporate" },
                ].map((cat) => (
                  <Button
                    key={cat.value}
                    size="sm"
                    variant={templateCategory === cat.value ? "default" : "outline"}
                    onClick={() => setTemplateCategory(cat.value)}
                    data-testid={`button-filter-${cat.value}`}
                  >
                    {cat.label}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Templates list */}
            {templatesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : templatesError ? (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Failed to load templates</p>
                <p className="text-sm">Please close and reopen this dialog to try again</p>
              </div>
            ) : knowledgeTemplates.filter((t: any) => templateCategory === "all" || t.category === templateCategory).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No templates available</p>
                <p className="text-sm">Contact admin to add templates</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {knowledgeTemplates
                  .filter((t: any) => templateCategory === "all" || t.category === templateCategory)
                  .map((template: any) => (
                    <Card
                      key={template.id}
                      className={`cursor-pointer transition-all hover-elevate ${
                        selectedTemplate?.id === template.id ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => setSelectedTemplate(template)}
                      data-testid={`template-card-${template.id}`}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-sm line-clamp-1">{template.name}</CardTitle>
                          <Badge
                            className={
                              template.category === "casual"
                                ? "bg-green-500/20 text-green-700 dark:text-green-400"
                                : template.category === "formal"
                                ? "bg-blue-500/20 text-blue-700 dark:text-blue-400"
                                : "bg-purple-500/20 text-purple-700 dark:text-purple-400"
                            }
                          >
                            {template.category}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {template.description || "No description"}
                        </p>
                        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                          <span>{template.language === "id" ? "Indonesia" : "English"}</span>
                          {template.businessType && (
                            <Badge variant="outline" className="text-[10px]">{template.businessType}</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedTemplate) {
                  setIsConfirmDialogOpen(true);
                }
              }}
              disabled={!selectedTemplate}
              data-testid="button-select-template"
            >
              <Check className="w-4 h-4 mr-2" />
              Select Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Confirmation Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm Template Application</DialogTitle>
            <DialogDescription>
              Template &quot;{selectedTemplate?.name}&quot; will be applied to the knowledge base
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Content Preview:</p>
              <ScrollArea className="h-32">
                <pre className="text-xs whitespace-pre-wrap">{selectedTemplate?.content?.slice(0, 500)}...</pre>
              </ScrollArea>
            </div>
            
            <div className="space-y-3">
              <Label>Application Mode:</Label>
              <div className="space-y-2">
                <button
                  className={`w-full p-3 rounded-lg border text-left transition-colors ${
                    templateApplyMode === "replace" ? "border-primary bg-primary/10" : "border-border hover-elevate"
                  }`}
                  onClick={() => setTemplateApplyMode("replace")}
                  data-testid="button-mode-replace"
                >
                  <div className="font-medium text-sm">Replace All</div>
                  <p className="text-xs text-muted-foreground">
                    Remove existing content and replace with this template
                  </p>
                </button>
                <button
                  className={`w-full p-3 rounded-lg border text-left transition-colors ${
                    templateApplyMode === "append" ? "border-primary bg-primary/10" : "border-border hover-elevate"
                  }`}
                  onClick={() => setTemplateApplyMode("append")}
                  data-testid="button-mode-append"
                >
                  <div className="font-medium text-sm">Append</div>
                  <p className="text-xs text-muted-foreground">
                    Add this template to your existing content
                  </p>
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedTemplate) {
                  applyTemplateMutation.mutate({
                    templateId: selectedTemplate.id,
                    agentId: selectedAgentId || undefined,
                    mode: templateApplyMode,
                  });
                }
              }}
              disabled={applyTemplateMutation.isPending}
              data-testid="button-confirm-apply-template"
            >
              {applyTemplateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Apply Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
        </TabsContent>

        {/* Sources Tab */}
        <TabsContent value="sources" className="mt-4">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">
                  Add documents, text snippets, and external sources to train your AI.
                </p>
              </div>
              <Button onClick={() => setIsSourceDialogOpen(true)} data-testid="button-add-source">
                <Plus className="w-4 h-4 mr-2" />
                Add Source
              </Button>
            </div>
            
            {/* Info note about Active Sources auto-sync */}
            <div className="rounded-lg px-3 py-2.5" style={{ backgroundColor: "#27272a", color: "white" }} data-testid="info-active-sources-autosync">
              <div className="flex items-start gap-2.5 max-w-2xl">
                <Globe className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#d4d4d8" }} />
                <div className="space-y-0.5 min-w-0">
                  <p className="text-xs font-semibold" style={{ color: "white" }}>
                    Active Sources Auto-Sync
                  </p>
                  <p className="text-xs leading-snug" style={{ color: "#d4d4d8" }}>
                    <strong style={{ color: "white" }}>Website URLs</strong> auto-sync every 60 minutes. <strong style={{ color: "white" }}>Google Sheets</strong> auto-sync every 10 seconds for real-time data.
                    File uploads (Excel, PDF, Word, CSV) and Google Docs do not support auto-sync — re-upload manually if content changes.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-zinc-800 dark:bg-zinc-900 overflow-hidden" data-testid="card-transaction-template">
              <div className="flex flex-col md:flex-row">
                <div className="md:w-48 md:shrink-0">
                  <img
                    src={transactionBannerPath}
                    alt="Transaction Record Template"
                    className="w-full h-32 md:h-full object-cover"
                  />
                </div>
                <div className="p-4 flex-1 min-w-0" style={{ color: "white" }}>
                  <h3 className="font-semibold" style={{ color: "white" }}>Transaction Record Template</h3>
                  <p className="text-sm mt-1" style={{ color: "#d4d4d8" }}>
                    Track customer transactions with auto-sync every 10 seconds. AI will automatically verify transaction status when customers ask. You can add multiple Google Sheet sources.
                  </p>
                  <div className="flex flex-wrap items-center gap-1 mt-2">
                    {["Username", "Amount", "Status", "Date", "Time"].map((col) => (
                      <span key={col} className="text-xs px-2 py-0.5 rounded-md" style={{ backgroundColor: "#3f3f46", color: "#e4e4e7", border: "1px solid #52525b" }}>{col}</span>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    style={{ borderColor: "#52525b", color: "white" }}
                    onClick={() => setIsTransactionTemplateOpen(true)}
                    data-testid="button-use-template"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Use this template
                  </Button>
                </div>
              </div>
            </div>

            {/* Active Source cards (WITHDRAW, DEPOSIT, …) — moved up so they sit right under the Transaction Record Template banner */}
            {sourcesLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <Skeleton className="h-5 w-3/4" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : sources.length === 0 ? (
              <Card className="text-center py-8">
                <CardContent>
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No sources yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add documents, text, or websites to train your AI chatbot.
                  </p>
                  <Button onClick={() => setIsSourceDialogOpen(true)} data-testid="button-add-first-source">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Source
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sources.map((source) => {
                  const isGoogleSheet = source.sourceSubtype === "google_sheet";
                  const isFetching = fetchingSourceIds.has(source.id) || source.syncStatus === "syncing";
                  const countdown = isGoogleSheet ? getCountdown(source.lastSyncedAt) : 0;
                  const countdownProgress = isGoogleSheet ? ((SYNC_INTERVAL_SECONDS - countdown) / SYNC_INTERVAL_SECONDS) * 100 : 0;

                  return isGoogleSheet ? (
                    <div
                      key={source.id}
                      className={`rounded-lg overflow-hidden relative ${!(source.isActive ?? true) ? "opacity-60" : ""}`}
                      style={{ backgroundColor: "#27272a" }}
                      data-testid={`source-card-${source.id}`}
                    >
                      <div className="p-4 space-y-3" style={{ color: "white" }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="relative flex h-3 w-3 shrink-0">
                              {isFetching ? (
                                <Loader2 className="w-3 h-3 animate-spin" style={{ color: "#22c55e" }} />
                              ) : (source.isActive ?? true) ? (
                                <>
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: "#22c55e" }}></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: "#22c55e" }}></span>
                                </>
                              ) : (
                                <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: "#ef4444" }}></span>
                              )}
                            </span>
                            <SourceNameEditor
                              sourceId={source.id}
                              name={source.name}
                              onSave={(name) => updateNameMutation.mutate({ id: source.id, name })}
                            />
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Switch
                              checked={source.isActive ?? true}
                              onCheckedChange={(checked) => toggleSourceMutation.mutate({ id: source.id, isActive: checked })}
                              data-testid={`switch-source-${source.id}`}
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: "#a1a1aa" }}>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Last: {getTimeAgo(source.lastSyncedAt)}
                          </span>
                          {(source.isActive ?? true) && countdown > 0 && !isFetching && (
                            <span className="flex items-center gap-1">
                              <Zap className="w-3 h-3" style={{ color: "#facc15" }} />
                              Next in {countdown}s
                            </span>
                          )}
                          {isFetching && (
                            <span className="flex items-center gap-1" style={{ color: "#22c55e" }}>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Fetching...
                            </span>
                          )}
                        </div>

                        {source.url && (
                          <p className="text-xs truncate" style={{ color: "#71717a" }}>{source.url}</p>
                        )}

                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded border font-medium text-muted-foreground border-border/50">
                            <Globe className="w-2.5 h-2.5" />
                            Active Source
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            style={{ borderColor: "#52525b", color: "white" }}
                            onClick={() => manualFetchMutation.mutate(source.id)}
                            disabled={isFetching}
                            data-testid={`button-fetch-${source.id}`}
                          >
                            {isFetching ? (
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3 h-3 mr-1" />
                            )}
                            Fetch
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <a href={source.url || "#"} target="_blank" rel="noopener noreferrer" style={{ color: "#a1a1aa" }}>
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            style={{ color: "#a1a1aa" }}
                            onClick={() => {
                              if (confirm("Delete this source?")) {
                                deleteSourceMutation.mutate(source.id);
                              }
                            }}
                            data-testid={`button-delete-source-${source.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="h-1 w-full" style={{ backgroundColor: "#3f3f46" }}>
                        <div
                          className="h-full transition-all duration-1000 ease-linear"
                          style={{
                            width: `${isFetching ? 100 : countdownProgress}%`,
                            backgroundColor: isFetching ? "#22c55e" : "#6366f1",
                            ...(isFetching ? { animation: "pulse 1s ease-in-out infinite" } : {}),
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                  <Card key={source.id} className={!(source.isActive ?? true) ? "opacity-60" : ""}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {getSourceTypeIcon(source.type)}
                          <CardTitle className="text-base truncate">{source.name}</CardTitle>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="relative flex h-2.5 w-2.5" title={(source.isActive ?? true) ? "Active" : "Disabled"}>
                            {(source.isActive ?? true) ? (
                              <>
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                              </>
                            ) : (
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                            )}
                          </span>
                          {source.syncStatus === "syncing" && (
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {source.type.replace("-", " ")}
                      </Badge>
                      {source.lastSyncedAt && (
                        <p className="text-xs text-muted-foreground">
                          Last synced: {formatDate(source.lastSyncedAt)}
                        </p>
                      )}
                      {source.content && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {source.content.substring(0, 100)}...
                        </p>
                      )}
                    </CardContent>
                    <CardFooter className="flex items-center justify-between gap-2 pt-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={source.isActive ?? true}
                          onCheckedChange={(checked) => toggleSourceMutation.mutate({ id: source.id, isActive: checked })}
                          data-testid={`switch-source-${source.id}`}
                        />
                        <Label className="text-xs text-muted-foreground">
                          {(source.isActive ?? true) ? "Active" : "Disabled"}
                        </Label>
                      </div>
                      <div className="flex items-center gap-1">
                        {source.type === "website" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => requestUpdateMutation.mutate(source.id)}
                            disabled={requestUpdateMutation.isPending || source.syncStatus === "syncing"}
                            title="Request update"
                            data-testid={`button-update-source-${source.id}`}
                          >
                            <RefreshCw className={`w-4 h-4 ${source.syncStatus === "syncing" ? "animate-spin" : ""}`} />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Delete this source?")) {
                              deleteSourceMutation.mutate(source.id);
                            }
                          }}
                          data-testid={`button-delete-source-${source.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                  );
                })}
              </div>
            )}

            {/* Reset Password via Google Sheet — Configuration Card */}
            <Card data-testid="card-password-recovery">
              <CardHeader className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 shrink-0 text-muted-foreground" />
                      <CardTitle className="text-base">Reset Password via Google Sheet</CardTitle>
                    </div>
                    <CardDescription>
                      AI bantu customer reset password dengan cek data di Google Sheet kamu.
                    </CardDescription>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="status-password-recovery">
                        <span
                          className={
                            "inline-block w-2 h-2 rounded-full " +
                            (!prEnabled
                              ? "bg-zinc-400 dark:bg-zinc-500"
                              : isSheetConnected
                                ? "bg-emerald-500"
                                : "bg-amber-500")
                          }
                        />
                        <span>
                          {!prEnabled
                            ? "Nonaktif"
                            : isSheetConnected
                              ? "Aktif & Sheet terhubung"
                              : "Aktif — sheet belum terhubung"}
                        </span>
                      </div>
                      {prConfig?.lastSyncedAt && (
                        <Badge variant="secondary" className="font-normal" data-testid="badge-last-synced">
                          Terakhir disinkron {formatDistanceToNow(new Date(prConfig.lastSyncedAt), { addSuffix: true, locale: idLocale })}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm text-muted-foreground">{prEnabled ? "Aktif" : "Nonaktif"}</span>
                    <Switch
                      checked={prEnabled}
                      onCheckedChange={setPrEnabled}
                      data-testid="switch-password-recovery-enabled"
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                {/* Step 1 — Prepare Google Sheet */}
                <div className="flex gap-3 md:col-span-2 lg:col-span-2">
                  <Badge variant="secondary" className="rounded-full w-6 h-6 flex items-center justify-center p-0 shrink-0 mt-0.5">1</Badge>
                  <div className="flex-1 min-w-0 space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold">Siapkan Google Sheet kamu</h4>
                      <p className="text-xs text-muted-foreground mt-1">Salin template di bawah ini ke Google Drive kamu — sheet ini berfungsi sebagai database user untuk verifikasi & reset password.</p>
                    </div>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={() => window.open("https://docs.google.com/spreadsheets/d/1yFI99lGO5pfxNBB-1cz8jTUT3VeZbINcvl6xvOO_KLo/copy", "_blank", "noopener,noreferrer")}
                      data-testid="button-copy-password-recovery-template"
                    >
                      <Copy className="w-4 h-4 mr-1.5" />
                      Salin Template Google Sheet
                      <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                    <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Kolom wajib di sheet kamu</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[
                          { col: "Number", note: "Nomor baris — dipakai Apps Script untuk update baris yang tepat." },
                          { col: "Username", note: "ID user (kunci utama)." },
                          { col: "Registered Bank Account", note: "Nama bank — untuk verifikasi identitas." },
                          { col: "Phone Number", note: "No HP terdaftar — verifikasi tambahan." },
                          { col: "Current Password", note: "Dikembalikan saat customer minta lihat password." },
                          { col: "New Password", note: "Diisi otomatis oleh Apps Script saat reset selesai." },
                          { col: "Status", note: "normal → request → ok" },
                        ].map(({ col, note }) => (
                          <div key={col} className="space-y-0.5">
                            <Badge variant="outline" className="font-mono text-[11px]">{col}</Badge>
                            <p className="text-[11px] text-muted-foreground leading-snug">{note}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 2 — Paste CSV link */}
                <div className="flex gap-3">
                  <Badge variant="secondary" className="rounded-full w-6 h-6 flex items-center justify-center p-0 shrink-0 mt-0.5">2</Badge>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-semibold">Tempel link CSV Sheet kamu</h4>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-muted-foreground hover-elevate rounded-sm" data-testid="tooltip-csv-help">
                            <HelpCircle className="w-3.5 h-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs">Cara dapat link CSV: di Google Sheet pilih <strong>File → Bagikan → Publikasikan ke web → format CSV</strong>, lalu salin URL-nya ke sini.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Label htmlFor="pr-csv-url" className="text-xs text-muted-foreground">Link CSV Sheet</Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        id="pr-csv-url"
                        value={prSheetUrl}
                        onChange={(e) => { setPrSheetUrl(e.target.value); setPrTestResult(null); }}
                        placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv"
                        data-testid="input-password-recovery-sheet-url"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="default"
                        disabled={!prSheetUrl.includes("docs.google.com") || prIsTesting}
                        className="whitespace-nowrap"
                        data-testid="button-test-password-recovery-sheet"
                        onClick={async () => {
                          setPrIsTesting(true);
                          setPrTestResult(null);
                          try {
                            const res = await apiRequest("POST", "/api/merchant/password-recovery-config/test-sheet", { sheetCsvUrl: prSheetUrl });
                            const data = await res.json();
                            setPrTestResult({ success: data.success, message: data.message || data.error });
                          } catch {
                            setPrTestResult({ success: false, message: "Gagal menghubungkan ke sheet" });
                          } finally {
                            setPrIsTesting(false);
                          }
                        }}
                      >
                        {prIsTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        <span className="ml-1.5">Tes Koneksi</span>
                      </Button>
                    </div>
                    {prTestResult && (
                      <Badge
                        variant={prTestResult.success ? "default" : "destructive"}
                        className="gap-1 font-normal"
                        data-testid="badge-test-result"
                      >
                        {prTestResult.success ? <CheckCircle2 className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {prTestResult.message}
                      </Badge>
                    )}
                    <p className="text-xs text-muted-foreground">Pastikan sheet sudah dipublikasikan agar bisa diakses publik.</p>
                    <div
                      className="rounded-md border border-border/50 bg-zinc-200 dark:bg-zinc-800 min-h-[180px] flex items-center justify-center overflow-hidden p-4"
                      data-testid="placeholder-password-recovery-sheet"
                    >
                      {isSheetConnected ? (
                        <div className="flex flex-col items-center gap-1">
                          <SiGooglesheets className="w-12 h-12 text-emerald-500" />
                          <p className="text-xs text-muted-foreground mt-2">Sheet terhubung</p>
                        </div>
                      ) : (
                        <div className="w-full space-y-2">
                          <Skeleton className="h-3 w-3/4 bg-zinc-300 dark:bg-zinc-700" />
                          <Skeleton className="h-3 w-1/2 bg-zinc-300 dark:bg-zinc-700" />
                          <Skeleton className="h-3 w-2/3 bg-zinc-300 dark:bg-zinc-700" />
                          <Skeleton className="h-3 w-2/5 bg-zinc-300 dark:bg-zinc-700" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Step 3 — Apps Script (optional, collapsible) */}
                <div className="flex gap-3">
                  <Badge variant="secondary" className="rounded-full w-6 h-6 flex items-center justify-center p-0 shrink-0 mt-0.5">3</Badge>
                  <div className="flex-1 min-w-0">
                    <Collapsible open={prAdvancedOpen} onOpenChange={setPrAdvancedOpen}>
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="w-full flex items-center justify-between gap-2 text-left rounded-md hover-elevate p-1 -m-1"
                          data-testid="toggle-password-recovery-advanced"
                        >
                          <div>
                            <h4 className="text-sm font-semibold">Aktifkan reset otomatis lewat Apps Script <span className="text-xs font-normal text-muted-foreground">(opsional)</span></h4>
                            <p className="text-xs text-muted-foreground mt-0.5">Lewati langkah ini kalau cukup pakai mode lihat password saja.</p>
                          </div>
                          {prAdvancedOpen ? <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />}
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2 pt-3">
                        <div className="flex items-center gap-1.5">
                          <Label htmlFor="pr-writeback-url" className="text-xs text-muted-foreground">Link Apps Script Web App</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground hover-elevate rounded-sm" data-testid="tooltip-writeback-help">
                                <HelpCircle className="w-3.5 h-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-xs mb-1">Server akan POST payload ini ke link Apps Script kamu:</p>
                              <code className="block text-[11px] bg-muted/50 px-2 py-1 rounded font-mono">{"{ rowNumber, newStatus: \"request\" }"}</code>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Input
                          id="pr-writeback-url"
                          value={prWriteBackUrl}
                          onChange={(e) => setPrWriteBackUrl(e.target.value)}
                          placeholder="https://script.google.com/macros/s/.../exec"
                          data-testid="input-password-recovery-writeback-url"
                        />
                        <p className="text-xs text-muted-foreground">
                          Saat customer minta reset, Apps Script kamu akan dipanggil agar bisa cari baris yang tepat, generate password baru, dan tulis kembali ke sheet.
                        </p>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </div>

                {/* Step 4 — Customize messages (optional, collapsible) */}
                <div className="flex gap-3">
                  <Badge variant="secondary" className="rounded-full w-6 h-6 flex items-center justify-center p-0 shrink-0 mt-0.5">4</Badge>
                  <div className="flex-1 min-w-0">
                    <Collapsible open={prMessagesOpen} onOpenChange={setPrMessagesOpen}>
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="w-full flex items-center justify-between gap-2 text-left rounded-md hover-elevate p-1 -m-1"
                          data-testid="toggle-password-recovery-messages"
                        >
                          <div>
                            <h4 className="text-sm font-semibold">Sesuaikan pesan & instruksi AI <span className="text-xs font-normal text-muted-foreground">(opsional)</span></h4>
                            <p className="text-xs text-muted-foreground mt-0.5">Atur pesan pembuka form dan tambahan instruksi untuk AI.</p>
                          </div>
                          {prMessagesOpen ? <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />}
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-4 pt-3">
                        <div className="space-y-2">
                          <Label htmlFor="pr-form-intro" className="text-xs text-muted-foreground">Pesan Pembuka Form</Label>
                          <Textarea
                            id="pr-form-intro"
                            value={prFormIntroText}
                            onChange={(e) => setPrFormIntroText(e.target.value)}
                            placeholder="Contoh: Silakan isi form di bawah ini untuk mengajukan reset password kamu:"
                            rows={2}
                            className="resize-none"
                            data-testid="input-password-recovery-form-intro"
                          />
                          <p className="text-xs text-muted-foreground">
                            Ditampilkan ke customer sebelum form reset muncul. Kalau dikosongkan, AI akan generate kalimatnya sendiri (atau pakai default berdasarkan bahasa terdeteksi).
                          </p>
                          {prFormIntroText.trim() && (
                            <div className="space-y-1.5 pt-1">
                              <p className="text-xs font-medium text-muted-foreground">Pratinjau di widget:</p>
                              <div className="rounded-md border bg-muted/30 p-3">
                                <div className="flex items-end gap-2">
                                  <Avatar className="flex-shrink-0 h-7 w-7">
                                    <AvatarImage src={selectedAgent?.photoUrl || ""} alt={selectedAgent?.name || "Agent"} />
                                    <AvatarFallback className="text-[10px] font-bold">
                                      {selectedAgent?.name ? selectedAgent.name.slice(0, 2).toUpperCase() : <Bot className="w-3 h-3" />}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div
                                    className="rounded-2xl rounded-bl-sm px-3 py-2 text-sm leading-snug bg-background border max-w-[80%] break-words"
                                    data-testid="preview-form-intro-message"
                                  >
                                    {prFormIntroText}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="pr-instructions" className="text-xs text-muted-foreground">Instruksi Tambahan untuk AI</Label>
                          <Textarea
                            id="pr-instructions"
                            value={prInstructions}
                            onChange={(e) => setPrInstructions(e.target.value)}
                            placeholder="Contoh: Minta nomor HP terdaftar customer sebelum melanjutkan..."
                            rows={2}
                            className="resize-none"
                            data-testid="input-password-recovery-instructions"
                          />
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </div>

                {/* Step 5 — Save & activate */}
                <div className="flex gap-3">
                  <Badge variant="secondary" className="rounded-full w-6 h-6 flex items-center justify-center p-0 shrink-0 mt-0.5">5</Badge>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold">Simpan & aktifkan</h4>
                    <p className="text-xs text-muted-foreground mt-1">Tekan tombol di bawah untuk menyimpan konfigurasi. Pastikan toggle di pojok kanan atas sudah aktif kalau ingin AI mulai menangani permintaan reset password.</p>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-wrap gap-2 justify-between">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="default"
                    size="default"
                    disabled={prIsSaving}
                    data-testid="button-save-password-recovery-config"
                    onClick={async () => {
                      setPrIsSaving(true);
                      try {
                        const res = await apiRequest("POST", "/api/merchant/password-recovery-config", {
                          sheetCsvUrl: prSheetUrl,
                          writeBackUrl: prWriteBackUrl,
                          isActive: prEnabled,
                          aiInstructions: prInstructions,
                          formIntroText: prFormIntroText,
                          agentId: selectedAgentId || null,
                        });
                        // Seed the query cache with the saved config so the badge & placeholder
                        // reflect reality immediately and the load-effect doesn't race-overwrite
                        // the user's toggle state with a stale cached value.
                        try {
                          const saved = await res.json();
                          queryClient.setQueryData(["/api/merchant/password-recovery-config", selectedAgentId], saved);
                        } catch {}
                        queryClient.invalidateQueries({ queryKey: ["/api/merchant/password-recovery-config", selectedAgentId] });
                        toast({ title: "Konfigurasi tersimpan", description: prEnabled ? "AI sekarang akan menangani permintaan reset password." : "Reset password sedang nonaktif." });
                      } catch {
                        toast({ title: "Gagal menyimpan konfigurasi", variant: "destructive" });
                      } finally {
                        setPrIsSaving(false);
                      }
                    }}
                  >
                    {prIsSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
                    Simpan Konfigurasi
                  </Button>

                  {prConfig && (
                    <Button
                      type="button"
                      variant="outline"
                      size="default"
                      disabled={prIsFetching || !prConfig.sheetCsvUrl}
                      data-testid="button-manual-fetch-password-recovery"
                      onClick={async () => {
                        setPrIsFetching(true);
                        try {
                          const res = await apiRequest("POST", "/api/merchant/password-recovery-config/manual-fetch", { agentId: selectedAgentId || null });
                          const data = await res.json();
                          // Patch lastSyncedAt into the cached config so the badge updates
                          // immediately without re-applying stale fields onto local state.
                          queryClient.setQueryData(
                            ["/api/merchant/password-recovery-config", selectedAgentId],
                            (old: any) => old ? { ...old, lastSyncedAt: data.lastSyncedAt || new Date().toISOString() } : old,
                          );
                          queryClient.invalidateQueries({ queryKey: ["/api/merchant/password-recovery-config", selectedAgentId] });
                          toast({ title: "Sheet berhasil disinkron", description: data.message || "Data terbaru sudah diambil." });
                        } catch {
                          toast({ title: "Gagal sinkron sheet", variant: "destructive" });
                        } finally {
                          setPrIsFetching(false);
                        }
                      }}
                    >
                      {prIsFetching ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
                      Sinkron Sekarang
                    </Button>
                  )}
                </div>

                {prConfig && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    data-testid="button-delete-password-recovery-config"
                    onClick={() => setPrDeleteDialogOpen(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    Hapus Konfigurasi
                  </Button>
                )}
              </CardFooter>
            </Card>

            {/* Delete confirmation dialog */}
            <AlertDialog open={prDeleteDialogOpen} onOpenChange={setPrDeleteDialogOpen}>
              <AlertDialogContent data-testid="dialog-delete-password-recovery">
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus konfigurasi reset password?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Konfigurasi sheet, link Apps Script, dan semua instruksi AI akan dihapus. Customer tidak akan bisa lagi mengajukan reset password sampai konfigurasi baru dibuat.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-delete-password-recovery">Batal</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    data-testid="button-confirm-delete-password-recovery"
                    onClick={async () => {
                      try {
                        const deleteUrl = selectedAgentId
                          ? `/api/merchant/password-recovery-config?agentId=${selectedAgentId}`
                          : `/api/merchant/password-recovery-config`;
                        await apiRequest("DELETE", deleteUrl);
                        setPrSheetUrl("");
                        setPrWriteBackUrl("");
                        setPrEnabled(false);
                        setPrInstructions("");
                        setPrFormIntroText("");
                        // Clear the cached config so the load-effect doesn't re-apply
                        // the just-deleted values back into local state.
                        queryClient.setQueryData(["/api/merchant/password-recovery-config", selectedAgentId], null);
                        queryClient.invalidateQueries({ queryKey: ["/api/merchant/password-recovery-config", selectedAgentId] });
                        toast({ title: "Konfigurasi dihapus" });
                      } catch {
                        toast({ title: "Gagal menghapus konfigurasi", variant: "destructive" });
                      } finally {
                        setPrDeleteDialogOpen(false);
                      }
                    }}
                  >
                    Hapus
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Riwayat Reset Password */}
            <Card data-testid="card-password-recovery-history">
              <CardHeader className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <CardTitle className="text-base">Riwayat Reset Password</CardTitle>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {prRequestsLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    <span>Diperbarui otomatis setiap 10 detik</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {prRequestsLoading && prRequests.length === 0 ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-9 w-full rounded-md" />
                    ))}
                  </div>
                ) : prRequestsError ? (
                  <Alert variant="destructive" data-testid="alert-pr-history-error">
                    <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <span>Gagal memuat riwayat permintaan. Sistem akan mencoba lagi otomatis.</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/merchant/password-recovery-requests/list"] })}
                        data-testid="button-pr-history-retry"
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                        Coba lagi
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : prRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-center" data-testid="empty-pr-history">
                    <InboxIcon className="w-8 h-8 text-muted-foreground" />
                    <p className="text-sm font-medium">Belum ada permintaan reset password.</p>
                    <p className="text-xs text-muted-foreground max-w-sm">Permintaan akan muncul di sini saat customer mengajukan reset atau lihat password.</p>
                  </div>
                ) : (() => {
                  const sorted = [...prRequests].sort((a, b) => {
                    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return tb - ta;
                  });
                  const statusLabel: Record<string, string> = {
                    pending: "Menunggu",
                    ready: "Siap",
                    delivered: "Terkirim",
                    failed: "Gagal",
                  };
                  const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
                    pending: "secondary",
                    ready: "default",
                    delivered: "outline",
                    failed: "destructive",
                  };
                  const statusExtraClass: Record<string, string> = {
                    delivered: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                  };
                  const fmt = (d?: string | Date | null) => d ? new Date(d).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }) : "—";
                  return (
                    <>
                      {/* Desktop / tablet: table */}
                      <div className="hidden sm:block overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">ID Tiket</TableHead>
                              <TableHead className="text-xs">Username</TableHead>
                              <TableHead className="text-xs">Rekening</TableHead>
                              <TableHead className="text-xs">Tipe</TableHead>
                              <TableHead className="text-xs">Status</TableHead>
                              <TableHead className="text-xs">Dibuat</TableHead>
                              <TableHead className="text-xs">Dikirim</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sorted.map((req) => (
                              <TableRow key={req.id} data-testid={`row-pr-request-${req.id}`}>
                                <TableCell className="font-mono text-xs text-muted-foreground" title={req.id} data-testid={`text-pr-id-${req.id}`}>
                                  {req.id.slice(0, 8)}…
                                </TableCell>
                                <TableCell className="font-mono text-xs" data-testid={`text-pr-username-${req.id}`}>
                                  {req.username}
                                </TableCell>
                                <TableCell className="text-xs" data-testid={`text-pr-bank-${req.id}`}>
                                  {req.bankAccount || <span className="text-muted-foreground">—</span>}
                                </TableCell>
                                <TableCell data-testid={`text-pr-type-${req.id}`}>
                                  <Badge variant="outline" className="font-normal">
                                    {req.requestType === "reset" ? "Reset" : "Lihat"}
                                  </Badge>
                                </TableCell>
                                <TableCell data-testid={`text-pr-status-${req.id}`}>
                                  <Badge variant={statusVariant[req.status] || "secondary"} className={"font-normal " + (statusExtraClass[req.status] || "")}>
                                    {statusLabel[req.status] || req.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground" data-testid={`text-pr-created-${req.id}`}>
                                  {fmt(req.createdAt)}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground" data-testid={`text-pr-delivered-${req.id}`}>
                                  {fmt(req.deliveredAt)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Mobile: stacked cards */}
                      <div className="sm:hidden space-y-2">
                        {sorted.map((req) => (
                          <Card key={req.id} className="p-3" data-testid={`card-pr-request-${req.id}`}>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="space-y-0.5 min-w-0">
                                <p className="font-mono text-sm truncate" data-testid={`text-pr-username-mobile-${req.id}`}>{req.username}</p>
                                <p className="font-mono text-[11px] text-muted-foreground" title={req.id}>{req.id.slice(0, 8)}…</p>
                              </div>
                              <Badge variant={statusVariant[req.status] || "secondary"} className={"font-normal shrink-0 " + (statusExtraClass[req.status] || "")}>
                                {statusLabel[req.status] || req.status}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                              <div className="text-muted-foreground">Rekening</div>
                              <div className="text-right">{req.bankAccount || "—"}</div>
                              <div className="text-muted-foreground">Tipe</div>
                              <div className="text-right">{req.requestType === "reset" ? "Reset" : "Lihat"}</div>
                              <div className="text-muted-foreground">Dibuat</div>
                              <div className="text-right">{fmt(req.createdAt)}</div>
                              <div className="text-muted-foreground">Dikirim</div>
                              <div className="text-right">{fmt(req.deliveredAt)}</div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>

            <Dialog open={isTransactionTemplateOpen} onOpenChange={(open) => { setIsTransactionTemplateOpen(open); if (!open) setTransactionTemplateUrl(""); }}>
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
                      onClick={() => window.open(TRANSACTION_TEMPLATE_URL, "_blank")}
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
                      value={transactionTemplateUrl}
                      onChange={(e) => setTransactionTemplateUrl(e.target.value)}
                      data-testid="input-template-url"
                    />
                  </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => { setIsTransactionTemplateOpen(false); setTransactionTemplateUrl(""); }}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => transactionTemplateMutation.mutate(transactionTemplateUrl)}
                    disabled={!transactionTemplateUrl.includes("docs.google.com/spreadsheets") || transactionTemplateMutation.isPending}
                    data-testid="button-add-template"
                  >
                    {transactionTemplateMutation.isPending ? (
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
          </div>

          {/* Add Source Dialog */}
          <Dialog open={isSourceDialogOpen} onOpenChange={handleSourceDialogClose}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Knowledge Source</DialogTitle>
                <DialogDescription>
                  Add a document, text, or URL to train your AI chatbot.
                </DialogDescription>
              </DialogHeader>
              <Form {...sourceForm}>
                <form onSubmit={sourceForm.handleSubmit(onSourceSubmit)} className="space-y-4">
                  <FormField
                    control={sourceForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source Type</FormLabel>
                        <Select onValueChange={(v) => { field.onChange(v); sourceForm.setValue("content", ""); sourceForm.setValue("url", ""); setUploadedFileName(""); setSelectedFile(null); }} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-source-type">
                              <SelectValue placeholder="Select type..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="file">Upload File (PDF, Word, Excel)</SelectItem>
                            <SelectItem value="text">Plain Text</SelectItem>
                            <SelectItem value="website">Website URL</SelectItem>
                            <SelectItem value="google-doc">Google Docs</SelectItem>
                            <SelectItem value="google-sheet">Google Sheets</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={sourceForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Source name..." {...field} data-testid="input-source-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {sourceForm.watch("type") === "file" && (
                    <div className="space-y-2">
                      <Label>File</Label>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.md,.csv,.json,.xml,.html"
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => fileInputRef.current?.click()}
                        data-testid="button-select-file"
                      >
                        {uploadedFileName ? (
                          <span className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            {uploadedFileName}
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            Select File
                          </span>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Supported: PDF, Word, Excel, TXT, MD, CSV, JSON, XML, HTML
                      </p>
                    </div>
                  )}

                  {sourceForm.watch("type") === "text" && (
                    <FormField
                      control={sourceForm.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Content</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter text content..."
                              className="min-h-[120px]"
                              {...field}
                              data-testid="textarea-source-content"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {sourceForm.watch("type") === "website" && (
                    <FormField
                      control={sourceForm.control}
                      name="url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://example.com" {...field} data-testid="input-source-url" />
                          </FormControl>
                          <FormDescription>The URL will be crawled and content extracted.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {sourceForm.watch("type") === "google-doc" && (
                    <FormField
                      control={sourceForm.control}
                      name="url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Google Docs URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://docs.google.com/document/d/..." {...field} data-testid="input-google-doc-url" />
                          </FormControl>
                          <FormDescription>Make sure the document is shared as "Anyone with the link can view".</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {sourceForm.watch("type") === "google-sheet" && (
                    <FormField
                      control={sourceForm.control}
                      name="url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Google Sheets URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://docs.google.com/spreadsheets/d/..." {...field} data-testid="input-google-sheet-url" />
                          </FormControl>
                          <FormDescription>Make sure the sheet is shared as "Anyone with the link can view".</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button type="button" variant="outline" onClick={() => handleSourceDialogClose(false)}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSourceSubmitting || (sourceForm.watch("type") === "file" && !uploadedFileName) || ((sourceForm.watch("type") === "google-doc" || sourceForm.watch("type") === "google-sheet") && !sourceForm.watch("url"))}
                      data-testid="button-submit-source"
                    >
                      {isSourceSubmitting ? (
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
        </TabsContent>

        {/* Help Articles Tab */}
        <TabsContent value="articles" className="mt-4">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search articles..."
                    value={articleSearchQuery}
                    onChange={(e) => setArticleSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-articles"
                  />
                </div>
                <Select value={articleStatusFilter} onValueChange={setArticleStatusFilter}>
                  <SelectTrigger className="w-[120px]" data-testid="select-status-filter">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => {
                  setSelectedArticle(null);
                  setEditorForm({
                    title: "",
                    content: "",
                    tags: [],
                    category: "",
                    status: "draft",
                    businessType: "",
                    businessCategory: "",
                  });
                  setIsEditorOpen(true);
                }} data-testid="button-new-article">
                  <Plus className="w-4 h-4 mr-2" />
                  New Article
                </Button>
                <Button onClick={() => setIsGenerateOpen(true)} data-testid="button-ai-generate">
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Generate
                </Button>
              </div>
            </div>

            {/* Articles List */}
            {articlesLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            ) : filteredArticles.length === 0 ? (
              <Card className="py-12">
                <CardContent className="text-center">
                  <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No articles yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first help article or let AI generate one for you.
                  </p>
                  <Button onClick={() => setIsGenerateOpen(true)}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate with AI
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredArticles.map((article) => (
                  <Card key={article.id} className="hover-elevate cursor-pointer flex flex-col" data-testid={`card-article-${article.id}`}>
                    <CardHeader className="pb-2 flex-shrink-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <BookOpen className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1 mb-1">
                              <Badge variant="outline" className="text-[9px] gap-0.5 px-1.5 py-0 text-primary border-primary/30 flex-shrink-0">
                                <Sparkles className="w-2.5 h-2.5" />
                                AI Generated
                              </Badge>
                            </div>
                            <CardTitle className="text-sm font-semibold line-clamp-2 leading-snug">{article.title}</CardTitle>
                          </div>
                        </div>
                        <Badge
                          variant={article.status === "published" ? "default" : article.status === "archived" ? "secondary" : "outline"}
                          className="text-[10px] flex-shrink-0"
                        >
                          {article.status}
                        </Badge>
                      </div>
                      {article.businessType && (
                        <p className="text-[10px] text-muted-foreground mt-1 pl-10">
                          {getBusinessTypeLabel(article.businessType)}{article.businessCategory ? ` · ${getCategoryLabel(article.businessType, article.businessCategory)}` : ""}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="pb-2 flex-1">
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {article.content.substring(0, 200)}
                      </p>
                      <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground/70">
                        <FileText className="w-3 h-3" />
                        <span>{article.content.length.toLocaleString()} chars</span>
                      </div>
                      {article.tags && article.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {article.tags.slice(0, 3).map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px]">
                              {tag}
                            </Badge>
                          ))}
                          {article.tags.length > 3 && (
                            <Badge variant="secondary" className="text-[10px]">+{article.tags.length - 3}</Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="pt-2 flex justify-between flex-shrink-0 border-t border-border/40 mt-auto">
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatDate(article.updatedAt || article.createdAt)}
                      </div>
                      <div className="flex items-center gap-0.5">
                        <Button size="icon" variant="ghost" onClick={(e) => {
                          e.stopPropagation();
                          setSelectedArticle(article);
                          setIsViewOpen(true);
                        }} data-testid={`button-view-${article.id}`}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={(e) => {
                          e.stopPropagation();
                          setSelectedArticle(article);
                          setEditorForm({
                            title: article.title,
                            content: article.content,
                            tags: article.tags || [],
                            category: article.category || "",
                            status: article.status || "draft",
                            businessType: article.businessType || "",
                            businessCategory: article.businessCategory || "",
                          });
                          setIsEditorOpen(true);
                        }} data-testid={`button-edit-${article.id}`}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Are you sure you want to delete this article?")) {
                            deleteArticleMutation.mutate(article.id);
                          }
                        }} data-testid={`button-delete-${article.id}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* AI Generate Dialog */}
      <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Generate Article
            </DialogTitle>
            <DialogDescription>
              Let AI create a help center article based on your business type and category.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Business Type</Label>
              <Select value={generateForm.businessType} onValueChange={(v) => setGenerateForm({ ...generateForm, businessType: v, category: "" })}>
                <SelectTrigger data-testid="select-business-type">
                  <SelectValue placeholder="Select business type..." />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={generateForm.category} onValueChange={(v) => setGenerateForm({ ...generateForm, category: v })} disabled={!generateForm.businessType}>
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {getCategoriesForBusinessType(generateForm.businessType).map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Specific Topic (Optional)</Label>
              <Input
                placeholder="e.g., Return Policy, Size Guide..."
                value={generateForm.topic}
                onChange={(e) => setGenerateForm({ ...generateForm, topic: e.target.value })}
                data-testid="input-topic"
              />
            </div>
            <div className="space-y-2">
              <Label>Additional Business Info (Optional)</Label>
              <Textarea
                placeholder="Add specific details about your business that should be included..."
                value={generateForm.businessInfo}
                onChange={(e) => setGenerateForm({ ...generateForm, businessInfo: e.target.value })}
                className="min-h-[80px]"
                data-testid="textarea-business-info"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGenerateOpen(false)}>{t("dashboard.common.cancel")}</Button>
            <Button 
              onClick={() => generateMutation.mutate(generateForm)} 
              disabled={!generateForm.businessType || !generateForm.category || generateMutation.isPending}
              data-testid="button-generate"
            >
              {generateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Article Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedArticle ? "Edit Article" : "New Article"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={editorForm.title}
                onChange={(e) => setEditorForm({ ...editorForm, title: e.target.value })}
                placeholder="Article title..."
                data-testid="input-article-title"
              />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={editorForm.content}
                onChange={(e) => setEditorForm({ ...editorForm, content: e.target.value })}
                placeholder="Article content (supports Markdown)..."
                className="min-h-[300px] font-mono text-sm"
                data-testid="textarea-article-content"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editorForm.status} onValueChange={(v) => setEditorForm({ ...editorForm, status: v })}>
                  <SelectTrigger data-testid="select-article-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add tag..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newTag.trim()) {
                        e.preventDefault();
                        setEditorForm({ ...editorForm, tags: [...editorForm.tags, newTag.trim()] });
                        setNewTag("");
                      }
                    }}
                    data-testid="input-new-tag"
                  />
                  <Button type="button" size="icon" variant="outline" onClick={() => {
                    if (newTag.trim()) {
                      setEditorForm({ ...editorForm, tags: [...editorForm.tags, newTag.trim()] });
                      setNewTag("");
                    }
                  }}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {editorForm.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {editorForm.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {tag}
                        <button onClick={() => setEditorForm({ ...editorForm, tags: editorForm.tags.filter((_, idx) => idx !== i) })}>
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditorOpen(false)}>{t("dashboard.common.cancel")}</Button>
            <Button 
              onClick={() => saveArticleMutation.mutate(editorForm)} 
              disabled={!editorForm.title || !editorForm.content || saveArticleMutation.isPending}
              data-testid="button-save-article"
            >
              {saveArticleMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Article Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedArticle?.title}</DialogTitle>
            {selectedArticle?.businessType && (
              <DialogDescription>
                {getBusinessTypeLabel(selectedArticle.businessType)} • {getCategoryLabel(selectedArticle.businessType, selectedArticle.businessCategory || "")}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="py-4">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="whitespace-pre-wrap">{selectedArticle?.content}</div>
            </div>
            {selectedArticle?.tags && selectedArticle.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-4 pt-4 border-t">
                {selectedArticle.tags.map((tag, i) => (
                  <Badge key={i} variant="secondary">{tag}</Badge>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
            <Button onClick={() => {
              setIsViewOpen(false);
              if (selectedArticle) {
                setEditorForm({
                  title: selectedArticle.title,
                  content: selectedArticle.content,
                  tags: selectedArticle.tags || [],
                  category: selectedArticle.category || "",
                  status: selectedArticle.status || "draft",
                  businessType: selectedArticle.businessType || "",
                  businessCategory: selectedArticle.businessCategory || "",
                });
                setIsEditorOpen(true);
              }
            }}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Preview Confirmation Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsPreviewDialogOpen(false);
          setFilePreview(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              {t("dashboard.knowledge.fileSuccessRead")}
            </DialogTitle>
            <DialogDescription>
              {t("dashboard.knowledge.fileSuccessReadDesc")}
            </DialogDescription>
          </DialogHeader>
          
          {filePreview && (
            <div className="space-y-4" data-testid="file-preview-content">
              {/* File Info Card */}
              <Card className="bg-muted/50" data-testid="card-file-info">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {filePreview.metadata?.fileType === 'PDF' && <FileText className="w-5 h-5 text-red-500" />}
                      {filePreview.metadata?.fileType === 'Word' && <FileText className="w-5 h-5 text-blue-500" />}
                      {filePreview.metadata?.fileType === 'Excel' && <FileText className="w-5 h-5 text-green-500" />}
                      {filePreview.metadata?.fileType === 'CSV' && <FileText className="w-5 h-5 text-orange-500" />}
                      {filePreview.metadata?.fileType === 'Google Doc' && <FileText className="w-5 h-5 text-blue-600" />}
                      {filePreview.metadata?.fileType === 'Google Sheet' && <FileText className="w-5 h-5 text-green-600" />}
                      {!filePreview.metadata?.fileType && <FileText className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate" data-testid="text-file-name">{filePreview.fileName}</p>
                      <p className="text-xs text-muted-foreground" data-testid="text-file-type">
                        {filePreview.metadata?.fileType || 'Document'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Database className="w-3.5 h-3.5" />
                      <span>Size: {filePreview.fileSize >= 1024 * 1024 
                        ? `${(filePreview.fileSize / (1024 * 1024)).toFixed(2)} MB`
                        : `${(filePreview.fileSize / 1024).toFixed(1)} KB`}</span>
                    </div>
                    
                    {filePreview.metadata?.pageCount && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <FileText className="w-3.5 h-3.5" />
                        <span>{filePreview.metadata.pageCount} halaman</span>
                      </div>
                    )}
                    
                    {filePreview.metadata?.sheetCount && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <FileText className="w-3.5 h-3.5" />
                        <span>{filePreview.metadata.sheetCount} sheet</span>
                      </div>
                    )}
                    
                    {filePreview.metadata?.lineCount && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Type className="w-3.5 h-3.5" />
                        <span>{filePreview.metadata.lineCount} baris</span>
                      </div>
                    )}
                    
                    {filePreview.metadata?.wordCount && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{filePreview.metadata.wordCount.toLocaleString()} kata</span>
                      </div>
                    )}
                    
                    {filePreview.metadata?.charCount && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Database className="w-3.5 h-3.5" />
                        <span>{filePreview.metadata.charCount.toLocaleString()} karakter</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Summary */}
              {filePreview.metadata?.summary && (
                <div className="space-y-2" data-testid="section-file-summary">
                  <p className="text-sm font-medium">{t("dashboard.knowledge.contentSummary")}</p>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg" data-testid="text-file-summary">
                    {filePreview.metadata.summary}
                  </p>
                </div>
              )}
              
              {/* Info note about Active Sources */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm" data-testid="info-file-preview-note">
                <HelpCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-blue-700 dark:text-blue-300">
                  {t("dashboard.knowledge.fileAddNote")}
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setIsPreviewDialogOpen(false);
                setFilePreview(null);
              }}
            >
              {t("dashboard.common.cancel")}
            </Button>
            <Button
              onClick={confirmAndSaveSource}
              disabled={uploadFileMutation.isPending || googleDocMutation.isPending || googleSheetMutation.isPending}
              data-testid="button-confirm-source"
            >
              {(uploadFileMutation.isPending || googleDocMutation.isPending || googleSheetMutation.isPending) ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {t("dashboard.common.confirm")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PlanLimitPopup
        isOpen={showLimitPopup}
        onClose={() => setShowLimitPopup(false)}
        limitType="source"
        currentPlan={plan.name}
        currentLimit={sourcesLimit}
      />
    </div>
  );
}
