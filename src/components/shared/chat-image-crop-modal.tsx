"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Crop as CropIcon,
  Maximize2,
  Square,
  RectangleHorizontal,
} from "lucide-react";

export type CropAspectRatio = "1:1" | "4:3" | "16:9" | "free";

export interface ChatImageCropModalProps {
  isOpen: boolean;
  file: File | null;
  onClose: () => void;
  onApplyCrop: (croppedFile: File, previewUrl: string) => void;
}

export function ChatImageCropModal({
  isOpen,
  file,
  onClose,
  onApplyCrop,
}: ChatImageCropModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [aspectRatio, setAspectRatio] = useState<CropAspectRatio>("free");
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Load selected file into data URL
  useEffect(() => {
    if (!isOpen || !file) {
      setImageSrc(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
      setAspectRatio("free");
    };
    reader.readAsDataURL(file);
  }, [isOpen, file]);

  // Viewport dimensions for crop box based on selected aspect ratio
  const getCropBoxDimensions = () => {
    switch (aspectRatio) {
      case "1:1":
        return { width: 320, height: 320 };
      case "4:3":
        return { width: 340, height: 255 };
      case "16:9":
        return { width: 350, height: 196 };
      case "free":
      default:
        return { width: 340, height: 300 };
    }
  };

  const cropBox = getCropBoxDimensions();

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch pan handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - offset.x,
        y: e.touches[0].clientY - offset.y,
      });
    }
  };

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      setOffset({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  // Zoom helpers
  const handleZoomIn = () => setZoom((prev) => Math.min(3.5, prev + 0.25));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.6, prev - 0.25));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  // Apply crop onto canvas & return locally
  const handleApplyCrop = async () => {
    const img = imageRef.current;
    if (!img || !file) return;

    setIsProcessing(true);

    try {
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;

      // Swap dimensions if rotated 90 or 270 deg
      const isQuarterRotated = rotation === 90 || rotation === 270;
      const effectiveNaturalWidth = isQuarterRotated ? naturalHeight : naturalWidth;
      const effectiveNaturalHeight = isQuarterRotated ? naturalWidth : naturalHeight;

      // Base scale that fits image inside cropBox
      const baseScale = Math.max(
        cropBox.width / effectiveNaturalWidth,
        cropBox.height / effectiveNaturalHeight
      );
      const currentScale = baseScale * zoom;

      const renderedWidth = effectiveNaturalWidth * currentScale;
      const renderedHeight = effectiveNaturalHeight * currentScale;

      const imgLeft = (cropBox.width - renderedWidth) / 2 + offset.x;
      const imgTop = (cropBox.height - renderedHeight) / 2 + offset.y;

      // Natural source rect
      const sx = Math.max(0, -imgLeft / currentScale);
      const sy = Math.max(0, -imgTop / currentScale);
      const sWidth = Math.min(effectiveNaturalWidth - sx, cropBox.width / currentScale);
      const sHeight = Math.min(effectiveNaturalHeight - sy, cropBox.height / currentScale);

      // Desired output resolution (clean, crisp, up to 1600px)
      const targetScale = Math.min(2.5, 1200 / Math.max(cropBox.width, cropBox.height));
      const targetWidth = Math.round(cropBox.width * targetScale);
      const targetHeight = Math.round(cropBox.height * targetScale);

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Unable to create canvas context");
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // If rotation is applied, transform canvas
      if (rotation !== 0) {
        // Draw to intermediate canvas to rotate, then draw slice
        const rotateCanvas = document.createElement("canvas");
        rotateCanvas.width = effectiveNaturalWidth;
        rotateCanvas.height = effectiveNaturalHeight;
        const rCtx = rotateCanvas.getContext("2d");
        if (rCtx) {
          rCtx.translate(effectiveNaturalWidth / 2, effectiveNaturalHeight / 2);
          rCtx.rotate((rotation * Math.PI) / 180);
          rCtx.drawImage(img, -naturalWidth / 2, -naturalHeight / 2);
          ctx.drawImage(rotateCanvas, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
        }
      } else {
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
      }

      const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), mimeType, 0.94);
      });

      if (!blob) {
        throw new Error("Failed to export cropped image");
      }

      // Generate new clean File
      const extension = mimeType === "image/png" ? ".png" : ".jpg";
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      const croppedFile = new File([blob], `${baseName}-cropped${extension}`, {
        type: mimeType,
      });

      const previewUrl = URL.createObjectURL(blob);
      onApplyCrop(croppedFile, previewUrl);
      onClose();
    } catch (err) {
      console.error("Chat image crop error:", err);
      alert("Failed to crop image. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !file || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden text-stone-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <CropIcon className="w-4 h-4 text-primary-400" />
            <h3 className="font-semibold text-sm text-stone-100">Crop Image</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aspect Ratio Toolbar */}
        <div className="px-5 py-2.5 bg-stone-950/60 border-b border-stone-800/80 flex items-center justify-between text-xs overflow-x-auto gap-2">
          <span className="text-stone-400 font-medium shrink-0">Aspect Ratio:</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setAspectRatio("free");
                setOffset({ x: 0, y: 0 });
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors font-medium ${
                aspectRatio === "free"
                  ? "bg-primary-600 text-white"
                  : "bg-stone-800 text-stone-300 hover:bg-stone-700"
              }`}
            >
              <Maximize2 className="w-3 h-3" />
              <span>Free</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAspectRatio("1:1");
                setOffset({ x: 0, y: 0 });
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors font-medium ${
                aspectRatio === "1:1"
                  ? "bg-primary-600 text-white"
                  : "bg-stone-800 text-stone-300 hover:bg-stone-700"
              }`}
            >
              <Square className="w-3 h-3" />
              <span>1:1 Square</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAspectRatio("4:3");
                setOffset({ x: 0, y: 0 });
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors font-medium ${
                aspectRatio === "4:3"
                  ? "bg-primary-600 text-white"
                  : "bg-stone-800 text-stone-300 hover:bg-stone-700"
              }`}
            >
              <RectangleHorizontal className="w-3 h-3" />
              <span>4:3</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAspectRatio("16:9");
                setOffset({ x: 0, y: 0 });
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors font-medium ${
                aspectRatio === "16:9"
                  ? "bg-primary-600 text-white"
                  : "bg-stone-800 text-stone-300 hover:bg-stone-700"
              }`}
            >
              <RectangleHorizontal className="w-3 h-3" />
              <span>16:9</span>
            </button>
          </div>
        </div>

        {/* Interactive Viewport Canvas */}
        <div
          ref={containerRef}
          className="relative bg-stone-950 flex items-center justify-center p-4 min-h-[340px] select-none overflow-hidden cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
        >
          {/* Active Crop Box with Rule of Thirds Grid */}
          <div
            style={{ width: `${cropBox.width}px`, height: `${cropBox.height}px` }}
            className="relative border-2 border-primary-500 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] pointer-events-none z-10 overflow-hidden"
          >
            {/* Grid Lines */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
              <div className="border-r border-b border-white/25"></div>
              <div className="border-r border-b border-white/25"></div>
              <div className="border-b border-white/25"></div>
              <div className="border-r border-b border-white/25"></div>
              <div className="border-r border-b border-white/25"></div>
              <div className="border-b border-white/25"></div>
              <div className="border-r border-white/25"></div>
              <div className="border-r border-white/25"></div>
              <div></div>
            </div>
            {/* Corner Indicators */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary-400"></div>
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-primary-400"></div>
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-primary-400"></div>
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary-400"></div>
          </div>

          {/* Interactive Image Layer */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imageRef}
            src={imageSrc}
            alt="Crop Preview"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
              transformOrigin: "center center",
              maxHeight: "none",
              maxWidth: "none",
            }}
            className="absolute transition-transform duration-75 pointer-events-none object-contain"
            draggable={false}
          />
        </div>

        {/* Controls Toolbar (Zoom, Rotate, Reset) */}
        <div className="px-5 py-3 bg-stone-900 border-t border-stone-800 flex items-center justify-between gap-4 text-xs">
          {/* Zoom Slider */}
          <div className="flex items-center gap-2 flex-1">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min="0.6"
              max="3.0"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 h-1.5 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
            />
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="font-mono text-[11px] text-stone-400 w-9 text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Rotate & Reset Buttons */}
          <div className="flex items-center gap-1.5 shrink-0 border-l border-stone-800 pl-3">
            <button
              type="button"
              onClick={handleRotate}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors flex items-center gap-1"
              title="Rotate 90 degrees"
            >
              <RotateCw className="w-4 h-4" />
              <span className="text-[11px] hidden sm:inline">Rotate</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors flex items-center gap-1"
              title="Reset position"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-[11px] hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-stone-950/80 border-t border-stone-800 flex items-center justify-between gap-3">
          <p className="text-[11px] text-stone-400">
            Drag to reposition &bull; Pinch/zoom to frame
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyCrop}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold shadow-md shadow-primary-600/30 transition-all hover:scale-[1.02] disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isProcessing ? "Processing..." : "Apply Crop"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
