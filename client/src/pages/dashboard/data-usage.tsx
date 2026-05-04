import { useLanguage } from "@/hooks/use-language";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { HardDrive, Image, FileText, Database, TrendingUp, Users, MessageSquare, Upload } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
  usageBySession: Array<{
    sessionId: string;
    totalSize: number;
    fileCount: number;
  }>;
  planInfo: {
    planName: string;
    storageLimitMB: number;
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getFileTypeIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <Image className="w-4 h-4 text-primary" />;
  if (mimeType.startsWith("video/")) return <FileText className="w-4 h-4 text-foreground" />;
  if (mimeType.includes("pdf") || mimeType.includes("document")) return <FileText className="w-4 h-4 text-destructive" />;
  return <FileText className="w-4 h-4 text-muted-foreground" />;
}

export default function DataUsagePage() {
  const { t } = useLanguage();
  const { data: usage, isLoading } = useQuery<StorageUsageData>({
    queryKey: ["/api/merchant/storage-usage"],
  });

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

  return (
    <div className="p-6 space-y-6" data-testid="page-data-usage">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">{t("dashboard.dataUsage.title")}</h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Monitor your storage usage and media uploads
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-storage-used">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium" data-testid="title-storage-used">{t("dashboard.dataUsage.totalStorageUsed")}</CardTitle>
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
            <CardTitle className="text-sm font-medium" data-testid="title-total-files">{t("dashboard.dataUsage.totalFiles")}</CardTitle>
            <Upload className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-files">{usage?.mediaCount || 0}</div>
            <p className="text-xs text-muted-foreground" data-testid="text-uploaded-files">uploaded files</p>
          </CardContent>
        </Card>

        <Card data-testid="card-images">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium" data-testid="title-images">{t("dashboard.dataUsage.images")}</CardTitle>
            <Image className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-image-count">{usage?.mediaByType?.images || 0}</div>
            <p className="text-xs text-muted-foreground" data-testid="text-image-files">image files</p>
          </CardContent>
        </Card>

        <Card data-testid="card-documents">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium" data-testid="title-documents">{t("dashboard.dataUsage.documents")}</CardTitle>
            <FileText className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-document-count">{usage?.mediaByType?.documents || 0}</div>
            <p className="text-xs text-muted-foreground" data-testid="text-document-files">document files</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="card-storage-breakdown">
          <CardHeader>
            <CardTitle className="flex items-center gap-2" data-testid="title-storage-breakdown">
              <TrendingUp className="w-5 h-5" />
              Storage Breakdown
            </CardTitle>
            <CardDescription data-testid="desc-storage-breakdown">{t("dashboard.dataUsage.usageByType")}</CardDescription>
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
    </div>
  );
}
