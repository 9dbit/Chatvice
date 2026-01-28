import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { HardDrive, Image, FileText, Database, TrendingUp, Upload, X, ExternalLink, Clock, MessageSquare, Bot, Users, BookOpen, Globe, Sparkles } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface MediaGalleryItem {
  id: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  url: string;
  imageWidth: number | null;
  imageHeight: number | null;
  expiresAt: string | null;
  createdAt: string;
}

interface SubscriptionUsage {
  conversationsUsed: number;
  conversationsLimit: number;
  messagesThisMonth: number;
  agentsUsed: number;
  agentsLimit: number;
  supervisorsUsed: number;
  supervisorsLimit: number;
  sourcesUsed: number;
  sourcesLimit: number;
  suggestedQuestionsLimit: number;
  chatRetentionHours: number;
  domainsLimit: number;
}

interface StorageUsageData {
  totalStorageUsed: number;
  storageLimit: number;
  mediaCount: number;
  mediaByType: {
    images: number;
    documents: number;
    videos: number;
    other: number;
  };
  recentUploads: Array<{
    id: string;
    filename: string;
    fileSize: number;
    mimeType: string;
    createdAt: string;
  }>;
  mediaGallery: MediaGalleryItem[];
  usageBySession: Array<{
    sessionId: string;
    totalSize: number;
    fileCount: number;
  }>;
  planInfo: {
    planName: string;
    storageLimitMB: number;
  };
  subscriptionUsage?: SubscriptionUsage;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatLimit(value: number): string {
  if (value === -1) return "Unlimited";
  return value.toLocaleString();
}

function getUsagePercentage(used: number, limit: number): number {
  if (limit === -1) return 0;
  return Math.min((used / limit) * 100, 100);
}

function getFileTypeIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <Image className="w-4 h-4 text-primary" />;
  if (mimeType.startsWith("video/")) return <FileText className="w-4 h-4 text-foreground" />;
  if (mimeType.includes("pdf") || mimeType.includes("document")) return <FileText className="w-4 h-4 text-destructive" />;
  return <FileText className="w-4 h-4 text-muted-foreground" />;
}

