import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";
import { AutoComplete, Input, Spin } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type {
  DeliveryZone,
  DeliveryZoneShapeType,
  PolygonShape,
  RadiusShape,
} from "../types/deliveryZone";

export type DeliveryZoneDraft = {
  shapeType: DeliveryZoneShapeType;
  shape: PolygonShape | RadiusShape;
};

export type DeliveryZoneMapHandle = {
  getCurrentDraft: () => DeliveryZoneDraft | null;
};

export type DeliveryZoneMapMode = "view" | "draw" | "edit";

type Props = {
  zones: DeliveryZone[];
  editingZoneId: string | null;
  mode: DeliveryZoneMapMode;
  centerHint: { lat: number; lng: number } | null;
  focusKey: string;
  /** Fires on discrete shape events (drawn / loaded for edit / cleared) — not on
   * every drag frame — so the page can enable Save only once a shape exists. */
  onDraftChange?: (hasDraft: boolean) => void;
};

const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629]; // India centroid — fallback only
const DEFAULT_ZOOM = 5;

function shapeToLayer(
  shapeType: DeliveryZoneShapeType,
  shape: PolygonShape | RadiusShape,
  options: L.PathOptions
): L.Polygon | L.Circle {
  if (shapeType === "RADIUS") {
    const s = shape as RadiusShape;
    return L.circle([s.center.lat, s.center.lng], { radius: s.radiusMeters, ...options });
  }
  const s = shape as PolygonShape;
  return L.polygon(
    s.vertices.map((v) => [v.lat, v.lng] as [number, number]),
    options
  );
}

function layerToDraft(layer: L.Layer): DeliveryZoneDraft | null {
  if (layer instanceof L.Circle) {
    const c = layer.getLatLng();
    return {
      shapeType: "RADIUS",
      shape: { center: { lat: c.lat, lng: c.lng }, radiusMeters: layer.getRadius() },
    };
  }
  if (layer instanceof L.Polygon) {
    const rings = layer.getLatLngs();
    const ring = (Array.isArray(rings[0]) ? rings[0] : rings) as L.LatLng[];
    const vertices = ring.map((p) => ({ lat: p.lat, lng: p.lng }));
    if (
      vertices.length > 0 &&
      (vertices[0].lat !== vertices[vertices.length - 1].lat ||
        vertices[0].lng !== vertices[vertices.length - 1].lng)
    ) {
      vertices.push({ ...vertices[0] });
    }
    return { shapeType: "POLYGON", shape: { vertices } };
  }
  return null;
}

// Enables leaflet-draw's built-in vertex/radius-handle dragging on a layer,
// bypassing leaflet-draw's own Edit-toolbar+Save flow (which would give the
// page two competing "Save" actions — the toolbar's local one and our API one).
function enableEditing(layer: L.Polygon | L.Circle) {
  const editable = layer as unknown as { editing?: { enable: () => void } };
  editable.editing?.enable();
}

