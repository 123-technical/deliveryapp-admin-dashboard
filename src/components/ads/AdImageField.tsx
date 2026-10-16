import { useEffect, useRef, useState } from "react";
import { Button, App } from "antd";
import { UploadOutlined, ScissorOutlined, DeleteOutlined, PictureOutlined } from "@ant-design/icons";
import ImageCropModal from "./ImageCropModal";
import { AD_LIMITS, PLACEMENT_SPECS, type AdPlacement } from "../../types/ad";
import { loadDimensions, ratioProblem, type AdImageValue } from "./adImage";

interface AdImageFieldProps {
  value?: AdImageValue;
  onChange?: (value: AdImageValue) => void;
  placement: AdPlacement;
}

export default function AdImageField({ value, onChange, placement }: AdImageFieldProps) {
  const { message } = App.useApp();
  const spec = PLACEMENT_SPECS[placement];
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();
  // The original pick, so re-cropping always starts from full quality.
  const [source, setSource] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (value instanceof File) {
      const url = URL.createObjectURL(value);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(value);
  }, [value]);

  useEffect(() => {
    let cancelled = false;
    setInfo(null);
    if (!value) return;
    loadDimensions(value)
      .then((d) => {
        if (cancelled) return;
        const size = value instanceof File ? ` · ${Math.round(value.size / 1024)} KB` : "";
        setInfo(`${d.w}×${d.h}${size}`);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [value]);

  const pick = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      message.error("Please choose an image file");
      return;
    }
    setSource(file);
    let problem: string | null = null;
    try {
      problem = ratioProblem(await loadDimensions(file), placement);
    } catch {
      message.error("This file isn't a readable image");
      return;
    }
    if (problem || file.size > AD_LIMITS.maxImageBytes) {
      message.info(problem ?? "Image is over 1 MB — crop it to compress.");
      setCropOpen(true);
      return;
    }
    onChange?.(file);
  };

  return (
    <div>
      <div
        style={{
          width: "100%",
          // Cap by height (260px) while keeping the exact placement ratio.
          maxWidth: Math.round((260 * spec.width) / spec.height),
          aspectRatio: `${spec.width} / ${spec.height}`,
          borderRadius: 10,
          border: "1px dashed #CBD5E1",
          background: "#F8FAFC",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          marginInline: "auto",
        }}
        onClick={() => inputRef.current?.click()}
        title="Choose image"
      >
        {previewUrl ? (
          <img src={previewUrl} alt="Ad creative" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ textAlign: "center", color: "#94A3B8", fontSize: 13 }}>
            <PictureOutlined style={{ fontSize: 28, display: "block", marginBottom: 6 }} />
            {spec.width}×{spec.height} ({spec.ratioLabel}), JPG/PNG/WebP, max 1 MB
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <Button size="small" icon={<UploadOutlined />} onClick={() => inputRef.current?.click()}>
          {value ? "Replace" : "Upload"}
        </Button>
        {source && (
          <Button size="small" icon={<ScissorOutlined />} onClick={() => setCropOpen(true)}>
            Crop
          </Button>
        )}
        {value && (
          <Button
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => {
              setSource(null);
              onChange?.(undefined);
            }}
          >
            Remove
          </Button>
        )}
        {info && <span style={{ fontSize: 12, color: "#64748B", marginLeft: "auto" }}>{info}</span>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) pick(file);
        }}
      />

      <ImageCropModal
        open={cropOpen}
        file={source}
        outputWidth={spec.width}
        outputHeight={spec.height}
        onCancel={() => setCropOpen(false)}
        onCrop={(cropped) => {
          setCropOpen(false);
          onChange?.(cropped);
        }}
      />
    </div>
  );
}
