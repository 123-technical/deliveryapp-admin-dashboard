import { useEffect, useRef, useState } from "react";
import { Modal, Slider, App } from "antd";
import { ZoomInOutlined } from "@ant-design/icons";
import { AD_LIMITS } from "../../types/ad";

interface ImageCropModalProps {
  open: boolean;
  file: File | null;
  /** Locked output size — the crop frame keeps this ratio. */
  outputWidth: number;
  outputHeight: number;
  onCancel: () => void;
  onCrop: (file: File) => void;
}

const FRAME_WIDTH = 520;

/**
 * Drag-to-pan / slider-to-zoom cropper with the frame locked to the
 * placement's ratio. Exports a JPEG at the exact recommended creative size,
 * stepping quality down until it fits the 1 MB limit.
 */
export default function ImageCropModal({
  open,
  file,
  outputWidth,
  outputHeight,
  onCancel,
  onCrop,
}: ImageCropModalProps) {
  const { message } = App.useApp();
  const frameHeight = Math.round((FRAME_WIDTH * outputHeight) / outputWidth);

  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [exporting, setExporting] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    if (!file || !open) return;
    const url = URL.createObjectURL(file);
    setSrc(url);
    setNatural(null);
    setZoom(1);
    return () => URL.revokeObjectURL(url);
  }, [file, open]);

  // Smallest scale at which the image still covers the whole frame.
  const coverScale = natural ? Math.max(FRAME_WIDTH / natural.w, frameHeight / natural.h) : 1;
  const scale = coverScale * zoom;
  const drawnW = natural ? natural.w * scale : 0;
  const drawnH = natural ? natural.h * scale : 0;

  const clamp = (x: number, y: number) => ({
    x: Math.min(0, Math.max(FRAME_WIDTH - drawnW, x)),
    y: Math.min(0, Math.max(frameHeight - drawnH, y)),
  });

  // Keep the image centred when it first loads; re-clamp on zoom.
  useEffect(() => {
    if (!natural) return;
    setOffset((prev) => clamp(prev.x, prev.y));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, natural]);

  const onLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    const n = { w: img.naturalWidth, h: img.naturalHeight };
    setNatural(n);
    const s = Math.max(FRAME_WIDTH / n.w, frameHeight / n.h);
    setOffset({ x: (FRAME_WIDTH - n.w * s) / 2, y: (frameHeight - n.h * s) / 2 });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const d = drag.current;
    setOffset(clamp(d.ox + e.clientX - d.startX, d.oy + e.clientY - d.startY));
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const exportCrop = async () => {
    const img = imgRef.current;
    if (!img || !natural || !file) return;
    setExporting(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        img,
        -offset.x / scale,
        -offset.y / scale,
        FRAME_WIDTH / scale,
        frameHeight / scale,
        0,
        0,
        outputWidth,
        outputHeight,
      );

      let blob: Blob | null = null;
      for (const quality of [0.92, 0.85, 0.78, 0.7, 0.6, 0.5]) {
        blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
        if (blob && blob.size <= AD_LIMITS.maxImageBytes) break;
      }
      if (!blob || blob.size > AD_LIMITS.maxImageBytes) {
        message.error("Couldn't get the image under 1 MB — try a simpler image.");
        return;
      }
      const base = file.name.replace(/\.[^.]+$/, "") || "creative";
      onCrop(new File([blob], `${base}-${outputWidth}x${outputHeight}.jpg`, { type: "image/jpeg" }));
    } catch {
      message.error("Failed to crop image");
    } finally {
      setExporting(false);
    }
  };

  const sourceTooSmall = natural && (natural.w < outputWidth / zoom || natural.h < outputHeight / zoom);

  return (
    <Modal
      title={`Crop image · ${outputWidth}×${outputHeight}`}
      open={open}
      onCancel={onCancel}
      onOk={exportCrop}
      okText="Use cropped image"
      confirmLoading={exporting}
      okButtonProps={{ disabled: !natural, style: { background: "#0F172A", borderColor: "#0F172A" } }}
      width={FRAME_WIDTH + 48}
      destroyOnHidden
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          position: "relative",
          width: FRAME_WIDTH,
          height: frameHeight,
          overflow: "hidden",
          borderRadius: 8,
          background: "#0F172A",
          cursor: "grab",
          touchAction: "none",
          userSelect: "none",
        }}
      >
        {src && (
          <img
            ref={imgRef}
            src={src}
            alt="Crop source"
            onLoad={onLoad}
            draggable={false}
            style={{
              position: "absolute",
              left: offset.x,
              top: offset.y,
              width: drawnW || undefined,
              height: drawnH || undefined,
              maxWidth: "none",
              visibility: natural ? "visible" : "hidden",
              pointerEvents: "none",
            }}
          />
        )}
        {/* Rule-of-thirds guides */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.25) 1px, transparent 1px)",
            backgroundSize: `${FRAME_WIDTH / 3}px ${frameHeight / 3}px`,
            backgroundPosition: "-1px -1px",
            boxShadow: "inset 0 0 0 2px rgba(255,255,255,.7)",
          }}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
        <ZoomInOutlined style={{ color: "#64748B" }} />
        <Slider style={{ flex: 1 }} min={1} max={4} step={0.01} value={zoom} onChange={setZoom} tooltip={{ open: false }} />
      </div>
      <div style={{ fontSize: 12, color: sourceTooSmall ? "#B45309" : "#64748B" }}>
        Drag to reposition. Output: {outputWidth}×{outputHeight} JPEG, max 1 MB.
        {sourceTooSmall && " The source is smaller than the output at this zoom, so it will look soft."}
      </div>
    </Modal>
  );
}
