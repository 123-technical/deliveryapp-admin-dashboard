import { useState, useRef, useCallback } from "react";
import { uploadService } from "../services/upload";

interface ImageUploadProps {
  /** Current image URL (for displaying existing images) */
  value?: string;
  /** Callback when a new image is uploaded or cleared (URL mode) */
  onChange?: (url: string | undefined) => void;
  /** Callback when a file is selected (Deferred mode) */
  onFileSelect?: (file: File | undefined) => void;
  /** Label to display above the upload area */
  label?: string;
  /** Whether the upload is disabled */
  disabled?: boolean;
  /** Accepted file types */
  accept?: string;
  /** Max file size in MB */
  maxSizeMB?: number;
}

type UploadStatus = "idle" | "uploading" | "success" | "error";

export default function ImageUpload({
  value,
  onChange,
  onFileSelect,
  label = "Image",
  disabled = false,
  accept = "image/*",
  maxSizeMB = 5,
}: ImageUploadProps) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }

      // Validate file size
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        setError(`File size must be less than ${maxSizeMB}MB`);
        return;
      }

      // Create local preview
      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);
      setError(null);
      setStatus("uploading");
      setProgress(0);

      if (onFileSelect) {
        // Deferred mode: just pass the file up
        onFileSelect(file);
        setStatus("idle");
        return;
      }

      try {
        const publicUrl = await uploadService.uploadFile(file, (percent) => {
          setProgress(percent);
        });

        setStatus("success");
        setProgress(100);
        onChange?.(publicUrl);

        // Clean up local preview
        URL.revokeObjectURL(localPreview);
        setPreviewUrl(null);
      } catch (err) {
        setStatus("error");
        setError(
          err instanceof Error ? err.message : "Upload failed"
        );

        // Clean up local preview on error
        URL.revokeObjectURL(localPreview);
        setPreviewUrl(null);
      }
    },
    [maxSizeMB, onChange]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so the same file can be selected again
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled || status === "uploading") return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && status !== "uploading") {
      setDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleClear = () => {
    onChange?.(undefined);
    onFileSelect?.(undefined);
    setPreviewUrl(null);
    setStatus("idle");
    setProgress(0);
    setError(null);
  };

  const handleClick = () => {
    if (!disabled && status !== "uploading") {
      fileInputRef.current?.click();
    }
  };

  const displayUrl = previewUrl || value;
  const hasImage = !!displayUrl;

  return (
    <div style={{ width: "100%" }}>
      {label && (
        <div
          style={{
            marginBottom: 6,
            fontSize: 14,
            fontWeight: 500,
            color: "#374151",
          }}
        >
          {label}
        </div>
      )}

      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          position: "relative",
          border: `2px dashed ${
            dragOver
              ? "#4f46e5"
              : error
              ? "#ef4444"
              : status === "success"
              ? "#10b981"
              : "#d1d5db"
          }`,
          borderRadius: 12,
          padding: hasImage ? 0 : "24px 16px",
          textAlign: "center",
          cursor: disabled || status === "uploading" ? "not-allowed" : "pointer",
          background: dragOver
            ? "rgba(79, 70, 229, 0.04)"
            : error
            ? "rgba(239, 68, 68, 0.02)"
            : "#fafafa",
          transition: "all 0.2s ease",
          overflow: "hidden",
          minHeight: hasImage ? 0 : 120,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          style={{ display: "none" }}
          disabled={disabled || status === "uploading"}
        />

        {/* Image preview */}
        {hasImage && (
          <div style={{ position: "relative", width: "100%" }}>
            <img
              src={displayUrl}
              alt="Preview"
              style={{
                width: "100%",
                maxHeight: 200,
                objectFit: "contain",
                display: "block",
                borderRadius: 10,
                padding: 8,
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />

            {/* Clear button */}
            {status !== "uploading" && !disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  border: "none",
                  background: "rgba(0,0,0,0.6)",
                  color: "#fff",
                  fontSize: 16,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  lineHeight: 1,
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) =>
                  ((e.target as HTMLElement).style.background =
                    "rgba(239,68,68,0.9)")
                }
                onMouseLeave={(e) =>
                  ((e.target as HTMLElement).style.background =
                    "rgba(0,0,0,0.6)")
                }
                title="Remove image"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Upload prompt (when no image) */}
        {!hasImage && status !== "uploading" && (
          <>
            <div
              style={{
                fontSize: 32,
                lineHeight: 1,
                marginBottom: 8,
                color: "#9ca3af",
              }}
            >
              📷
            </div>
            <div style={{ fontSize: 14, color: "#6b7280", fontWeight: 500 }}>
              Click to upload or drag & drop
            </div>
            <div
              style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}
            >
              PNG, JPG, WEBP up to {maxSizeMB}MB
            </div>
          </>
        )}

        {/* Upload progress */}
        {status === "uploading" && (
          <div
            style={{
              width: "100%",
              padding: hasImage ? "8px 16px" : 0,
              position: hasImage ? "absolute" : "relative",
              bottom: hasImage ? 0 : undefined,
              left: 0,
              background: hasImage ? "rgba(255,255,255,0.9)" : "transparent",
            }}
          >
            <div
              style={{
                fontSize: 13,
                color: "#4f46e5",
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Uploading... {progress}%
            </div>
            <div
              style={{
                width: "100%",
                height: 6,
                background: "#e5e7eb",
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #4f46e5, #7c3aed)",
                  borderRadius: 3,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            color: "#ef4444",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          ⚠ {error}
        </div>
      )}

      {/* Success indicator */}
      {status === "success" && !error && (
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            color: "#10b981",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          ✓ Image uploaded successfully
        </div>
      )}
    </div>
  );
}
