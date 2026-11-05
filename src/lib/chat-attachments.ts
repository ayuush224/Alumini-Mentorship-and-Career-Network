/**
 * Chat Attachment Utilities for Alma
 * Handles Cloudinary delivery transformations, forced downloads, and file type classification.
 */

/**
 * Returns a secure proxy URL to download any chat attachment with the exact original filename.
 * Routes through the Alma server which uses Cloudinary signed credentials to bypass
 * free-tier ACL blocks on PDFs and cross-origin download restrictions.
 */
export function getAttachmentDownloadUrl(fileUrl: string, fileName?: string): string {
  if (!fileUrl) return "";
  const nameParam = fileName ? `&filename=${encodeURIComponent(fileName)}` : "";
  return `/api/v1/chat/download?url=${encodeURIComponent(fileUrl)}${nameParam}`;
}

/**
 * Returns a secure proxy URL to preview or view an attachment inline in a new browser tab.
 */
export function getAttachmentViewUrl(fileUrl: string, fileName?: string): string {
  if (!fileUrl) return "";
  const nameParam = fileName ? `&filename=${encodeURIComponent(fileName)}` : "";
  return `/api/v1/chat/download?url=${encodeURIComponent(fileUrl)}${nameParam}&inline=true`;
}

/**
 * Checks whether a given attachment is an image.
 */
export function isImageFile(fileType?: string, fileName?: string, fileUrl?: string): boolean {
  if (fileType?.startsWith("image/")) return true;
  if (
    fileType &&
    ["png", "jpg", "jpeg", "webp", "gif", "svg", "image"].includes(fileType.toLowerCase())
  ) {
    return true;
  }
  if (fileName && /\.(png|jpe?g|webp|gif|svg)$/i.test(fileName)) return true;
  if (fileUrl && /\.(png|jpe?g|webp|gif|svg)/i.test(fileUrl)) return true;
  return false;
}

/**
 * Checks whether a given attachment is a PDF.
 */
export function isPdfFile(fileType?: string, fileName?: string, fileUrl?: string): boolean {
  if (fileType?.toLowerCase() === "application/pdf" || fileType?.toLowerCase() === "pdf") {
    return true;
  }
  if (fileName && /\.pdf$/i.test(fileName)) return true;
  if (fileUrl && /\.pdf/i.test(fileUrl)) return true;
  return false;
}

export type FileTypeInfo = {
  badge: string;
  badgeBg: string;
  badgeText: string;
  label: string;
};

/**
 * Classifies files to render distinct, beautiful visual badges in the chat bubble.
 */
export function getFileTypeInfo(fileName?: string, fileType?: string): FileTypeInfo {
  const name = (fileName || "").toLowerCase();
  const type = (fileType || "").toLowerCase();

  if (name.endsWith(".pdf") || type === "application/pdf" || type === "pdf") {
    return {
      badge: "PDF",
      badgeBg: "bg-red-500/15 border-red-500/30",
      badgeText: "text-red-500 font-bold",
      label: "PDF Document",
    };
  }

  if (
    name.endsWith(".ppt") ||
    name.endsWith(".pptx") ||
    type.includes("presentation") ||
    type.includes("powerpoint")
  ) {
    return {
      badge: "PPT",
      badgeBg: "bg-amber-500/15 border-amber-500/30",
      badgeText: "text-amber-600 font-bold",
      label: "Presentation Deck",
    };
  }

  if (
    name.endsWith(".doc") ||
    name.endsWith(".docx") ||
    type.includes("word") ||
    type.includes("document")
  ) {
    return {
      badge: "DOC",
      badgeBg: "bg-blue-500/15 border-blue-500/30",
      badgeText: "text-blue-500 font-bold",
      label: "Word Document",
    };
  }

  if (
    name.endsWith(".xls") ||
    name.endsWith(".xlsx") ||
    name.endsWith(".csv") ||
    type.includes("sheet") ||
    type.includes("excel")
  ) {
    return {
      badge: "XLS",
      badgeBg: "bg-emerald-500/15 border-emerald-500/30",
      badgeText: "text-emerald-600 font-bold",
      label: "Spreadsheet",
    };
  }

  if (
    name.endsWith(".zip") ||
    name.endsWith(".tar") ||
    name.endsWith(".gz") ||
    name.endsWith(".rar") ||
    type.includes("zip") ||
    type.includes("archive")
  ) {
    return {
      badge: "ZIP",
      badgeBg: "bg-purple-500/15 border-purple-500/30",
      badgeText: "text-purple-600 font-bold",
      label: "Archive",
    };
  }

  return {
    badge: "FILE",
    badgeBg: "bg-stone-500/15 border-stone-500/30",
    badgeText: "text-stone-600 font-bold",
    label: "Document",
  };
}

/**
 * Formats byte size into human readable string.
 */
export function formatAttachmentBytes(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
