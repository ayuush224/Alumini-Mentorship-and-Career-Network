import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccess } from "@/lib/app-tokens";
import { cloudinary, extractCloudinaryPublicId } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "svg":
      return "image/svg+xml";
    case "ppt":
      return "application/vnd.ms-powerpoint";
    case "pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "xls":
      return "application/vnd.ms-excel";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "csv":
      return "text/csv";
    case "txt":
      return "text/plain";
    case "zip":
      return "application/zip";
    default:
      return "application/octet-stream";
  }
}

/**
 * Proxy Route for Chat File Downloads & In-Browser Previews
 *
 * Route: GET /api/v1/chat/download?url=<fileUrl>&filename=<name>&inline=<true|false>
 *
 * Solves:
 * 1. Cloudinary free-tier "deny or ACL failure (401)" on PDFs and ZIPs by signing the request server-side.
 * 2. Cross-origin browser download restrictions by proxying from the same origin.
 * 3. Enforces user authentication and custom original filename headers.
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Verify user authentication
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyAccess(token);
    if (!payload?.sub) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // 2. Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const fileUrl = searchParams.get("url");
    const rawFilename = searchParams.get("filename") || "attachment";
    const isInline = searchParams.get("inline") === "true";

    if (!fileUrl) {
      return NextResponse.json({ error: "Missing file URL" }, { status: 400 });
    }

    const cleanFilename = rawFilename.replace(/["\r\n\\]/g, "_").trim() || "attachment";
    const fallbackMime = getMimeType(cleanFilename);

    // 3. Handle Cloudinary delivery with signed authorization to bypass ACL restrictions
    const publicId = extractCloudinaryPublicId(fileUrl);
    let fetchTargetUrl = fileUrl;

    if (publicId) {
      const resourceTypeMatch = fileUrl.match(
        /cloudinary\.com\/(?:[^/]+\/)?(image|raw|video)\/upload/
      );
      const resourceType = (resourceTypeMatch ? resourceTypeMatch[1] : "image") as
        | "image"
        | "raw"
        | "video";

      const extMatch = fileUrl.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
      const format = extMatch ? extMatch[1] : cleanFilename.split(".").pop() || "pdf";

      try {
        // Generate signed private download URL using Cloudinary API Secret
        const signedUrl = cloudinary.utils.private_download_url(publicId, format, {
          resource_type: resourceType,
          type: "upload",
          attachment: false,
        });

        if (signedUrl) {
          fetchTargetUrl = signedUrl;
        }
      } catch (signErr) {
        console.warn("[Chat Download] Failed to sign Cloudinary URL, falling back to direct URL:", signErr);
      }
    }

    // 4. Fetch the file buffer from Cloudinary
    const upstreamRes = await fetch(fetchTargetUrl);
    if (!upstreamRes.ok) {
      console.error(
        `[Chat Download] Upstream fetch failed with status ${upstreamRes.status} for ${fetchTargetUrl}`
      );
      return NextResponse.json(
        { error: `Failed to retrieve file from storage provider (${upstreamRes.status})` },
        { status: upstreamRes.status }
      );
    }

    const contentType = upstreamRes.headers.get("content-type") || fallbackMime;
    const dispositionType = isInline ? "inline" : "attachment";

    // Encode filename for RFC 5987 compliance (supports non-ASCII characters & spaces)
    const contentDisposition = `${dispositionType}; filename="${cleanFilename}"; filename*=UTF-8''${encodeURIComponent(cleanFilename)}`;

    // 5. Stream response directly to client
    return new NextResponse(upstreamRes.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[Chat Download] Error streaming attachment:", message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