// ─── Search box (place lookup via OpenStreetMap Nominatim — free, no API key) ──
function MapSearchBox() {
  const map = useMap();
  const [options, setOptions] = useState<
    { value: string; label: string; lat: number; lng: number }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSearch = (text: string) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!text || text.trim().length < 3) {
      setOptions([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      setSearching(true);
      try {
        // Nominatim's usage policy asks for a custom User-Agent, which browser
        // fetch can't set — fine for this admin tool's low query volume, but
        // don't reuse this pattern for anything high-traffic.
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(text)}`
        );
        const results = (await res.json()) as Array<{
          display_name: string;
          lat: string;
          lon: string;
        }>;
        setOptions(
          results.map((r, i) => ({
            value: `${i}-${r.display_name}`,
            label: r.display_name,
            lat: parseFloat(r.lat),
            lng: parseFloat(r.lon),
          }))
        );
      } catch {
        setOptions([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const handleSelect = (value: string) => {
    const found = options.find((o) => o.value === value);
    if (found) map.flyTo([found.lat, found.lng], 14);
  };

  return (
    <div style={{ position: "absolute", top: 10, left: 50, zIndex: 1000, width: 320 }}>
      <AutoComplete
        options={options}
        onSearch={handleSearch}
        onSelect={handleSelect}
        style={{ width: "100%" }}
      >
        <Input
          placeholder="Search a place to pan/zoom…"
          prefix={searching ? <Spin size="small" /> : <SearchOutlined style={{ color: "#94A3B8" }} />}
          allowClear
        />
      </AutoComplete>
    </div>
  );
}

// ─── Imperative Leaflet wiring (draw tools, existing-zone overlays, editing) ──
function MapController({
  zones,
  editingZoneId,
  mode,
  centerHint,
  focusKey,
  onDraftChange,
  controllerRef,
}: Props & { controllerRef: React.MutableRefObject<DeliveryZoneMapHandle | null> }) {
  const map = useMap();
  const editableGroupRef = useRef(new L.FeatureGroup());
  const readOnlyGroupRef = useRef(new L.FeatureGroup());
  const drawControlRef = useRef<L.Control.Draw | null>(null);

  // Mount editable/read-only groups once
  useEffect(() => {
    const editableGroup = editableGroupRef.current;
    const readOnlyGroup = readOnlyGroupRef.current;
    editableGroup.addTo(map);
    readOnlyGroup.addTo(map);
    return () => {
      map.removeLayer(editableGroup);
      map.removeLayer(readOnlyGroup);
    };
  }, [map]);

  // Render existing zones as translucent, non-editable overlays
  useEffect(() => {
    const group = readOnlyGroupRef.current;
    group.clearLayers();
    zones
      .filter((z) => z.id !== editingZoneId)
      .forEach((z) => {
        const layer = shapeToLayer(z.shapeType, z.shape, {
          color: "#0F172A",
          weight: 1,
          fillOpacity: 0.12,
        });
        layer.bindTooltip(z.name, { sticky: true });
        group.addLayer(layer);
      });
  }, [zones, editingZoneId]);

  // Draw toolbar — only for creating a brand-new zone
  useEffect(() => {
    if (mode !== "draw") {
      if (drawControlRef.current) {
        map.removeControl(drawControlRef.current);
        drawControlRef.current = null;
      }
      return;
    }
    editableGroupRef.current.clearLayers();
    onDraftChange?.(false);
    const control = new L.Control.Draw({
      position: "topright",
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: false,
          shapeOptions: { color: "#10B981" },
        },
        circle: { shapeOptions: { color: "#10B981" } },
        marker: false,
        circlemarker: false,
        rectangle: false,
        polyline: false,
      },
    });
    map.addControl(control);
    drawControlRef.current = control;
    return () => {
      map.removeControl(control);
      drawControlRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, map]);

  // New shape finished drawing — keep only the latest draft, make it draggable immediately
  useEffect(() => {
    const handleCreated = (e: L.LeafletEvent) => {
      const { layer } = e as unknown as { layer: L.Polygon | L.Circle };
      editableGroupRef.current.clearLayers();
      editableGroupRef.current.addLayer(layer);
      enableEditing(layer);
      onDraftChange?.(true);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map.on((L as any).Draw.Event.CREATED, handleCreated);
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.off((L as any).Draw.Event.CREATED, handleCreated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // Load an existing zone's shape onto the map for editing
  useEffect(() => {
    if (mode !== "edit" || !editingZoneId) return;
    const zone = zones.find((z) => z.id === editingZoneId);
    if (!zone) return;
    editableGroupRef.current.clearLayers();
    const layer = shapeToLayer(zone.shapeType, zone.shape, {
      color: "#10B981",
      weight: 2,
      fillOpacity: 0.25,
    });
    editableGroupRef.current.addLayer(layer);
    enableEditing(layer);
    onDraftChange?.(true);
    const bounds =
      layer instanceof L.Circle
        ? L.latLngBounds([layer.getLatLng()]).pad(0.5)
        : layer.getBounds();
    map.fitBounds(bounds, { maxZoom: 16, padding: [40, 40] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, editingZoneId]);

  // Fit the view to existing zones (or the geocoded warehouse center) on warehouse switch
  useEffect(() => {
    if (mode !== "view") return;
    const readOnlyLayers = readOnlyGroupRef.current.getLayers();
    if (readOnlyLayers.length > 0) {
      map.fitBounds(readOnlyGroupRef.current.getBounds(), { maxZoom: 15, padding: [40, 40] });
    } else if (centerHint) {
      map.setView([centerHint.lat, centerHint.lng], 13);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey, centerHint, zones.length, mode]);

  // Clear the draft when leaving draw/edit mode (save or cancel)
  useEffect(() => {
    if (mode === "view") {
      editableGroupRef.current.clearLayers();
      onDraftChange?.(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useImperativeHandle(
    controllerRef,
    () => ({
      getCurrentDraft: () => {
        const layers = editableGroupRef.current.getLayers();
        if (layers.length === 0) return null;
        return layerToDraft(layers[0]);
      },
    }),
    []
  );

  return null;
}

const DeliveryZoneMap = forwardRef<DeliveryZoneMapHandle, Props>((props, ref) => {
  const controllerRef = useRef<DeliveryZoneMapHandle | null>(null);

  useImperativeHandle(ref, () => ({
    getCurrentDraft: () => controllerRef.current?.getCurrentDraft() ?? null,
  }));

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: "100%", width: "100%", borderRadius: 8 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapSearchBox />
        <MapController {...props} controllerRef={controllerRef} />
      </MapContainer>
    </div>
  );
});

DeliveryZoneMap.displayName = "DeliveryZoneMap";

export default DeliveryZoneMap;
