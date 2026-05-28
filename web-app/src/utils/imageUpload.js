export const IMAGE_UPLOAD_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
export const IMAGE_UPLOAD_MAX_BYTES =
  Number(import.meta.env.VITE_IMAGE_UPLOAD_MAX_MB || 1) * 1024 * 1024;

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function validateImageFile(file) {
  if (!file) {
    return "Image file is required.";
  }

  if (!IMAGE_MIME_TYPES.has(file.type)) {
    return "Only JPG, PNG, WEBP, or GIF images are allowed.";
  }

  if (file.size > IMAGE_UPLOAD_MAX_BYTES) {
    return `Image must be ${formatFileSize(IMAGE_UPLOAD_MAX_BYTES)} or smaller.`;
  }

  return null;
}

export function formatFileSize(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${Math.round((bytes / 1024 / 1024) * 10) / 10} MB`;
  }

  return `${Math.ceil(bytes / 1024)} KB`;
}
