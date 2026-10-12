import { useEffect, useId, useRef, useState } from "react";
import { Map, useMap, useMapsLibrary, type MapEvent } from "@vis.gl/react-google-maps";
import { Button } from "antd";
import { AimOutlined, CloseOutlined, LoadingOutlined } from "@ant-design/icons";
import { MapGate, MapPlaceholder } from "../../lib/googleMaps";
import { DEFAULT_CENTER, DEFAULT_ZOOM, GOOGLE_MAPS_MAP_ID, useMapsConfigured } from "../../lib/googleMapsConfig";
import PlaceSearch, { type PickedPlace } from "./PlaceSearch";

export type PickedLocation = {
  lat: number;
  lng: number;
  /** Human-readable address; falls back to "lat, lng" when reverse geocoding fails. */
  address: string;
  addressSource: "search" | "geocoder" | "coordinates";
};

type Props = {
  /** Initial pin. Remount (change `key`) to load a different one. */
  value: google.maps.LatLngLiteral | null;
  /** Shown under the map for the initial pin, before the admin moves anything. */
  initialAddress?: string;
  onChange: (picked: PickedLocation | null) => void;
  height?: number;
};

const PICKED_ZOOM = 16;
const SAME_POINT_EPS = 1e-7;

const formatCoords = (p: google.maps.LatLngLiteral) => `${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`;
const samePoint = (a: google.maps.LatLngLiteral, b: google.maps.LatLngLiteral, eps = SAME_POINT_EPS) =>
  Math.abs(a.lat - b.lat) < eps && Math.abs(a.lng - b.lng) < eps;

/**
 * Swiggy/Zepto-style picker: the pin is fixed at the map's center and the map
 * pans underneath it. Whatever sits under the pin when the map goes idle is
 * the picked coordinate.
 */
export default function MapPicker({ value, initialAddress, onChange, height = 320 }: Props) {
  const configured = useMapsConfigured();
  const [picked, setPicked] = useState<PickedLocation | null>(
    value
      ? {
          ...value,
          address: initialAddress || formatCoords(value),
          addressSource: initialAddress ? "search" : "coordinates",
        }
      : null
  );
  const [resolving, setResolving] = useState(false);

  const emit = (next: PickedLocation | null) => {
    setPicked(next);
    onChange(next);
  };

  // Without a key there's no map, but backend place search still works.
  if (!configured) {
    return (
      <div>
        <PlaceSearch
          onPick={(p) =>
            emit({
              lat: p.lat,
              lng: p.lng,
              address: [p.title, p.subtitle].filter(Boolean).join(", "),
              addressSource: "search",
            })
          }
          style={{ marginBottom: 8 }}
        />
        <MapPlaceholder height={height} text="Google Maps key not configured" />
        <PickedSummary picked={picked} resolving={false} onClear={() => emit(null)} />
      </div>
    );
  }

  return (
    <div>
      <MapGate height={height}>
        <PickerMap
          initial={value}
          height={height}
          picked={picked}
          onPicked={emit}
          onResolvingChange={setResolving}
        />
      </MapGate>
      <PickedSummary picked={picked} resolving={resolving} onClear={() => emit(null)} />
    </div>
  );
}

