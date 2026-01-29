import { useState, useRef, useCallback } from "react";
import { X, ZoomIn, ZoomOut, Download, ChevronLeft, ChevronRight, RotateCcw, Bell, Image as ImageIcon, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MediaInfo {
  url: string;
  filename: string;
  fileSize?: number;
  mimeType?: string;
}

interface ChatRightPanelProps {
  participant?: {
    name: string;
    photo?: string;
    personalId?: string;
  };
  mediaItems: MediaInfo[];
  viewingImage: MediaInfo | null;
  viewingIndex: number;
  onImageClick: (image: MediaInfo, index: number) => void;
  onClose: () => void;
}

export function ChatRightPanel({
  participant,
  mediaItems,
  viewingImage,
  viewingIndex,
  onImageClick,
  onClose,
}: ChatRightPanelProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.5, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev - 0.5, 0.5));
  }, []);

  const handleReset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handlePrev = useCallback(() => {
    const newIndex = viewingIndex > 0 ? viewingIndex - 1 : mediaItems.length - 1;
    onImageClick(mediaItems[newIndex], newIndex);
    handleReset();
  }, [viewingIndex, mediaItems, onImageClick, handleReset]);

  const handleNext = useCallback(() => {
    const newIndex = viewingIndex < mediaItems.length - 1 ? viewingIndex + 1 : 0;
    onImageClick(mediaItems[newIndex], newIndex);
    handleReset();
  }, [viewingIndex, mediaItems, onImageClick, handleReset]);

  const handleDownload = useCallback(() => {
    if (viewingImage) {
      const link = document.createElement("a");
      link.href = viewingImage.url;
      link.download = viewingImage.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [viewingImage]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  }, [scale, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, scale, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  }, [handleZoomIn, handleZoomOut]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (viewingImage) {
    return (
      <div className="h-full flex flex-col bg-black/95" data-testid="right-panel-viewer">
        <header className="flex items-center justify-between p-3 text-white border-b border-white/10">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                handleReset();
                onClose();
              }}
              className="text-white hover:bg-white/10"
              data-testid="button-close-panel-viewer"
            >
              <X className="w-5 h-5" />
            </Button>
            <div className="ml-1">
              <p className="text-xs font-medium truncate max-w-[150px]">
                {viewingImage.filename}
              </p>
              <p className="text-[10px] text-white/60">
                {viewingIndex + 1} of {mediaItems.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              className="text-white hover:bg-white/10 w-8 h-8"
              disabled={scale <= 0.5}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs w-10 text-center">{Math.round(scale * 100)}%</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              className="text-white hover:bg-white/10 w-8 h-8"
              disabled={scale >= 5}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReset}
              className="text-white hover:bg-white/10 w-8 h-8"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="text-white hover:bg-white/10 w-8 h-8"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </header>

        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden flex items-center justify-center"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{ cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
        >
          <img
            src={viewingImage.url}
            alt={viewingImage.filename}
            className={cn(
              "max-w-full max-h-full object-contain select-none transition-transform",
              isDragging ? "duration-0" : "duration-200"
            )}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            }}
            draggable={false}
          />

          {mediaItems.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrev}
                className="absolute left-1 top-1/2 -translate-y-1/2 text-white bg-black/30 hover:bg-black/50 w-8 h-8"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-white bg-black/30 hover:bg-black/50 w-8 h-8"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </>
          )}
        </div>

        {mediaItems.length > 1 && (
          <div className="flex justify-center gap-1.5 py-2 px-2 overflow-x-auto border-t border-white/10">
            {mediaItems.map((img, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onImageClick(img, idx);
                  handleReset();
                }}
                className={cn(
                  "w-10 h-10 rounded-md overflow-hidden border-2 transition-all flex-shrink-0",
                  idx === viewingIndex
                    ? "border-white ring-1 ring-white/30"
                    : "border-transparent opacity-60 hover:opacity-100"
                )}
              >
                <img
                  src={img.url}
                  alt={img.filename}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background/50 backdrop-blur-sm" data-testid="right-panel-default">
      <header className="p-3 border-b">
        <h3 className="text-sm font-medium">Details</h3>
      </header>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {participant && (
          <div className="flex flex-col items-center text-center p-3 rounded-lg bg-muted/30">
            <Avatar className="w-16 h-16 mb-2">
              <AvatarImage src={participant.photo} />
              <AvatarFallback className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white text-lg">
                {participant.name?.charAt(0)?.toUpperCase() || <User className="w-6 h-6" />}
              </AvatarFallback>
            </Avatar>
            <p className="font-medium text-sm">{participant.name}</p>
            {participant.personalId && (
              <p className="text-xs text-muted-foreground font-mono mt-1">{participant.personalId}</p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Bell className="w-3.5 h-3.5" />
            <span>Notifications</span>
          </div>
          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground text-center">No new notifications</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Media ({mediaItems.length})</span>
          </div>
          {mediaItems.length > 0 ? (
            <div className="grid grid-cols-3 gap-1.5">
              {mediaItems.map((media, idx) => (
                <button
                  key={idx}
                  onClick={() => onImageClick(media, idx)}
                  className="aspect-square rounded-md overflow-hidden bg-muted/50 hover:opacity-80 transition-opacity"
                  data-testid={`media-thumb-${idx}`}
                >
                  <img
                    src={media.url}
                    alt={media.filename}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground text-center">No media shared</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
