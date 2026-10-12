import { useEffect, useId, useState } from "react";
import { AdvancedMarker, Map, Pin, useMap } from "@vis.gl/react-google-maps";
import { MapGate } from "../../lib/googleMaps";
import { DEFAULT_CENTER, DEFAULT_ZOOM, GOOGLE_MAPS_MAP_ID } from "../../lib/googleMapsConfig";
import type { DeliveryZone } from "../../types/deliveryZone";
import type { Warehouse } from "../../types/warehouse";
import ZoneOverlay from "./ZoneOverlay";
import { isValidLatLng, warehouseColor, zoneBounds } from "./zoneShapes";

type Props = {
  zones: DeliveryZone[];
  warehouses: Warehouse[];
  /** Full warehouse id list — keeps each warehouse's color stable when filtering. */
  colorKeys: string[];
  onZoneClick: (zone: DeliveryZone) => void;
  /** Change to re-frame the map (e.g. when the warehouse filter changes). */
  fitKey: string;
  height?: number | string;
};

/** Every warehouse and zone on one map; zones colored per warehouse, dimmed when inactive. */
export default function ZonesOverviewMap({ height = 520, ...props }: Props) {
  return (
    <MapGate height={height}>
      <OverviewMap height={height} {...props} />
    </MapGate>
  );
}

function OverviewMap({ zones, warehouses, colorKeys, onZoneClick, fitKey, height }: Props) {
  const mapId = useId();
  const [hovered, setHovered] = useState<DeliveryZone | null>(null);
  const warehouseName = (id: string) => warehouses.find((w) => w.id === id)?.name ?? "Unknown warehouse";

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
        style={{ height: "100%", width: "100%" }}
      >
        {zones.map((z) => (
          <ZoneOverlay
            key={z.id}
            zone={z}
            color={warehouseColor(colorKeys, z.warehouseId)}
            dimmed={!z.isActive}
            onClick={() => onZoneClick(z)}
            onHover={(h) => setHovered((cur) => (h ? z : cur?.id === z.id ? null : cur))}
          />
        ))}
        {warehouses
          .filter((w) => isValidLatLng({ lat: w.latitude ?? NaN, lng: w.longitude ?? NaN }))
          .map((w) => {
            const color = warehouseColor(colorKeys, w.id);
            return (
              <AdvancedMarker
                key={w.id}
                position={{ lat: w.latitude as number, lng: w.longitude as number }}
                title={w.name}
                zIndex={20}
              >
                <Pin background={color} borderColor="#0F172A" glyphColor="#fff" />
              </AdvancedMarker>
            );
          })}
        <FitToContent mapId={mapId} zones={zones} warehouses={warehouses} fitKey={fitKey} />
      </Map>

      {hovered && (
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            background: "#fff",
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 12,
            boxShadow: "0 2px 8px rgba(15,23,42,0.18)",
            pointerEvents: "none",
          }}
        >
          <div style={{ fontWeight: 600, color: "#0F172A" }}>{hovered.name}</div>
          <div style={{ color: "#64748B" }}>
            {warehouseName(hovered.warehouseId)} · {hovered.shapeType} · {hovered.isActive ? "Active" : "Inactive"}
          </div>
          <div style={{ color: "#94A3B8" }}>Click to edit</div>
        </div>
      )}
    </div>
  );
}

function FitToContent({
  mapId,
  zones,
  warehouses,
  fitKey,
}: {
  mapId: string;
  zones: DeliveryZone[];
  warehouses: Warehouse[];
  fitKey: string;
}) {
  const map = useMap(mapId);
  const hasContent = zones.length > 0 || warehouses.length > 0;

  useEffect(() => {
    if (!map || !hasContent) return;
    const bounds = new google.maps.LatLngBounds();
    zones.forEach((z) => {
      const b = zoneBounds(z);
      if (b) bounds.union(b);
    });
    warehouses.forEach((w) => {
      const p = { lat: w.latitude ?? NaN, lng: w.longitude ?? NaN };
      if (isValidLatLng(p)) bounds.extend(p);
    });
    if (bounds.isEmpty()) return;
    map.fitBounds(bounds, 48);
    // Don't zoom absurdly far into a single warehouse pin.
    google.maps.event.addListenerOnce(map, "idle", () => {
      if ((map.getZoom() ?? 0) > 16) map.setZoom(16);
    });
    // Re-frame only when the filter changes or data first arrives, not on every toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, fitKey, hasContent]);

  return null;
}
