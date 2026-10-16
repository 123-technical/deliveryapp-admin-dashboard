import { AD_LIMITS, PLACEMENT_SPECS, type AdPlacement } from "../../types/ad";

/** A picked-but-not-uploaded file, or the URL of the image already saved. */
export type AdImageValue = File | string | undefined;

/** Natural size of an image file or URL (no CORS needed for dimensions). */
export function loadDimensions(value: File | string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const url = value instanceof File ? URL.createObjectURL(value) : value;
    const img = new Image();
    img.onload = () => {
      resolve({ w: img.naturalWidth, h: img.naturalHeight });
      if (value instanceof File) URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      reject(new Error("Image could not be loaded"));
      if (value instanceof File) URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

export function ratioProblem(dims: { w: number; h: number }, placement: AdPlacement): string | null {
  const spec = PLACEMENT_SPECS[placement];
  const want = spec.width / spec.height;
  const got = dims.w / dims.h;
  if (Math.abs(got - want) / want <= AD_LIMITS.ratioTolerance) return null;
  return `Image is ${dims.w}×${dims.h}; ${spec.label} needs ${spec.ratioLabel} (e.g. ${spec.width}×${spec.height}).`;
}

/** Form rule: right aspect ratio (±2%) and, for new files, ≤ 1 MB. */
export async function validateAdImage(value: AdImageValue, placement: AdPlacement): Promise<void> {
  if (!value) throw new Error("Please add an image");
  if (value instanceof File && value.size > AD_LIMITS.maxImageBytes) {
    throw new Error(`Image is ${(value.size / 1024 / 1024).toFixed(2)} MB — max 1 MB. Use Crop to compress it.`);
  }
  let dims: { w: number; h: number };
  try {
    dims = await loadDimensions(value);
  } catch {
    // An existing URL we can't load here (e.g. storage offline) — don't block saving other edits.
    if (typeof value === "string") return;
    throw new Error("This file isn't a readable image");
  }
  const problem = ratioProblem(dims, placement);
  if (problem) throw new Error(problem);
}
