import { v2 as cloudinary } from "cloudinary";

// Initialize Cloudinary configuration safely
const cloudName =
  process.env.CLOUDINARY_CLOUD_NAME ||
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;
const cloudinaryUrl = process.env.CLOUDINARY_URL;

const isConfigured = Boolean(cloudinaryUrl || (cloudName && apiKey && apiSecret));

if (cloudinaryUrl) {
  cloudinary.config({ url: cloudinaryUrl });
} else if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

/**
 * Extracts public_id from standard Cloudinary delivery URLs.
 * e.g., https://res.cloudinary.com/cloud/image/upload/v12345/alma/avatars/u123.jpg
 * -> alma/avatars/u123
 */
export function extractCloudinaryPublicId(url?: string): string | undefined {
  if (!url || typeof url !== "string") return undefined;
  if (!url.includes("cloudinary.com") && !url.includes("res.cloudinary.com")) {
    return undefined;
  }

  try {
    const match = url.match(/\/upload\/(?:v\d+\/)?([^.#?]+)(?:\.[a-zA-Z0-9]+)?/);
    if (match && match[1]) {
      return match[1];
    }
  } catch {
    // Return undefined on parse error
  }
  return undefined;
}

/**
 * Step 2: Cloudinary Asset Purge Utility
 *
 * Executes Cloudinary Admin API destroy method to purge the old image
 * before saving a new one, preventing orphaned asset accumulation.
 */
export async function purgeCloudinaryAsset(
  publicId?: string
): Promise<{ success: boolean; result?: string; error?: string }> {
  if (!publicId || typeof publicId !== "string" || !publicId.trim()) {
    return { success: false, error: "No publicId provided for purge." };
  }

  const cleanPublicId = publicId.trim();

  // Avoid purging reserved, placeholder, or demo assets
  if (
    cleanPublicId.startsWith("demo") ||
    cleanPublicId === "placeholder" ||
    cleanPublicId === "default"
  ) {
    return { success: true, result: "skipped_reserved" };
  }

  if (!isConfigured) {
    console.warn(
      `[Cloudinary] Purge skipped for "${cleanPublicId}": Cloudinary API credentials not configured.`
    );
    return { success: false, error: "Cloudinary credentials not configured." };
  }

  try {
    const response = await cloudinary.uploader.destroy(cleanPublicId, {
      invalidate: true,
      resource_type: "image",
    });

    return {
      success: response.result === "ok" || response.result === "not found",
      result: response.result,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Unknown Cloudinary error";
    console.error(`[Cloudinary] Error purging asset "${cleanPublicId}":`, errMsg);
    return { success: false, error: errMsg };
  }
}

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  bytes: number;
  format?: string;
  resource_type: string;
}

/**
 * Uploads a chat attachment buffer to Cloudinary folder 'alma_chat_attachments'.
 * Supports auto resource_type (images, PDFs, documents, text files, etc.).
 */
export async function uploadChatAttachmentToCloudinary(
  buffer: Buffer,
  originalFilename: string
): Promise<{ success: boolean; data?: CloudinaryUploadResult; error?: string }> {
  if (!isConfigured) {
    return { success: false, error: "Cloudinary credentials not configured." };
  }

  const extMatch = originalFilename.match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : "";
  const cleanBaseName = originalFilename
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 40);

  return new Promise((resolve) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "alma_chat_attachments",
        resource_type: "auto",
        public_id: `${Date.now()}_${cleanBaseName}${ext}`,
      },
      (error, result) => {
        if (error || !result) {
          const errMsg = error?.message || "Failed to upload file to Cloudinary.";
          console.error("[Cloudinary] Upload failed:", errMsg);
          return resolve({
            success: false,
            error: errMsg,
          });
        }
        resolve({
          success: true,
          data: {
            secure_url: result.secure_url,
            public_id: result.public_id,
            bytes: result.bytes,
            format: result.format,
            resource_type: result.resource_type,
          },
        });
      }
    );
    uploadStream.end(buffer);
  });
}

export { cloudinary };
