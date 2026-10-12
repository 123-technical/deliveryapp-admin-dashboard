import { useEffect, useId, useRef, useState } from "react";
import {
  AdvancedMarker,
  ControlPosition,
  Map,
  MapControl,
  Pin,
  useMap,
} from "@vis.gl/react-google-maps";
import { Button, Segmented, Tooltip } from "antd";
import { DeleteOutlined, CheckOutlined } from "@ant-design/icons";
import { MapGate } from "../../lib/googleMaps";
import { DEFAULT_CENTER, DEFAULT_ZOOM, GOOGLE_MAPS_MAP_ID } from "../../lib/googleMapsConfig";
import type { DeliveryZone, PolygonShape, RadiusShape } from "../../types/deliveryZone";
import ZoneOverlay from "./ZoneOverlay";
import {
  circleToDraft,
  isValidLatLng,
  polygonToDraft,
  ringToPath,
  zoneBounds,
  type ZoneDraft,
} from "./zoneShapes";

type Mode = "drawPolygon" | "drawCircle" | "edit";

export type ZoneEditorWarehouse = { name: string; lat: number | null; lng: number | null };

type Props = {
  /** Shape to start from. Remount (change `key`) to load a different zone. */
  initial: ZoneDraft | null;
  onChange: (draft: ZoneDraft | null) => void;
  /** Warehouse the zone belongs to — shown as a marker and used to center a new zone. */
  warehouse?: ZoneEditorWarehouse | null;
  /** Other active zones, drawn faintly so overlaps are visible. */
  otherZones?: DeliveryZone[];
  height?: number | string;
};

const EDIT_COLOR = "#10B981";
const SHAPE_STYLE = {
  strokeColor: EDIT_COLOR,
  strokeWeight: 2,
  fillColor: EDIT_COLOR,
  fillOpacity: 0.25,
  editable: true,
  zIndex: 10,
};

/**
 * Draw/edit one delivery zone. Polygon: click to add vertices, drag to move
 * them, drag a midpoint to insert one, right-click a vertex to remove it.
 * Circle: click to place, then drag the center or the edge handle.
 * (Custom click-to-add instead of the deprecated Drawing Library.)
 */
export default function ZoneEditor({ height = 520, ...props }: Props) {
  return (
    <MapGate height={height}>
      <EditorMap height={height} {...props} />
    </MapGate>
  );
}

