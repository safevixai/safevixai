// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

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

export function compressImageFile(file: File, maxSizeBytes = 1.5 * 1024 * 1024): Promise<File> {
  // If the file is already small enough, do not compress
  if (file.size <= maxSizeBytes) {
    return Promise.resolve(file);
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDimension = 1920;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file); // fallback
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file); // fallback
              return;
            }
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          0.8
        );
      };
      img.onerror = () => resolve(file); // fallback
      img.src = event.target?.result as string;
    };
    reader.onerror = () => resolve(file); // fallback
    reader.readAsDataURL(file);
  });
}

