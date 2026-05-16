import { useState, useRef, useCallback, useEffect } from "react";
import { uploadService } from "../services/upload";

export type ImageUploadState = {
  /** Unique ID for React keying */
  id: string;
  file: File | null;
  /** objectName returned by backend after upload, or pre-existing key */
  objectName: string | null;
  /** Display URL: local blob while uploading, full Oracle URL for existing */
  previewUrl: string;
  /** File name to display */
  fileName: string;
  progress: number; // 0–100
  status: "pending" | "uploading" | "done" | "error";
  error: string | null;
};

interface MultiImageUploadProps {
  /** Pre-existing image URLs (from product.imageUrls) — used in Edit form */
  existingImageUrls?: string[];
  /** Called whenever the set of uploaded objectNames changes */
  onChange: (objectNames: string[]) => void;
  disabled?: boolean;
  maxSizeMB?: number;
}

/** Derive an objectName from a full Oracle Cloud URL like:
 *  https://objectstorage.<region>.oraclecloud.com/n/.../b/.../o/uploads/file.jpg
 *  → "uploads/file.jpg"
 */
function deriveObjectName(imageUrl: string): string {
  try {
    const url = new URL(imageUrl);
    const oIndex = url.pathname.indexOf("/o/");
    if (oIndex !== -1) {
      return decodeURIComponent(url.pathname.substring(oIndex + 3));
    }
  } catch {
    // fallback: just use the URL as-is
  }
  return imageUrl;
}

let idCounter = 0;
function nextId() {
  return `img-${++idCounter}-${Date.now()}`;
}