export default function DataUsagePage() {
  const { data: usage, isLoading } = useQuery<StorageUsageData>({
    queryKey: ["/api/merchant/storage-usage"],
  });
  
  const [viewingImage, setViewingImage] = useState<MediaGalleryItem | null>(null);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const usedPercentage = usage ? (usage.totalStorageUsed / usage.storageLimit) * 100 : 0;
  const isNearLimit = usedPercentage > 80;
  const isOverLimit = usedPercentage > 100;
  
  const sub = usage?.subscriptionUsage;
  const conversationPct = sub ? getUsagePercentage(sub.conversationsUsed, sub.conversationsLimit) : 0;

  return (
    <div className="p-6 space-y-6" data-testid="page-data-usage">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Usage & Limits</h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Monitor your subscription usage and storage
        </p>
      </div>

      {/* Subscription Usage Section */}
      {sub && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Plan Usage
          </h2>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Conversations */}
            <Card data-testid="card-conversations">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversations</CardTitle>
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-conversations-used">
                  {sub.conversationsUsed.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  of {formatLimit(sub.conversationsLimit)} this month
                </p>
                {sub.conversationsLimit !== -1 && (
                  <Progress 
                    value={conversationPct} 
                    className={`mt-2 ${conversationPct > 90 ? "bg-destructive/20" : conversationPct > 70 ? "bg-accent" : ""}`}
                    data-testid="progress-conversations"
                  />
                )}
              </CardContent>
            </Card>

            {/* Messages */}
            <Card data-testid="card-messages">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Messages This Month</CardTitle>
                <MessageSquare className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-messages-count">
                  {sub.messagesThisMonth.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">total messages sent</p>
              </CardContent>
            </Card>

            {/* AI Agents */}
            <Card data-testid="card-agents">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI Agents</CardTitle>
                <Bot className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-agents-used">
                  {sub.agentsUsed} <span className="text-sm font-normal text-muted-foreground">/ {formatLimit(sub.agentsLimit)}</span>
                </div>
                <p className="text-xs text-muted-foreground">agents created</p>
                {sub.agentsLimit !== -1 && (
                  <Progress 
                    value={getUsagePercentage(sub.agentsUsed, sub.agentsLimit)} 
                    className="mt-2"
                    data-testid="progress-agents"
                  />
                )}
              </CardContent>
            </Card>

            {/* Supervisors */}
            <Card data-testid="card-supervisors">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Supervisors</CardTitle>
                <Users className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-supervisors-used">
                  {sub.supervisorsUsed} <span className="text-sm font-normal text-muted-foreground">/ {formatLimit(sub.supervisorsLimit)}</span>
                </div>
                <p className="text-xs text-muted-foreground">team members</p>
                {sub.supervisorsLimit !== -1 && (
                  <Progress 
                    value={getUsagePercentage(sub.supervisorsUsed, sub.supervisorsLimit)} 
                    className="mt-2"
                    data-testid="progress-supervisors"
                  />
                )}
              </CardContent>
            </Card>

            {/* Knowledge Sources */}
            <Card data-testid="card-sources">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Knowledge Sources</CardTitle>
                <BookOpen className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-sources-used">
                  {sub.sourcesUsed} <span className="text-sm font-normal text-muted-foreground">/ {formatLimit(sub.sourcesLimit)}</span>
                </div>
                <p className="text-xs text-muted-foreground">crawled URLs</p>
                {sub.sourcesLimit !== -1 && (
                  <Progress 
                    value={getUsagePercentage(sub.sourcesUsed, sub.sourcesLimit)} 
                    className="mt-2"
                    data-testid="progress-sources"
                  />
                )}
              </CardContent>
            </Card>

            {/* Plan Limits */}
            <Card data-testid="card-limits">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Plan Limits</CardTitle>
                <Globe className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Allowed Domains</span>
                  <Badge variant="secondary" data-testid="badge-domains">{sub.domainsLimit}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Chat Retention</span>
                  <Badge variant="secondary" data-testid="badge-retention">{sub.chatRetentionHours}h</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Suggested Questions</span>
                  <Badge variant="secondary" data-testid="badge-suggested">{formatLimit(sub.suggestedQuestionsLimit)}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Storage Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-primary" />
          Storage & Media
        </h2>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card data-testid="card-storage-used">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" data-testid="title-storage-used">Total Storage Used</CardTitle>
              <HardDrive className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-storage-used">
                {formatBytes(usage?.totalStorageUsed || 0)}
              </div>
              <p className="text-xs text-muted-foreground" data-testid="text-storage-limit">
                of {formatBytes(usage?.storageLimit || 0)} limit
              </p>
              <Progress 
                value={Math.min(usedPercentage, 100)} 
                className={`mt-2 ${isOverLimit ? "bg-destructive/20" : isNearLimit ? "bg-accent" : ""}`}
                data-testid="progress-storage"
              />
            </CardContent>
          </Card>

          <Card data-testid="card-total-files">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" data-testid="title-total-files">Total Files</CardTitle>
              <Upload className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-files">{usage?.mediaCount || 0}</div>
              <p className="text-xs text-muted-foreground" data-testid="text-uploaded-files">uploaded files</p>
            </CardContent>
          </Card>

          <Card data-testid="card-images">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" data-testid="title-images">Images</CardTitle>
              <Image className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-image-count">{usage?.mediaByType?.images || 0}</div>
              <p className="text-xs text-muted-foreground" data-testid="text-image-files">image files</p>
            </CardContent>
          </Card>

          <Card data-testid="card-documents">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" data-testid="title-documents">Documents</CardTitle>
              <FileText className="w-4 h-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-document-count">{usage?.mediaByType?.documents || 0}</div>
              <p className="text-xs text-muted-foreground" data-testid="text-document-files">document files</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="card-storage-breakdown">
          <CardHeader>
            <CardTitle className="flex items-center gap-2" data-testid="title-storage-breakdown">
              <TrendingUp className="w-5 h-5" />
              Storage Breakdown
            </CardTitle>
            <CardDescription data-testid="desc-storage-breakdown">Usage by file type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4" data-testid="storage-breakdown">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" data-testid="dot-breakdown-images" />
                  <span className="text-sm" data-testid="text-breakdown-images">Images</span>
                </div>
                <Badge variant="secondary" data-testid="badge-images">{usage?.mediaByType?.images || 0} files</Badge>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-destructive" data-testid="dot-breakdown-documents" />
                  <span className="text-sm" data-testid="text-breakdown-documents">Documents</span>
                </div>
                <Badge variant="secondary" data-testid="badge-documents">{usage?.mediaByType?.documents || 0} files</Badge>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-secondary" data-testid="dot-breakdown-videos" />
                  <span className="text-sm" data-testid="text-breakdown-videos">Videos</span>
                </div>
                <Badge variant="secondary" data-testid="badge-videos">{usage?.mediaByType?.videos || 0} files</Badge>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-muted" data-testid="dot-breakdown-other" />
                  <span className="text-sm" data-testid="text-breakdown-other">Other</span>
                </div>
                <Badge variant="secondary" data-testid="badge-other">{usage?.mediaByType?.other || 0} files</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-plan-info">
          <CardHeader>
            <CardTitle className="flex items-center gap-2" data-testid="title-plan-info">
              <Database className="w-5 h-5" />
              Plan Information
            </CardTitle>
            <CardDescription data-testid="desc-plan-info">Your current storage plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4" data-testid="plan-info">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground" data-testid="label-current-plan">Current Plan</span>
                <Badge data-testid="badge-plan-name">{usage?.planInfo?.planName || "Free"}</Badge>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground" data-testid="label-storage-limit">Storage Limit</span>
                <span className="font-medium" data-testid="text-storage-limit-mb">{usage?.planInfo?.storageLimitMB || 100} MB</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground" data-testid="label-usage">Usage</span>
                <span className={`font-medium ${isOverLimit ? "text-destructive" : ""}`} data-testid="text-usage-percent">
                  {usedPercentage.toFixed(1)}%
                </span>
              </div>
              {isNearLimit && !isOverLimit && (
                <div className="p-3 bg-accent rounded-md" data-testid="alert-near-limit">
                  <p className="text-sm text-accent-foreground">
                    You're approaching your storage limit. Consider upgrading your plan.
                  </p>
                </div>
              )}
              {isOverLimit && (
                <div className="p-3 bg-destructive/10 rounded-md" data-testid="alert-over-limit">
                  <p className="text-sm text-destructive">
                    You've exceeded your storage limit. Please upgrade your plan or delete some files.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-recent-uploads">
        <CardHeader>
          <CardTitle className="flex items-center gap-2" data-testid="title-recent-uploads">
            <Upload className="w-5 h-5" />
            Recent Uploads
          </CardTitle>
          <CardDescription data-testid="desc-recent-uploads">Latest files uploaded to your chat sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {!usage?.recentUploads?.length ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="empty-uploads">
              <Upload className="w-12 h-12 mx-auto mb-4 opacity-50" data-testid="icon-empty-uploads" />
              <p data-testid="text-no-files">No files uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-2" data-testid="uploads-list">
              {usage.recentUploads.map((file) => (
                <div 
                  key={file.id} 
                  className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50"
                  data-testid={`file-${file.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span data-testid={`icon-filetype-${file.id}`}>
                      {getFileTypeIcon(file.mimeType)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium truncate text-sm" data-testid={`filename-${file.id}`}>{file.filename}</p>
                      <p className="text-xs text-muted-foreground" data-testid={`fileinfo-${file.id}`}>
                        {formatBytes(file.fileSize)} • {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="flex-shrink-0" data-testid={`badge-type-${file.id}`}>
                    {file.mimeType.split("/")[0]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Media Gallery */}
      <Card data-testid="card-media-gallery">
        <CardHeader>
          <CardTitle className="flex items-center gap-2" data-testid="title-media-gallery">
            <Image className="w-5 h-5" />
            Media Gallery
          </CardTitle>
          <CardDescription data-testid="desc-media-gallery">
            All images uploaded in chat (automatically deleted after 7 days)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!usage?.mediaGallery?.length ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="empty-gallery">
              <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No images uploaded yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3" data-testid="gallery-grid">
              {usage.mediaGallery.map((media) => (
                <div 
                  key={media.id}
                  className="group relative aspect-square rounded-lg overflow-hidden border-2 border-border/50 cursor-pointer hover:border-primary/50 transition-all"
                  onClick={() => setViewingImage(media)}
                  data-testid={`gallery-image-${media.id}`}
                >
                  <img 
                    src={media.url}
                    alt={media.filename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {/* Overlay with info on hover */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                    <p className="text-[10px] text-white truncate">{media.filename}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {media.imageWidth && media.imageHeight && (
                        <span className="text-[9px] text-white/70 bg-white/20 px-1.5 py-0.5 rounded">
                          {media.imageWidth}x{media.imageHeight}
                        </span>
                      )}
                      <span className="text-[9px] text-white/70 bg-white/20 px-1.5 py-0.5 rounded">
                        {formatBytes(media.fileSize)}
                      </span>
                    </div>
                  </div>
                  {/* Expiry indicator */}
                  {media.expiresAt && (
                    <div className="absolute top-1 right-1">
                      <div 
                        className="flex items-center gap-0.5 text-[8px] text-white bg-black/50 px-1.5 py-0.5 rounded-full"
                        title={`Expires: ${format(new Date(media.expiresAt), "dd MMM yyyy HH:mm")}`}
                      >
                        <Clock className="w-2.5 h-2.5" />
                        <span>{formatDistanceToNow(new Date(media.expiresAt), { addSuffix: false })}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Viewer Modal */}
      {viewingImage && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center p-4"
          onClick={() => setViewingImage(null)}
          data-testid="modal-gallery-viewer"
        >
          {/* Header with close and info */}
          <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-4 z-[10000]">
            <div className="flex items-center gap-3">
              {viewingImage.imageWidth && viewingImage.imageHeight && (
                <span className="text-sm text-white/70 bg-white/10 px-3 py-1 rounded-full">
                  {viewingImage.imageWidth}x{viewingImage.imageHeight}
                </span>
              )}
              <span className="text-sm text-white/70 bg-white/10 px-3 py-1 rounded-full">
                {formatBytes(viewingImage.fileSize)}
              </span>
              <span className="text-sm text-white/70 truncate max-w-[150px]">
                {viewingImage.filename}
              </span>
            </div>
            <button
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setViewingImage(null);
              }}
              data-testid="button-close-gallery-viewer"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
          
          {/* Image container */}
          <div 
            className="relative flex items-center justify-center flex-1 w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={viewingImage.url} 
              alt={viewingImage.filename}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
              data-testid="img-gallery-fullscreen"
            />
          </div>
          
          {/* Footer with info */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-[10000]">
            {viewingImage.expiresAt && (
              <span className="text-xs text-white/60 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Expires {format(new Date(viewingImage.expiresAt), "dd MMM yyyy HH:mm")}
              </span>
            )}
            <a
              href={viewingImage.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white text-sm"
              onClick={(e) => e.stopPropagation()}
              data-testid="button-open-gallery-new-tab"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Open in new tab</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
