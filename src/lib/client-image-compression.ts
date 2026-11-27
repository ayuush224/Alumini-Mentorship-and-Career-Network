/**
 * Client-Side Image Pre-Processing & Compression
 * Downscales oversized camera/phone photos before transmitting via Server Action or API.
 * Keeps file size < 1MB without noticeable loss in visual quality, preventing 413 / React #441 errors.
 */

export async function compressChatImageFile(
  file: File,
  maxDimension = 1920,
  quality = 0.82
): Promise<File> {
  // Only process images (leave documents, PDFs, zips as-is)
  if (!file.type.startsWith("image/")) {
    return file;
  }

  // Skip SVG or GIF (which may contain animations)
  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    return file;
  }

  // If already under 800KB, no downscaling needed unless user wants
  if (file.size < 800 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        let { width, height } = img;

        // Proportional downscale if exceeding maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve(file);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Prefer image/jpeg for compression ratio, or retain image/png
        const outputMime = file.type === "image/png" && file.size < 2 * 1024 * 1024 ? "image/png" : "image/jpeg";
        const extension = outputMime === "image/png" ? ".png" : ".jpg";
        const baseName = file.name.replace(/\.[^/.]+$/, "");

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file);
            }
            const compressedFile = new File([blob], `${baseName}${extension}`, {
              type: outputMime,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          outputMime,
          quality
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file); // Fallback to raw file
      };

      img.src = objectUrl;
    } catch {
      resolve(file);
    }
  });
}
