import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { AdPlacement } from "../../types/ad";
import type { AdImageValue } from "./adImage";

/**
 * Renders an ad inside a 390px-wide phone mock of the customer app screen
 * it appears on. Sizes mirror the Flutter widgets (1 CSS px ≈ 1 dp), so
 * what the admin sees here is what customers get.
 */
export type AdPreviewData = {
  placement: AdPlacement;
  advertiserName?: string;
  title?: string;
  subtitle?: string;
  ctaText?: string;
  backgroundColor?: string | null;
  ctaColor?: string | null;
  displaySeconds?: number | null;
  image?: AdImageValue;
};

const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 780;
const APP_GREEN = "#3DAA5C";
const FONT = "'Poppins', system-ui, sans-serif";

function useImageUrl(image: AdImageValue) {
  const [url, setUrl] = useState<string | undefined>();
  useEffect(() => {
    if (image instanceof File) {
      const u = URL.createObjectURL(image);
      setUrl(u);
      return () => URL.revokeObjectURL(u);
    }
    setUrl(image);
  }, [image]);
  return url;
}

/** Load Poppins once so the preview uses the app's typeface. */
function usePoppins() {
  useEffect(() => {
    const id = "poppins-font-preview";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(link);
  }, []);
}

/** Same rule as the app: white text on dark colours, near-black on light. */
function onColor(hex: string): string {
  const m = /^#?([0-9a-f]{6})/i.exec(hex);
  if (!m) return "#fff";
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return (luminance + 0.05) ** 2 > 0.15 ? "#1A1A1A" : "#FFFFFF";
}

const ellipsis: CSSProperties = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

function AdImage({ url, radius = 0 }: { url?: string; radius?: number }) {
  return url ? (
    <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", borderRadius: radius }} />
  ) : (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: radius,
        background: "repeating-linear-gradient(45deg,#ECEEF1,#ECEEF1 10px,#F4F5F7 10px,#F4F5F7 20px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#94A3B8",
        fontSize: 11,
      }}
    >
      Your image
    </div>
  );
}

function SponsoredChip() {
  return (
    <span
      style={{
        position: "absolute",
        top: 10,
        right: 10,
        padding: "3px 7px",
        borderRadius: 6,
        background: "rgba(0,0,0,.45)",
        color: "#fff",
        fontSize: 9.5,
        fontWeight: 600,
        letterSpacing: 0.3,
      }}
    >
      Sponsored
    </span>
  );
}

function Cta({ data, height, fontSize = 12, padX = 14 }: { data: AdPreviewData; height: number; fontSize?: number; padX?: number }) {
  const bg = data.ctaColor || APP_GREEN;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height,
        padding: `0 ${padX}px`,
        borderRadius: height / 2,
        background: bg,
        color: onColor(bg),
        fontSize,
        fontWeight: 700,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {data.ctaText || "Shop Now"}
    </span>
  );
}

function Block({ w, h, r = 8, style }: { w: number | string; h: number; r?: number; style?: CSSProperties }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: "#F0F1F3", flexShrink: 0, ...style }} />;
}

// ── HOME_BANNER ───────────────────────────────

