import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MediaItem {
  id: string;
  url: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  createdAt?: string;
}

interface ImageCarouselProps {
  images: MediaItem[];
  onImageClick?: (index: number) => void;
  isCustomer?: boolean;
  className?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function ImageCarousel({
  images,
  onImageClick,
  isCustomer = false,
  className,
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    images.reduce((acc, img) => ({ ...acc, [img.id]: true }), {})
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const handleImageLoad = (id: string) => {
    setLoadingStates((prev) => ({ ...prev, [id]: false }));
  };

  if (images.length === 0) return null;

  // Single image - simplified display
  if (images.length === 1) {
    const img = images[0];
    const isImage = img.mimeType.startsWith("image/");

    return (
      <div
        className={cn("cursor-pointer group", className)}
        onClick={() => onImageClick?.(0)}
        data-testid="single-image-container"
      >
        <div className="w-48 md:w-56 rounded-lg overflow-hidden border border-white/20 shadow-sm">
          <div className="relative aspect-square bg-black/5 dark:bg-white/5">
            {loadingStates[img.id] && (
              <div className="absolute inset-0 flex items-center justify-center animate-pulse">
                <Image className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            <img
              src={img.url}
              alt={img.filename}
              className={cn(
                "w-full h-full object-cover transition-transform duration-200 group-hover:scale-105",
                loadingStates[img.id] && "opacity-0"
              )}
              onLoad={() => handleImageLoad(img.id)}
            />
          </div>
          <div className={cn(
            "p-2",
            isCustomer ? "bg-white/10" : "bg-black/5 dark:bg-white/5"
          )}>
            <p className={cn(
              "text-xs font-medium truncate",
              isCustomer && "text-white"
            )} title={img.filename}>
              {img.filename}
            </p>
            <p className={cn(
              "text-[10px]",
              isCustomer ? "text-white/70" : "text-muted-foreground"
            )}>
              {formatFileSize(img.fileSize)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Multiple images - carousel with navigation
  const currentImage = images[currentIndex];

  return (
    <div className={cn("relative", className)} data-testid="image-carousel">
      <div
        ref={containerRef}
        className="w-48 md:w-56 rounded-lg overflow-hidden border border-white/20 shadow-sm cursor-pointer"
        onClick={() => onImageClick?.(currentIndex)}
      >
        <div className="relative aspect-square bg-black/5 dark:bg-white/5">
          {loadingStates[currentImage.id] && (
            <div className="absolute inset-0 flex items-center justify-center animate-pulse">
              <Image className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          <img
            src={currentImage.url}
            alt={currentImage.filename}
            className={cn(
              "w-full h-full object-cover",
              loadingStates[currentImage.id] && "opacity-0"
            )}
            onLoad={() => handleImageLoad(currentImage.id)}
          />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrev}
            className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 hover:bg-black/60 text-white rounded-full"
            data-testid="carousel-prev"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 hover:bg-black/60 text-white rounded-full"
            data-testid="carousel-next"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all",
                  idx === currentIndex ? "bg-white w-3" : "bg-white/50"
                )}
              />
            ))}
          </div>
        </div>

        <div className={cn(
          "p-2",
          isCustomer ? "bg-white/10" : "bg-black/5 dark:bg-white/5"
        )}>
          <p className={cn(
            "text-xs font-medium truncate",
            isCustomer && "text-white"
          )} title={currentImage.filename}>
            {currentImage.filename}
          </p>
          <div className={cn(
            "flex items-center gap-1 text-[10px]",
            isCustomer ? "text-white/70" : "text-muted-foreground"
          )}>
            <span>{formatFileSize(currentImage.fileSize)}</span>
            <span>•</span>
            <span>{currentIndex + 1}/{images.length} photos</span>
          </div>
        </div>
      </div>
    </div>
  );
}
