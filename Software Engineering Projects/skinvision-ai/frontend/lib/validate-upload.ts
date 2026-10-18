// Client-side mirror of the PRD FR-02 "Suggested MVP Limits" table.
// This gives instant feedback before spending a network round trip;
// the backend re-validates everything regardless, since client checks
// can always be bypassed.

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MIN_IMAGE_DIMENSION = 256;
export const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export interface ValidationResult {
  ok: boolean;
  message?: string;
}

export function validateFileBasics(file: File): ValidationResult {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, message: "Please upload a JPG, PNG, or WebP image." };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, message: "That file is larger than 10 MB. Please choose a smaller image." };
  }
  return { ok: true };
}

export function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this image file."));
    };
    img.src = url;
  });
}

export async function validateFile(file: File): Promise<ValidationResult> {
  const basics = validateFileBasics(file);
  if (!basics.ok) return basics;

  try {
    const { width, height } = await readImageDimensions(file);
    if (Math.min(width, height) < MIN_IMAGE_DIMENSION) {
      return {
        ok: false,
        message: `Image is too small. Please use at least ${MIN_IMAGE_DIMENSION}×${MIN_IMAGE_DIMENSION}px.`,
      };
    }
  } catch {
    return { ok: false, message: "This file doesn't look like a valid image." };
  }

  return { ok: true };
}
