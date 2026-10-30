import { useEffect, useId, useMemo, useState } from "react";
import { AdvancedMarker, Circle, Map, Pin, useMap } from "@vis.gl/react-google-maps";
import { MapGate } from "../../lib/googleMaps";
import { DEFAULT_CENTER, DEFAULT_ZOOM, GOOGLE_MAPS_MAP_ID } from "../../lib/googleMapsConfig";
import type { DeliveryZone } from "../../types/deliveryZone";
import type { Warehouse } from "../../types/warehouse";
import { feeForDistance, formatDistance, formatFee, haversineMeters, tierColor, type FeeTier } from "../../types/deliveryFee";
import ZoneOverlay from "./ZoneOverlay";
import { isValidLatLng } from "./zoneShapes";

type Props = {
  warehouses: Warehouse[];
  zones: DeliveryZone[];
  tiers: FeeTier[];
  beyondFee: number;
  height?: number;
};

type Located = Warehouse & { latitude: number; longitude: number; position: google.maps.LatLngLiteral };

/**
 * Each store with its fee tiers drawn as rings (straight-line distance, the
 * same measure the backend charges by), delivery zones faintly behind.
 * Click anywhere to see that spot's distance and fee from the nearest store.
 */
export default function FeeRingsMap({ height = 460, ...props }: Props) {
  return (
    <MapGate height={height}>
      <RingsMap height={height} {...props} />
    </MapGate>
  );
}

function RingsMap({ warehouses, zones, tiers, beyondFee, height }: Props) {
  const mapId = useId();
  const [probe, setProbe] = useState<{ lat: number; lng: number } | null>(null);
  // Stable position objects: editing a tier re-renders this, and handing the
  // markers/circles a fresh object each time makes the Maps API re-apply it.
  const located = useMemo(
    () =>
      warehouses
        .filter((w) => isValidLatLng({ lat: w.latitude ?? NaN, lng: w.longitude ?? NaN }))
        .map((w) => ({ ...w, position: { lat: w.latitude as number, lng: w.longitude as number } }) as Located),
    [warehouses],
  );

  const nearest = probe
    ? located
        .map((w) => ({ w, meters: haversineMeters(probe, { lat: w.latitude, lng: w.longitude }) }))
        .sort((a, b) => a.meters - b.meters)[0]
    : null;

  return (
    <div style={{ position: "relative", height, width: "100%", borderRadius: 8, overflow: "hidden" }}>
      <Map
        id={mapId}
        mapId={GOOGLE_MAPS_MAP_ID}
        defaultCenter={DEFAULT_CENTER}
        defaultZoom={DEFAULT_ZOOM}
        gestureHandling="greedy"
        clickableIcons={false}
        mapTypeControl={false}
        streetViewControl={false}
        onClick={(e) => {
          const ll = e.detail.latLng;
          if (ll) setProbe({ lat: ll.lat, lng: ll.lng });
        }}
        style={{ height: "100%", width: "100%" }}
      >
        {zones.map((z) => (
          <ZoneOverlay key={z.id} zone={z} color="#64748B" faint />
        ))}
        {located.map((w) =>
          // Largest first so smaller (cheaper) rings sit on top and stay clickable-through.
          [...tiers]
            .map((t, i) => ({ t, i }))
            .reverse()
            .map(({ t, i }) => (
              <Circle
                key={`${w.id}-${i}`}
                center={w.position}
                radius={t.upToMeters}
                strokeColor={tierColor(i)}
                strokeOpacity={0.9}
                strokeWeight={2}
                fillColor={tierColor(i)}
                fillOpacity={0.07}
                clickable={false}
                zIndex={10 + tiers.length - i}
              />
            )),
        )}
        {located.map((w) => (
          <AdvancedMarker key={w.id} position={w.position} title={w.name} zIndex={30}>
            <Pin background="#0F172A" borderColor="#0F172A" glyphColor="#fff" />
          </AdvancedMarker>
        ))}
        {probe && (
          <AdvancedMarker position={probe} zIndex={40}>
            <Pin background="#2563EB" borderColor="#1E3A8A" glyphColor="#fff" scale={0.8} />
          </AdvancedMarker>
        )}
        <FitRings mapId={mapId} located={located} radius={tiers[tiers.length - 1]?.upToMeters ?? 1000} />
      </Map>

      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          background: "#fff",
          borderRadius: 8,
          padding: "8px 12px",
          fontSize: 12,
          boxShadow: "0 2px 8px rgba(15,23,42,0.18)",
          maxWidth: 280,
        }}
      >
        {nearest ? (
          <>
            <div style={{ fontWeight: 700, color: "#0F172A", fontSize: 14 }}>
              {formatFee(feeForDistance(nearest.meters, { tiers, beyondFee }))} delivery
            </div>
            <div style={{ color: "#64748B" }}>
              {formatDistance(nearest.meters)} from {nearest.w.name} (straight line)
            </div>
          </>
        ) : located.length === 0 ? (
          <div style={{ color: "#B91C1C" }}>No warehouse has a map pin yet, so fees can't be measured. Set one on the Warehouses page.</div>
        ) : (
          <div style={{ color: "#64748B" }}>Click the map to check the fee for any spot</div>
        )}
      </div>
    </div>
  );
}

/** Frames every store's outermost ring once the stores are known. */
function FitRings({ mapId, located, radius }: { mapId: string; located: Located[]; radius: number }) {
  const map = useMap(mapId);
  const key = located.map((w) => w.id).join(",");
  useEffect(() => {
    if (!map || located.length === 0 || !window.google?.maps) return;
    const bounds = new google.maps.LatLngBounds();
    const dLat = radius / 111_320;
    for (const w of located) {
      const dLng = radius / (111_320 * Math.cos((w.latitude * Math.PI) / 180));
      bounds.extend({ lat: w.latitude + dLat, lng: w.longitude + dLng });
      bounds.extend({ lat: w.latitude - dLat, lng: w.longitude - dLng });
    }
    map.fitBounds(bounds, 24);
    // Only when the set of stores changes, not on every tier edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}