function EditorMap({ initial, onChange, warehouse, otherZones = [], height }: Props) {
  const mapId = useId();
  const [mode, setMode] = useState<Mode>(initial ? "edit" : "drawPolygon");
  const [hasShape, setHasShape] = useState(!!initial);
  const [vertexCount, setVertexCount] = useState(
    initial?.shapeType === "POLYGON" ? ringToPath(initial.shape as PolygonShape).length : 0
  );
  const [clearSignal, setClearSignal] = useState(0);
  const drawing = mode !== "edit";

  const warehousePoint =
    warehouse && isValidLatLng({ lat: warehouse.lat ?? NaN, lng: warehouse.lng ?? NaN })
      ? { lat: warehouse.lat as number, lng: warehouse.lng as number }
      : null;

  const startTool = (tool: "POLYGON" | "RADIUS") => {
    setClearSignal((n) => n + 1);
    setMode(tool === "POLYGON" ? "drawPolygon" : "drawCircle");
  };

  const hint =
    mode === "drawPolygon"
      ? vertexCount === 0
        ? "Click on the map to add the first corner of the zone."
        : vertexCount < 3
        ? `Keep clicking to add corners (${vertexCount}/3 minimum).`
        : "Click to add more corners, or click the first corner / Done to finish."
      : mode === "drawCircle"
      ? "Click on the map to place the circle's center."
      : hasShape
      ? "Drag vertices or handles to adjust. Right-click a vertex to remove it."
      : "Pick Polygon or Circle to draw the zone.";

  return (
    <div style={{ position: "relative", height, width: "100%", borderRadius: 8, overflow: "hidden" }}>
      <Map
        id={mapId}
        mapId={GOOGLE_MAPS_MAP_ID}
        defaultCenter={warehousePoint ?? DEFAULT_CENTER}
        defaultZoom={DEFAULT_ZOOM}
        gestureHandling="greedy"
        clickableIcons={false}
        disableDoubleClickZoom={drawing}
        draggableCursor={drawing ? "crosshair" : undefined}
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={false}
        style={{ height: "100%", width: "100%" }}
      >
        {otherZones.map((z) => (
          <ZoneOverlay key={z.id} zone={z} color="#0F172A" faint />
        ))}

        {warehousePoint && (
          <AdvancedMarker position={warehousePoint} title={warehouse?.name} zIndex={20}>
            <Pin background="#0F172A" borderColor="#0F172A" glyphColor="#fff" />
          </AdvancedMarker>
        )}

        <EditableShape
          mapId={mapId}
          initial={initial}
          mode={mode}
          clearSignal={clearSignal}
          warehousePoint={warehousePoint}
          otherZones={otherZones}
          onModeChange={setMode}
          onVertexCount={setVertexCount}
          onDraft={(d) => {
            setHasShape(!!d);
            onChange(d);
          }}
        />

        <MapControl position={ControlPosition.TOP_LEFT}>
          <div
            style={{
              margin: 10,
              display: "flex",
              gap: 8,
              alignItems: "center",
              background: "#fff",
              padding: 6,
              borderRadius: 8,
              boxShadow: "0 2px 8px rgba(15,23,42,0.18)",
            }}
          >
            <Segmented
              size="small"
              value={mode === "drawCircle" ? "RADIUS" : mode === "drawPolygon" ? "POLYGON" : undefined}
              options={[
                { label: "Polygon", value: "POLYGON" },
                { label: "Circle", value: "RADIUS" },
              ]}
              onChange={(v) => startTool(v as "POLYGON" | "RADIUS")}
            />
            {mode === "drawPolygon" && vertexCount >= 3 && (
              <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => setMode("edit")}>
                Done
              </Button>
            )}
            {(hasShape || vertexCount > 0) && (
              <Tooltip title="Remove the shape and start over">
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    setClearSignal((n) => n + 1);
                    setMode("edit");
                  }}
                >
                  Clear
                </Button>
              </Tooltip>
            )}
          </div>
        </MapControl>
      </Map>

      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(15,23,42,0.88)",
          color: "#fff",
          padding: "6px 14px",
          borderRadius: 16,
          fontSize: 12,
          pointerEvents: "none",
          maxWidth: "90%",
          textAlign: "center",
        }}
      >
        {hint}
      </div>
    </div>
  );
}

/**
 * Owns the single editable google.maps.Polygon / Circle imperatively — the
 * Maps API mutates these in place while the admin drags, so React state only
 * receives the converted JSON draft.
 */
