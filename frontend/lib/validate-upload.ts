export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const VALID_MAGIC_BYTES: Record<string, Uint8Array> = {
  'image/jpeg': new Uint8Array([0xFF, 0xD8, 0xFF]),
  'image/png': new Uint8Array([0x89, 0x50, 0x4E, 0x47]),
  'image/webp': new Uint8Array([0x52, 0x49, 0x46, 0x46]),
};

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return `Unsupported file type "${file.type}". Only JPEG, PNG, and WebP images are allowed.`;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `File exceeds the maximum upload size of ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`;
  }
  if (file.size === 0) {
    return 'Uploaded file is empty.';
  }
  return null;
}