function HomeMock({ data, url }: { data: AdPreviewData; url?: string }) {
  return (
    <div style={{ padding: "8px 0" }}>
      <div style={{ padding: "6px 16px 10px" }}>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -1, color: "#111" }}>beeyo</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#6B6B6B", marginTop: 2 }}>📍 Home – Delivery address</div>
      </div>
      <div style={{ margin: "4px 16px 10px", height: 44, borderRadius: 14, border: "1px solid #E0E0E0", background: "#F3F3F3", display: "flex", alignItems: "center", padding: "0 14px", fontSize: 13, color: "#9E9E9E" }}>
        🔍&nbsp; Search for products…
      </div>
      <div style={{ display: "flex", gap: 4, padding: "0 16px 10px", overflow: "hidden" }}>
        {["All", "Meat & Seafood", "Pantry", "Grains"].map((c, i) => (
          <span key={c} style={{ padding: "6px 14px", borderRadius: 10, fontSize: 11, fontWeight: i === 0 ? 700 : 500, background: i === 0 ? APP_GREEN : "#F0F0F0", color: i === 0 ? "#fff" : "#6B6B6B", border: `1px solid ${i === 0 ? APP_GREEN : "#E0E0E0"}`, whiteSpace: "nowrap" }}>
            {c}
          </span>
        ))}
      </div>

      {/* The ad: full width minus 16px padding, exactly 2:1 */}
      <div style={{ padding: "8px 16px 10px" }}>
        <div style={{ position: "relative", aspectRatio: "2 / 1", borderRadius: 16, overflow: "hidden", background: data.backgroundColor || "#ECEEF1" }}>
          <AdImage url={url} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 35%, rgba(0,0,0,.7))" }} />
          <SponsoredChip />
          <div style={{ position: "absolute", left: 14, right: 14, bottom: 12, color: "#fff" }}>
            <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.25, ...ellipsis }}>{data.title || "Ad headline"}</div>
            {data.subtitle && <div style={{ fontSize: 12, fontWeight: 500, opacity: 0.88, ...ellipsis }}>{data.subtitle}</div>}
            <div style={{ marginTop: 8 }}>
              <Cta data={data} height={30} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "6px 16px 12px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 4, height: 20, borderRadius: 2, background: APP_GREEN }} />
        <span style={{ fontSize: 18, fontWeight: 800 }}>Festive Offers</span>
      </div>
      <div style={{ display: "flex", gap: 12, padding: "0 16px" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 150, flexShrink: 0 }}>
            <Block w={150} h={150} r={16} />
            <Block w={110} h={10} style={{ marginTop: 10 }} />
            <Block w={70} h={10} style={{ marginTop: 6 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── CART_INLINE ───────────────────────────────

/** Matches _CartItemCard: 1px border, 12px padding, 16 radius, 70px thumb. */
function CartRow({ background = "#fff", thumb, title, label, left, right }: { background?: string; thumb: ReactNode; title: ReactNode; label: ReactNode; left: ReactNode; right: ReactNode }) {
  return (
    <div style={{ border: "1px solid #E0E0E0", borderRadius: 16, padding: 12, background, display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ width: 70, height: 70, borderRadius: 12, overflow: "hidden", flexShrink: 0 }}>{thumb}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(0,0,0,.87)", lineHeight: 1.4, ...ellipsis }}>{title}</div>
        <div style={{ fontSize: 11, color: "#6B6B6B", marginTop: 4, lineHeight: 1.4, ...ellipsis }}>{label}</div>
        <div style={{ marginTop: 12, height: 31, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>{left}</div>
          {right}
        </div>
      </div>
    </div>
  );
}

function ProductRow({ name, price }: { name: string; price: string }) {
  return (
    <CartRow
      thumb={<Block w="100%" h={70} r={12} />}
      title={name}
      label="GRAM"
      left={<span style={{ fontSize: 16, fontWeight: 800 }}>{price}</span>}
      right={
        <span style={{ height: 31, borderRadius: 20, background: APP_GREEN, color: "#fff", display: "inline-flex", alignItems: "center", gap: 14, padding: "0 12px", fontSize: 13, fontWeight: 800 }}>
          − <span>1</span> +
        </span>
      }
    />
  );
}

function CartMock({ data, url }: { data: AdPreviewData; url?: string }) {
  return (
    <div>
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 28, fontSize: 20, fontWeight: 700 }}>
        <span style={{ fontSize: 18 }}>←</span> My Cart
      </div>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
        <ProductRow name="Fish 500g" price="₹280.00" />
        <ProductRow name="Chicken Breast 500g" price="₹250.00" />
        <ProductRow name="MDH Garam Masala" price="₹60.00" />
        <CartRow
          background={data.backgroundColor || "#fff"}
          thumb={<AdImage url={url} />}
          title={data.title || "Ad headline"}
          label={data.advertiserName ? `Sponsored · ${data.advertiserName}` : "Sponsored"}
          left={<div style={{ fontSize: 12, fontWeight: 600, color: "#1A1A1A", ...ellipsis }}>{data.subtitle || data.advertiserName || ""}</div>}
          right={<Cta data={data} height={31} />}
        />
        <ProductRow name="Salt 1kg" price="₹25.00" />
      </div>
    </div>
  );
}

// ── ORDER_SUCCESS ─────────────────────────────

function OrderSuccessMock({ data, url }: { data: AdPreviewData; url?: string }) {
  const bg = data.backgroundColor || "#F4F7F5";
  const fg = onColor(bg);
  const seconds = data.displaySeconds ?? 6;
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, padding: "36px 16px 16px", textAlign: "center", overflow: "hidden" }}>
        <div style={{ width: 112, height: 112, borderRadius: "50%", background: "#E8F5E9", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: APP_GREEN, color: "#fff", fontSize: 40, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>✓</div>
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, marginTop: 20 }}>Order Placed!</div>
        <div style={{ fontSize: 13, color: "#6B6B6B", marginTop: 4 }}>Your order has been received successfully</div>
        <span style={{ display: "inline-block", marginTop: 10, padding: "4px 12px", borderRadius: 20, background: "#F2F4F3", fontSize: 12, fontWeight: 600, color: "#6B6B6B" }}>Order #1A2B3C4D</span>

        <div style={{ marginTop: 28, borderRadius: 20, overflow: "hidden", background: bg, textAlign: "left" }}>
          <div style={{ position: "relative", aspectRatio: "3 / 2" }}>
            <AdImage url={url} />
            <SponsoredChip />
          </div>
          <div style={{ height: 76, padding: "0 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0, color: fg }}>
              <div style={{ fontSize: 15, fontWeight: 700, ...ellipsis }}>{data.title || "Ad headline"}</div>
              {data.subtitle && <div style={{ fontSize: 12, opacity: 0.7, ...ellipsis }}>{data.subtitle}</div>}
            </div>
            <Cta data={data} height={36} fontSize={12.5} padX={18} />
          </div>
        </div>
      </div>
      <div style={{ padding: "4px 16px 16px" }}>
        <div style={{ height: 3, borderRadius: 2, background: "#EDEFEE" }}>
          <div style={{ width: "35%", height: "100%", borderRadius: 2, background: APP_GREEN }} />
        </div>
        <div style={{ fontSize: 12, color: "#A0A0A0", textAlign: "center", marginTop: 8 }}>
          Taking you to your order in {Math.ceil(seconds * 0.65)}s
        </div>
        <div style={{ marginTop: 12, height: 52, borderRadius: 16, background: APP_GREEN, color: "#fff", fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
          View my order
        </div>
      </div>
    </div>
  );
}

export default function AdPreview({ data }: { data: AdPreviewData }) {
  usePoppins();
  const url = useImageUrl(data.image);

  return (
    <div
      style={{
        width: PHONE_WIDTH + 20,
        padding: 10,
        borderRadius: 44,
        background: "#0F172A",
        boxShadow: "0 20px 40px rgba(15,23,42,.18)",
      }}
    >
      <div
        style={{
          width: PHONE_WIDTH,
          height: PHONE_HEIGHT,
          borderRadius: 34,
          overflow: "hidden",
          background: "#fff",
          fontFamily: FONT,
          color: "#1A1A1A",
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ height: 30, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", fontSize: 12, fontWeight: 600 }}>
          <span>9:41</span>
          <span style={{ width: 80, height: 20, borderRadius: 12, background: "#0F172A" }} />
          <span>●●●</span>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          {data.placement === "HOME_BANNER" && <HomeMock data={data} url={url} />}
          {data.placement === "CART_INLINE" && <CartMock data={data} url={url} />}
          {data.placement === "ORDER_SUCCESS" && <OrderSuccessMock data={data} url={url} />}
        </div>
      </div>
    </div>
  );
}
