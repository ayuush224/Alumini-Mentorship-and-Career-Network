"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Camera,
  Image as ImageIcon,
  Loader2,

  X,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Crop as CropIcon,
  Link as LinkIcon,
  AlertCircle,
} from "lucide-react";
import { uploadCroppedProfileImageAction } from "@/app/actions/profile";

export interface ImageUploadProps {
  variant: "avatar" | "banner";
  currentUrl?: string;
  onUploadSuccess: (url: string, publicId?: string) => Promise<void> | void;
  label?: string;
  className?: string;
}

export function ImageUpload({
  variant,
  currentUrl,
  onUploadSuccess,
  label,
  className = "",
}: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(currentUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Direct URL fallback modal
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [manualUrl, setManualUrl] = useState("");

  // Client-Side Cropping State
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Sync prop changes
  useEffect(() => {
    if (currentUrl) setPreviewUrl(currentUrl);
  }, [currentUrl]);

  // Viewport dimensions for interactive cropper preview
  const viewportWidth = variant === "avatar" ? 280 : 360;
  const viewportHeight = variant === "avatar" ? 280 : 120; // 3:1 for banner, 1:1 for avatar

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please select a valid image file (PNG, JPG, WEBP).");
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be selected again
    e.target.value = "";
  };

  // Mouse / Touch drag handlers for pan
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

  // Touch support for mobile
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

  // Perform user-side crop onto HTML5 Canvas and upload ONLY the cropped slice
  const handleApplyCropAndUpload = async () => {
    const img = imageRef.current;
    if (!img) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;

      // Base scale that fits image inside viewport covering it
      const baseScale = Math.max(viewportWidth / naturalWidth, viewportHeight / naturalHeight);
      const currentScale = baseScale * zoom;

      const renderedWidth = naturalWidth * currentScale;
      const renderedHeight = naturalHeight * currentScale;

      const imgLeft = (viewportWidth - renderedWidth) / 2 + offset.x;
      const imgTop = (viewportHeight - renderedHeight) / 2 + offset.y;

      // Source rectangle in natural image coordinates
      const sx = Math.max(0, -imgLeft / currentScale);
      const sy = Math.max(0, -imgTop / currentScale);
      const sWidth = Math.min(naturalWidth - sx, viewportWidth / currentScale);
      const sHeight = Math.min(naturalHeight - sy, viewportHeight / currentScale);

      // Target canvas output resolution
      const targetWidth = variant === "avatar" ? 400 : 1200;
      const targetHeight = variant === "avatar" ? 400 : 400; // 3:1

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Could not initialize 2D canvas context.");
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);

      // Convert canvas to Blob (only the cropped part)
      const croppedBlob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
      });

      if (!croppedBlob) {
        throw new Error("Failed to generate cropped image slice.");
      }

      // Step 3: Send ONLY the cropped blob to Cloudinary
      const formData = new FormData();
      formData.append("file", croppedBlob, `cropped-${variant}-${Date.now()}.jpg`);
      formData.append("variant", variant);

      const res = await uploadCroppedProfileImageAction(formData);

      if (!res.success || !res.url) {
        throw new Error(res.error || "Upload failed. Please check network.");
      }

      setPreviewUrl(res.url);
      await onUploadSuccess(res.url, res.publicId);
      setShowCropModal(false);
      setImageSrc(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error cropping/uploading image.";
      console.error("[ImageUpload] Crop Error:", err);
      setUploadError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleManualUrlSave = async () => {
    const trimmed = manualUrl.trim();
    if (!trimmed) return;
    setIsUploading(true);
    try {
      setPreviewUrl(trimmed);
      await onUploadSuccess(trimmed);
      setShowUrlModal(false);
      setManualUrl("");
    } catch (err) {
      console.error("Manual URL error:", err);
    } finally {
      setIsUploading(false);
    }
  };

  // =========================================================================
  // VARIANT A: 128px CIRCULAR AVATAR
  // =========================================================================
  if (variant === "avatar") {
    return (
      <div className="inline-block relative">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/jpg"
          onChange={handleSelectFile}
          className="hidden"
        />

        <div
          onClick={() => fileInputRef.current?.click()}
          className={`relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-md bg-slate-100 group cursor-pointer transition-all hover:ring-4 hover:ring-blue-500/20 ${className}`}
        >
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt={label || "User Avatar"}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="128px"
              priority
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100">
              <Camera className="w-8 h-8 mb-1 text-slate-400 group-hover:text-blue-600 transition-colors" />
              <span className="text-[10px] font-medium text-slate-500">Add Photo</span>
            </div>
          )}

          {/* Hover Camera Overlay */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-2 text-center">
            {isUploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            ) : (
              <>
                <Camera className="w-6 h-6 mb-1 text-white" />
                <span className="text-[10px] font-medium">Change Photo</span>
              </>
            )}
          </div>
        </div>

        {/* Small fallback link to enter URL directly */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowUrlModal(true);
          }}
          className="mt-1 text-[10px] text-slate-400 hover:text-blue-600 transition-colors block text-center w-full"
        >
          or paste link
        </button>

        {/* ===================================================================
            CLIENT-SIDE CROP MODAL (AVATAR)
        ==================================================================== */}
        {showCropModal && imageSrc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <CropIcon className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">Crop Profile Picture</h3>
                </div>
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => setShowCropModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <p className="text-xs text-slate-500">
                Drag the image to center your face inside the circle, then use the zoom slider.
              </p>

              {/* Crop Viewport */}
              <div className="flex justify-center my-2">
                <div
                  className="relative overflow-hidden bg-slate-900 rounded-full select-none cursor-grab active:cursor-grabbing border-4 border-blue-500/30 shadow-inner"
                  style={{ width: viewportWidth, height: viewportHeight }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleMouseUp}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={imageRef}
                    src={imageSrc}
                    alt="Crop preview"
                    draggable={false}
                    className="absolute pointer-events-none origin-center"
                    style={{
                      transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                      maxWidth: "none",
                      maxHeight: "none",
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />

                  {/* Circular Overlay Mask Guide */}
                  <div className="absolute inset-0 pointer-events-none rounded-full border border-white/60 shadow-[0_0_0_9999px_rgba(11,31,68,0.45)]" />
                </div>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-3 px-2">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(1, z - 0.1))}
                  className="text-slate-500 hover:text-blue-600 p-1"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
                  className="text-slate-500 hover:text-blue-600 p-1"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoom(1);
                    setOffset({ x: 0, y: 0 });
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded border border-slate-200"
                  title="Reset"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => setShowCropModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={handleApplyCropAndUpload}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Uploading Cropped Area...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Apply Crop & Save</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Fallback URL Modal */}
        {showUrlModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-xl border border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900">Set Photo from URL</h4>
                <button
                  type="button"
                  onClick={() => setShowUrlModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <input
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                className="w-full p-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUrlModal(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleManualUrlSave}
                  disabled={!manualUrl.trim() || isUploading}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
                >
                  Save Photo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VARIANT B: 16:9 / 3:1 RESPONSIVE BANNER
  // =========================================================================
  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/jpg"
        onChange={handleSelectFile}
        className="hidden"
      />

      <div
        onClick={() => fileInputRef.current?.click()}
        className={`relative w-full aspect-[16/9] sm:aspect-[3/1] max-h-56 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 group cursor-pointer shadow-xs transition-all hover:border-slate-300 ${className}`}
      >
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={label || "Profile Banner"}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-102"
            sizes="(max-width: 1200px) 100vw, 1200px"
            priority
          />
        ) : (
          <div className="w-full h-full relative overflow-hidden bg-gradient-to-r from-[#EBF3FF] via-[#E2EEFF] to-[#D5E6FF]">
            <svg
              className="w-full h-full object-cover absolute inset-0 opacity-80 pointer-events-none"
              viewBox="0 0 1200 300"
              preserveAspectRatio="none"
              fill="none"
            >
              <defs>
                <linearGradient id="soft-wave-1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#D2E4FF" />
                  <stop offset="100%" stopColor="#EAF2FF" />
                </linearGradient>
                <linearGradient id="soft-wave-2" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#C0DAFF" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#DFEDFF" stopOpacity="0.5" />
                </linearGradient>
              </defs>
              <path
                d="M0,170 C320,110, 520,250, 820,130 C1060,50, 1140,190, 1200,160 L1200,300 L0,300 Z"
                fill="url(#soft-wave-1)"
              />
              <path
                d="M0,220 C220,270, 480,180, 780,240 C1020,290, 1120,200, 1200,210 L1200,300 L0,300 Z"
                fill="url(#soft-wave-2)"
              />
            </svg>




          </div>
        )}

        {/* Floating Action Button on Top-Right */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowUrlModal(true);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-900 text-white text-xs font-medium backdrop-blur-md flex items-center gap-1 shadow-sm transition-all"
            title="Paste image URL"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </button>

          <span className="px-3.5 py-1.5 rounded-full bg-white/95 hover:bg-white text-stone-700 text-xs font-medium backdrop-blur-md flex items-center gap-1.5 transition-all shadow-xs border border-stone-200">
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-3.5 h-3.5 text-stone-600" />
                <span>{previewUrl ? "Change Banner" : "Upload Banner"}</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* =====================================================================
          CLIENT-SIDE CROP MODAL (BANNER)
      ====================================================================== */}
      {showCropModal && imageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CropIcon className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Crop Cover Banner (3:1)</h3>
              </div>
              <button
                type="button"
                disabled={isUploading}
                onClick={() => setShowCropModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <p className="text-xs text-slate-500">
              Drag to reposition your banner and adjust the zoom slider to fit the landscape frame.
            </p>

            {/* Banner Viewport */}
            <div className="flex justify-center my-2">
              <div
                className="relative overflow-hidden bg-slate-900 rounded-2xl select-none cursor-grab active:cursor-grabbing border-2 border-blue-500/40 shadow-inner"
                style={{ width: viewportWidth, height: viewportHeight }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="Crop preview"
                  draggable={false}
                  className="absolute pointer-events-none origin-center"
                  style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                    maxWidth: "none",
                    maxHeight: "none",
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
                <div className="absolute inset-0 pointer-events-none rounded-2xl border border-white/60 shadow-[0_0_0_9999px_rgba(11,31,68,0.45)]" />
              </div>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-3 px-2">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(1, z - 0.1))}
                className="text-slate-500 hover:text-blue-600 p-1"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
                className="text-slate-500 hover:text-blue-600 p-1"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setOffset({ x: 0, y: 0 });
                }}
                className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded border border-slate-200"
                title="Reset"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isUploading}
                onClick={() => setShowCropModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUploading}
                onClick={handleApplyCropAndUpload}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading Cropped Area...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Apply Crop & Save</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fallback URL Modal */}
      {showUrlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">Set Cover Banner from URL</h4>
              <button
                type="button"
                onClick={() => setShowUrlModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="url"
              placeholder="https://images.unsplash.com/photo-..."
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              className="w-full p-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowUrlModal(false)}
                className="px-3.5 py-1.5 text-xs text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleManualUrlSave}
                disabled={!manualUrl.trim() || isUploading}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
              >
                Save Banner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImageUpload;
