import { useState } from "react";
import { format } from "date-fns";
import { Image, FileText, Video, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageThumbnailProps {
  url: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  createdAt?: string;
  onClick?: () => void;
  className?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function ImageThumbnail({
  url,
  filename,
  fileSize,
  mimeType,
  createdAt,
  onClick,
  className,
}: ImageThumbnailProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const isImage = mimeType.startsWith("image/");
  const isVideo = mimeType.startsWith("video/");

  return (
    <div
      className={cn(
        "relative cursor-pointer group",
        className
      )}
      onClick={onClick}
      data-testid="image-thumbnail"
    >
      <div className="w-32 h-32 rounded-xl overflow-hidden border border-white/20 bg-black/5 dark:bg-white/5 shadow-sm">
        {isImage ? (
          <>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
                <Image className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            {hasError ? (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <Image className="w-8 h-8 text-muted-foreground" />
              </div>
            ) : (
              <img
                src={url}
                alt={filename}
                className={cn(
                  "w-full h-full object-cover transition-transform duration-200 group-hover:scale-105",
                  isLoading && "opacity-0"
                )}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setHasError(true);
                }}
              />
            )}
          </>
        ) : isVideo ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-indigo-500/20">
            <Video className="w-8 h-8 text-purple-500" />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        <div className="absolute bottom-0 left-0 right-0 p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Download className="w-4 h-4 mx-auto" />
        </div>
      </div>
      <div className="mt-1.5 max-w-[128px]">
        <p className="text-xs font-medium truncate" title={filename}>
          {filename}
        </p>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>{formatFileSize(fileSize)}</span>
          {createdAt && (
            <>
              <span>•</span>
              <span>{format(new Date(createdAt), "MMM d")}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface InlineThumbnailProps {
  url: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  createdAt?: string;
  onClick?: () => void;
  isCustomer?: boolean;
}

export function InlineThumbnail({
  url,
  filename,
  fileSize,
  mimeType,
  createdAt,
  onClick,
  isCustomer = false,
}: InlineThumbnailProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const isImage = mimeType.startsWith("image/");
  const isVideo = mimeType.startsWith("video/");

  return (
    <div
      className="cursor-pointer group"
      onClick={onClick}
      data-testid="inline-thumbnail"
    >
      <div className="w-48 md:w-56 rounded-lg overflow-hidden border border-white/20 shadow-sm">
        {isImage ? (
          <div className="relative aspect-square bg-black/5 dark:bg-white/5">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center animate-pulse">
                <Image className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            {hasError ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Image className="w-8 h-8 text-muted-foreground" />
              </div>
            ) : (
              <img
                src={url}
                alt={filename}
                className={cn(
                  "w-full h-full object-cover transition-transform duration-200 group-hover:scale-105",
                  isLoading && "opacity-0"
                )}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setHasError(true);
                }}
              />
            )}
          </div>
        ) : isVideo ? (
          <div className="aspect-square flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-indigo-500/20">
            <Video className="w-12 h-12 text-purple-500" />
          </div>
        ) : (
          <div className="aspect-square flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
            <FileText className="w-12 h-12 text-blue-500" />
          </div>
        )}
        <div className={cn(
          "p-2",
          isCustomer ? "bg-white/10" : "bg-black/5 dark:bg-white/5"
        )}>
          <p className={cn(
            "text-xs font-medium truncate",
            isCustomer && "text-white"
          )} title={filename}>
            {filename}
          </p>
          <div className={cn(
            "flex items-center gap-1 text-[10px]",
            isCustomer ? "text-white/70" : "text-muted-foreground"
          )}>
            <span>{formatFileSize(fileSize)}</span>
            {createdAt && (
              <>
                <span>•</span>
                <span>{format(new Date(createdAt), "MMM d, HH:mm")}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