function PickerMap({
  initial,
  height,
  picked,
  onPicked,
  onResolvingChange,
}: {
  initial: google.maps.LatLngLiteral | null;
  height: number;
  picked: PickedLocation | null;
  onPicked: (p: PickedLocation) => void;
  onResolvingChange: (v: boolean) => void;
}) {
  const mapId = useId();
  const map = useMap(mapId);
  const geocodingLib = useMapsLibrary("geocoding");
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  // The last point we reported (or the initial pin) — idles at the same spot are ignored,
  // so opening the editor or zooming in place doesn't count as a new pick.
  const lastPointRef = useRef<google.maps.LatLngLiteral>(initial ?? DEFAULT_CENTER);
  // A search pick already has a good label; use it instead of geocoding that point.
  const pendingLabelRef = useRef<{ point: google.maps.LatLngLiteral; label: string } | null>(null);
  const geocodeSeqRef = useRef(0);

  useEffect(() => {
    if (geocodingLib) geocoderRef.current = new geocodingLib.Geocoder();
  }, [geocodingLib]);

  const pick = async (point: google.maps.LatLngLiteral) => {
    lastPointRef.current = point;
    const seq = ++geocodeSeqRef.current;

    const pending = pendingLabelRef.current;
    pendingLabelRef.current = null;
    if (pending && samePoint(pending.point, point, 1e-5)) {
      onResolvingChange(false);
      onPicked({ ...point, address: pending.label, addressSource: "search" });
      return;
    }

    // Report the coordinate immediately; the address follows when geocoding finishes.
    onPicked({ ...point, address: formatCoords(point), addressSource: "coordinates" });
    const geocoder = geocoderRef.current;
    if (!geocoder) return;
    onResolvingChange(true);
    try {
      const { results } = await geocoder.geocode({ location: point, region: "IN" });
      if (seq !== geocodeSeqRef.current) return;
      const address = results[0]?.formatted_address;
      if (address) onPicked({ ...point, address, addressSource: "geocoder" });
    } catch {
      // Keep the raw lat/lng already shown (Geocoding API disabled, quota, no result…).
    } finally {
      if (seq === geocodeSeqRef.current) onResolvingChange(false);
    }
  };

  const handleIdle = (ev: MapEvent) => {
    const c = ev.map.getCenter();
    if (!c) return;
    const point = { lat: c.lat(), lng: c.lng() };
    if (samePoint(point, lastPointRef.current)) return;
    pick(point);
  };

  const handleSearchPick = (p: PickedPlace) => {
    const point = { lat: p.lat, lng: p.lng };
    pendingLabelRef.current = { point, label: [p.title, p.subtitle].filter(Boolean).join(", ") };
    if (map) {
      map.setZoom(PICKED_ZOOM);
      map.panTo(point);
    }
  };

  const getBias = () => {
    const c = map?.getCenter();
    return c ? { lat: c.lat(), lng: c.lng() } : undefined;
  };

  return (
    <div style={{ position: "relative", height, width: "100%", borderRadius: 8, overflow: "hidden" }}>
      <Map
        id={mapId}
        mapId={GOOGLE_MAPS_MAP_ID}
        defaultCenter={initial ?? DEFAULT_CENTER}
        defaultZoom={initial ? PICKED_ZOOM : DEFAULT_ZOOM}
        gestureHandling="greedy"
        disableDefaultUI
        zoomControl
        clickableIcons={false}
        onIdle={handleIdle}
        style={{ height: "100%", width: "100%" }}
      />

      <PlaceSearch
        getBias={getBias}
        onPick={handleSearchPick}
        placeholder="Search area, street, landmark…"
        style={{ position: "absolute", top: 10, left: 10, right: 10, zIndex: 2 }}
      />

      {/* Fixed center pin — the map moves, the pin doesn't. Tip of the pin marks the point. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -100%)",
          pointerEvents: "none",
          zIndex: 1,
          opacity: picked ? 1 : 0.55,
        }}
      >
        <svg width="36" height="48" viewBox="0 0 36 48">
          <path
            d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30s18-16.5 18-30C36 8.06 27.94 0 18 0z"
            fill="#10B981"
            stroke="#065F46"
            strokeWidth="1.5"
          />
          <circle cx="18" cy="18" r="6.5" fill="#fff" />
        </svg>
      </div>
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 8,
          height: 4,
          borderRadius: "50%",
          background: "rgba(15,23,42,0.35)",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {!picked && (
        <div style={{ position: "absolute", bottom: 12, left: 0, right: 0, textAlign: "center", zIndex: 2 }}>
          <Button
            size="small"
            icon={<AimOutlined />}
            onClick={() => {
              const c = getBias();
              if (c) pick(c);
            }}
          >
            Drop pin here
          </Button>
        </div>
      )}
    </div>
  );
}

function PickedSummary({
  picked,
  resolving,
  onClear,
}: {
  picked: PickedLocation | null;
  resolving: boolean;
  onClear: () => void;
}) {
  return (
    <div
      style={{
        marginTop: 8,
        fontSize: 12,
        color: "#475569",
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {picked ? (
          <>
            <div style={{ color: "#0F172A", wordBreak: "break-word" }}>
              {resolving ? <LoadingOutlined style={{ marginRight: 6 }} /> : null}
              {picked.address}
            </div>
            {picked.addressSource !== "coordinates" && (
              <div style={{ color: "#94A3B8" }}>{formatCoords(picked)}</div>
            )}
          </>
        ) : (
          <span style={{ color: "#94A3B8" }}>No pin set — search or drag the map to place it.</span>
        )}
      </div>
      {picked && (
        <Button size="small" type="text" icon={<CloseOutlined />} onClick={onClear}>
          Clear pin
        </Button>
      )}
    </div>
  );
}