export default function MultiImageUpload({
  existingImageUrls = [],
  onChange,
  disabled = false,
  maxSizeMB = 5,
}: MultiImageUploadProps) {
  const [images, setImages] = useState<ImageUploadState[]>(() =>
    existingImageUrls.map((url) => ({
      id: nextId(),
      file: null,
      objectName: deriveObjectName(url),
      previewUrl: url,
      fileName: deriveObjectName(url).split("/").pop() ?? "image",
      progress: 100,
      status: "done" as const,
      error: null,
    }))
  );
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync onChange whenever images change
  useEffect(() => {
    const objectNames = images
      .filter((img) => img.status === "done" && img.objectName)
      .map((img) => img.objectName as string);
    onChange(objectNames);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  const uploadImage = useCallback(
    async (id: string, file: File) => {
      setImages((prev) =>
        prev.map((img) =>
          img.id === id
            ? { ...img, status: "uploading", progress: 0, error: null }
            : img
        )
      );

      try {
        const objectName = await uploadService.uploadFile(file, (percent) => {
          setImages((prev) =>
            prev.map((img) =>
              img.id === id ? { ...img, progress: percent } : img
            )
          );
        });

        setImages((prev) =>
          prev.map((img) =>
            img.id === id
              ? { ...img, status: "done", progress: 100, objectName }
              : img
          )
        );
      } catch (err) {
        setImages((prev) =>
          prev.map((img) =>
            img.id === id
              ? {
                  ...img,
                  status: "error",
                  error: err instanceof Error ? err.message : "Upload failed",
                }
              : img
          )
        );
      }
    },
    []
  );

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArr = Array.from(files);
      const newImages: ImageUploadState[] = [];

      for (const file of fileArr) {
        if (!file.type.startsWith("image/")) continue;
        const maxBytes = maxSizeMB * 1024 * 1024;
        if (file.size > maxBytes) continue;

        const id = nextId();
        newImages.push({
          id,
          file,
          objectName: null,
          previewUrl: URL.createObjectURL(file),
          fileName: file.name,
          progress: 0,
          status: "pending",
          error: null,
        });
      }

      if (newImages.length === 0) return;

      setImages((prev) => [...prev, ...newImages]);

      // Kick off uploads in parallel
      for (const img of newImages) {
        uploadImage(img.id, img.file!);
      }
    },
    [maxSizeMB, uploadImage]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  };

  const handleRemove = (id: string) => {
    setImages((prev) => {
      const removed = prev.find((img) => img.id === id);
      if (removed?.previewUrl && removed.file) {
        // Only revoke blob URLs (not Oracle URLs)
        try {
          URL.revokeObjectURL(removed.previewUrl);
        } catch {}
      }
      return prev.filter((img) => img.id !== id);
    });
  };

  const handleRetry = (id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img?.file) uploadImage(id, img.file);
      return prev;
    });
  };

  const doneCount = images.filter((img) => img.status === "done").length;

  return (
    <div style={{ width: "100%" }}>
      {/* Zone label */}
      <div
        style={{
          marginBottom: 6,
          fontSize: 14,
          fontWeight: 500,
          color: "#374151",
        }}
      >
        Upload Product Images{" "}
        <span style={{ fontWeight: 400, color: "#6b7280" }}>
          (you can select multiple)
        </span>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => !disabled && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        style={{
          border: `2px dashed ${dragOver ? "#4f46e5" : "#d1d5db"}`,
          borderRadius: 12,
          padding: "20px 16px",
          textAlign: "center",
          cursor: disabled ? "not-allowed" : "pointer",
          background: dragOver
            ? "rgba(79,70,229,0.05)"
            : "rgba(249,250,251,1)",
          transition: "all 0.2s ease",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleInputChange}
          style={{ display: "none" }}
          disabled={disabled}
          id="multi-image-upload-input"
        />
        <div style={{ fontSize: 28, marginBottom: 6 }}>🖼️</div>
        <div style={{ fontSize: 14, color: "#374151", fontWeight: 500 }}>
          Click to browse or drag &amp; drop images here
        </div>
        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
          PNG, JPG, WEBP up to {maxSizeMB}MB each — multiple files supported
        </div>
      </div>

      {/* Count */}
      {images.length > 0 && (
        <div
          style={{
            marginTop: 8,
            fontSize: 13,
            color: doneCount > 0 ? "#10b981" : "#6b7280",
            fontWeight: 500,
          }}
        >
          {doneCount} image{doneCount !== 1 ? "s" : ""} uploaded successfully
          {images.length !== doneCount && ` (${images.length - doneCount} pending/uploading)`}
        </div>
      )}

      {/* Thumbnail row */}
      {images.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: 12,
            overflowX: "auto",
            paddingBottom: 8,
            marginTop: 12,
          }}
        >
          {images.map((img) => (
            <div
              key={img.id}
              style={{
                flex: "0 0 110px",
                width: 110,
                border: `2px solid ${
                  img.status === "done"
                    ? "#10b981"
                    : img.status === "error"
                    ? "#ef4444"
                    : "#e5e7eb"
                }`,
                borderRadius: 10,
                overflow: "hidden",
                background: "#fff",
                position: "relative",
                transition: "border-color 0.2s",
              }}
            >
              {/* Thumbnail image */}
              <div
                style={{
                  width: "100%",
                  height: 90,
                  background: "#f3f4f6",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={img.previewUrl}
                  alt={img.fileName}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>

              {/* File name */}
              <div
                style={{
                  padding: "4px 6px",
                  fontSize: 11,
                  color: "#374151",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={img.fileName}
              >
                {img.fileName}
              </div>

              {/* Progress bar while uploading */}
              {img.status === "uploading" && (
                <div style={{ padding: "0 6px 4px" }}>
                  <div
                    style={{
                      width: "100%",
                      height: 4,
                      background: "#e5e7eb",
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${img.progress}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, #4f46e5, #7c3aed)",
                        borderRadius: 2,
                        transition: "width 0.2s ease",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "#4f46e5",
                      textAlign: "center",
                      marginTop: 2,
                    }}
                  >
                    {img.progress}%
                  </div>
                </div>
              )}

              {/* Done checkmark */}
              {img.status === "done" && (
                <div
                  style={{
                    position: "absolute",
                    top: 6,
                    left: 6,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "#10b981",
                    color: "#fff",
                    fontSize: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                  }}
                >
                  ✓
                </div>
              )}

              {/* Error text + retry */}
              {img.status === "error" && (
                <div style={{ padding: "0 6px 4px" }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: "#ef4444",
                      marginBottom: 2,
                    }}
                  >
                    {img.error ?? "Upload failed"}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRetry(img.id);
                    }}
                    style={{
                      fontSize: 10,
                      padding: "2px 6px",
                      borderRadius: 4,
                      border: "1px solid #ef4444",
                      color: "#ef4444",
                      background: "#fff",
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Remove button (×) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(img.id);
                }}
                title="Remove image"
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  border: "none",
                  background: "rgba(0,0,0,0.55)",
                  color: "#fff",
                  fontSize: 11,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  lineHeight: 1,
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.background =
                    "rgba(239,68,68,0.9)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.background =
                    "rgba(0,0,0,0.55)")
                }
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