function EditableShape({
  mapId,
  initial,
  mode,
  clearSignal,
  warehousePoint,
  otherZones,
  onModeChange,
  onVertexCount,
  onDraft,
}: {
  mapId: string;
  initial: ZoneDraft | null;
  mode: Mode;
  clearSignal: number;
  warehousePoint: google.maps.LatLngLiteral | null;
  otherZones: DeliveryZone[];
  onModeChange: (m: Mode) => void;
  onVertexCount: (n: number) => void;
  onDraft: (d: ZoneDraft | null) => void;
}) {
  const map = useMap(mapId);
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  // Latest callbacks without re-running the effects that wire up Maps listeners.
  const cbRef = useRef({ onModeChange, onVertexCount, onDraft });
  cbRef.current = { onModeChange, onVertexCount, onDraft };
  const fittedRef = useRef(false);

  const removeShape = () => {
    listenersRef.current.forEach((l) => l.remove());
    listenersRef.current = [];
    polygonRef.current?.setMap(null);
    circleRef.current?.setMap(null);
    polygonRef.current = null;
    circleRef.current = null;
  };

  const emitPolygon = () => {
    const polygon = polygonRef.current;
    if (!polygon) return;
    const n = polygon.getPath().getLength();
    cbRef.current.onVertexCount(n);
    cbRef.current.onDraft(n > 0 ? polygonToDraft(polygon) : null);
  };

  const emitCircle = () => {
    const circle = circleRef.current;
    if (circle) cbRef.current.onDraft(circleToDraft(circle));
  };

  const createPolygon = (m: google.maps.Map, path: google.maps.LatLngLiteral[]) => {
    removeShape();
    const polygon = new google.maps.Polygon({ ...SHAPE_STYLE, paths: path, map: m });
    polygonRef.current = polygon;
    const p = polygon.getPath();
    listenersRef.current.push(
      p.addListener("insert_at", emitPolygon),
      p.addListener("set_at", emitPolygon),
      p.addListener("remove_at", emitPolygon),
      // Clicks on the polygon itself don't reach the map, so handle drawing here too.
      polygon.addListener("click", (e: google.maps.PolyMouseEvent) => {
        if (modeRef.current !== "drawPolygon" || !e.latLng) return;
        if (e.vertex === 0 && p.getLength() >= 3) {
          cbRef.current.onModeChange("edit");
          return;
        }
        if (e.vertex == null && e.edge == null) p.push(e.latLng);
      }),
      polygon.addListener("contextmenu", (e: google.maps.PolyMouseEvent) => {
        if (e.vertex == null) return;
        const min = modeRef.current === "drawPolygon" ? 1 : 4;
        if (p.getLength() >= min) p.removeAt(e.vertex);
      })
    );
    emitPolygon();
  };

  const createCircle = (m: google.maps.Map, center: google.maps.LatLngLiteral, radius: number) => {
    removeShape();
    const circle = new google.maps.Circle({ ...SHAPE_STYLE, draggable: true, center, radius, map: m });
    circleRef.current = circle;
    listenersRef.current.push(
      circle.addListener("radius_changed", emitCircle),
      circle.addListener("center_changed", emitCircle)
    );
    cbRef.current.onVertexCount(0);
    emitCircle();
  };

  // Load the initial shape (or nothing) once the map exists, and frame the view.
  useEffect(() => {
    if (!map) return;
    if (initial?.shapeType === "RADIUS") {
      const s = initial.shape as RadiusShape;
      if (isValidLatLng(s.center)) createCircle(map, s.center, s.radiusMeters);
    } else if (initial?.shapeType === "POLYGON") {
      createPolygon(map, ringToPath(initial.shape as PolygonShape));
    }

    if (!fittedRef.current) {
      fittedRef.current = true;
      const own = initial ? zoneBounds(initial) : null;
      if (own) {
        map.fitBounds(own, 48);
      } else if (!warehousePoint && otherZones.length > 0) {
        const all = new google.maps.LatLngBounds();
        otherZones.forEach((z) => {
          const b = zoneBounds(z);
          if (b) all.union(b);
        });
        if (!all.isEmpty()) map.fitBounds(all, 48);
      }
    }
    return removeShape;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // Re-center a not-yet-drawn zone when its warehouse changes.
  useEffect(() => {
    if (map && warehousePoint && !polygonRef.current && !circleRef.current) map.panTo(warehousePoint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, warehousePoint?.lat, warehousePoint?.lng]);

  // "Clear" / switching tools wipes the current shape.
  useEffect(() => {
    if (clearSignal === 0) return;
    removeShape();
    cbRef.current.onVertexCount(0);
    cbRef.current.onDraft(null);
  }, [clearSignal]);

  // Map clicks add polygon vertices / place the circle.
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const point = e.latLng.toJSON();
      if (modeRef.current === "drawPolygon") {
        if (!polygonRef.current) createPolygon(map, [point]);
        else polygonRef.current.getPath().push(e.latLng);
      } else if (modeRef.current === "drawCircle") {
        // Start at ~1/6 of the visible width so the handle is easy to grab.
        const metersPerPx =
          (156543.03392 * Math.cos((point.lat * Math.PI) / 180)) / Math.pow(2, map.getZoom() ?? DEFAULT_ZOOM);
        const span = metersPerPx * (map.getDiv().clientWidth || 600);
        createCircle(map, point, Math.max(100, Math.round(span / 6)));
        cbRef.current.onModeChange("edit");
      }
    });
    return () => listener.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return null;
}
