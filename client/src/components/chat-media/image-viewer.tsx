import { useState, useRef, useEffect, useCallback } from "react";
import { X, ZoomIn, ZoomOut, Download, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageViewerProps {
  images: Array<{
    url: string;
    filename: string;
    fileSize?: number;
    mimeType?: string;
  }>;
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageViewer({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
}: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const currentImage = images[currentIndex];

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, initialIndex]);

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
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    handleReset();
  }, [images.length, handleReset]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    handleReset();
  }, [images.length, handleReset]);

  const handleDownload = useCallback(() => {
    if (currentImage) {
      const link = document.createElement("a");
      link.href = currentImage.url;
      link.download = currentImage.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [currentImage]);

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

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    switch (e.key) {
      case "Escape":
        onClose();
        break;
      case "ArrowLeft":
        handlePrev();
        break;
      case "ArrowRight":
        handleNext();
        break;
      case "+":
      case "=":
        handleZoomIn();
        break;
      case "-":
        handleZoomOut();
        break;
      case "0":
        handleReset();
        break;
    }
  }, [isOpen, onClose, handlePrev, handleNext, handleZoomIn, handleZoomOut, handleReset]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Touch handling for mobile with swipe gestures
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [initialScale, setInitialScale] = useState(1);
  const [swipeOffset, setSwipeOffset] = useState({ x: 0, y: 0 });
  const [isSwipeGesture, setIsSwipeGesture] = useState(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      setSwipeOffset({ x: 0, y: 0 });
      setIsSwipeGesture(false);
    } else if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setInitialPinchDistance(distance);
      setInitialScale(scale);
    }
  }, [scale]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistance !== null) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const newScale = Math.min(Math.max((distance / initialPinchDistance) * initialScale, 0.5), 5);
      setScale(newScale);
    } else if (e.touches.length === 1 && touchStart) {
      const deltaX = e.touches[0].clientX - touchStart.x;
      const deltaY = e.touches[0].clientY - touchStart.y;
      
      if (scale > 1) {
        // When zoomed in, pan the image
        setPosition({
          x: deltaX + position.x,
          y: deltaY + position.y,
        });
        setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      } else {
        // When not zoomed, track swipe for gestures
        setSwipeOffset({ x: deltaX, y: deltaY });
        setIsSwipeGesture(true);
      }
    }
  }, [initialPinchDistance, initialScale, touchStart, scale, position]);

  const handleTouchEnd = useCallback(() => {
    if (isSwipeGesture && scale <= 1) {
      const { x: deltaX, y: deltaY } = swipeOffset;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      const threshold = 80;
      
      // Slide down to close (vertical swipe > horizontal)
      if (absY > threshold && absY > absX * 1.5 && deltaY > 0) {
        onClose();
      }
      // Slide left to go to next image
      else if (absX > threshold && absX > absY && deltaX < 0 && images.length > 1) {
        handleNext();
      }
      // Slide right to go to previous image
      else if (absX > threshold && absX > absY && deltaX > 0 && images.length > 1) {
        handlePrev();
      }
    }
    
    setTouchStart(null);
    setInitialPinchDistance(null);
    setSwipeOffset({ x: 0, y: 0 });
    setIsSwipeGesture(false);
  }, [isSwipeGesture, scale, swipeOffset, onClose, images.length, handleNext, handlePrev]);

  if (!isOpen || !currentImage) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
      data-testid="image-viewer-overlay"
    >
      <header className="flex items-center justify-between p-3 text-white">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/10"
            data-testid="button-close-viewer"
          >
            <X className="w-6 h-6" />
          </Button>
          <div className="ml-2">
            <p className="text-sm font-medium truncate max-w-[200px] md:max-w-none">
              {currentImage.filename}
            </p>
            <p className="text-xs text-white/60">
              {currentIndex + 1} of {images.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomOut}
            className="text-white hover:bg-white/10"
            disabled={scale <= 0.5}
            data-testid="button-zoom-out"
          >
            <ZoomOut className="w-5 h-5" />
          </Button>
          <span className="text-sm w-12 text-center">{Math.round(scale * 100)}%</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomIn}
            className="text-white hover:bg-white/10"
            disabled={scale >= 5}
            data-testid="button-zoom-in"
          >
            <ZoomIn className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            className="text-white hover:bg-white/10"
            data-testid="button-reset-zoom"
          >
            <RotateCcw className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            className="text-white hover:bg-white/10"
            data-testid="button-download"
          >
            <Download className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden flex items-center justify-center mx-4 mb-4"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
        data-testid="image-viewer-container"
      >
        <img
          ref={imageRef}
          src={currentImage.url}
          alt={currentImage.filename}
          className={cn(
            "max-w-full max-h-full object-contain select-none transition-transform",
            isDragging ? "duration-0" : "duration-200"
          )}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          }}
          draggable={false}
          data-testid="viewer-image"
        />

        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-white bg-black/30 hover:bg-black/50 w-10 h-10"
              data-testid="button-prev-image"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white bg-black/30 hover:bg-black/50 w-10 h-10"
              data-testid="button-next-image"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex justify-center gap-2 pb-4 px-4 overflow-x-auto">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentIndex(idx);
                handleReset();
              }}
              className={cn(
                "w-12 h-12 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0",
                idx === currentIndex
                  ? "border-white ring-2 ring-white/30"
                  : "border-transparent opacity-60 hover:opacity-100"
              )}
              data-testid={`thumbnail-${idx}`}
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
