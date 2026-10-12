import { useEffect, useId, useRef, useState, type RefObject } from "react";
import {
  AdvancedMarker,
  ControlPosition,
  Map,
  MapControl,
  Pin,
  useMap,
} from "@vis.gl/react-google-maps";
import { Button, Segmented, Tooltip } from "antd";
import { DeleteOutlined, CheckOutlined, UndoOutlined, RedoOutlined } from "@ant-design/icons";
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
  /** Warehouse the zone belongs to â€” shown as a marker and used to center a new zone. */
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

const MAX_HISTORY = 100;
// Circle drags fire radius/center changes continuously; fold them into one undo step.
const CIRCLE_COMMIT_DELAY_MS = 300;

const sameDraft = (a: ZoneDraft | null, b: ZoneDraft | null) => JSON.stringify(a) === JSON.stringify(b);

const isTypingTarget = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

type HistoryControls = { undo: () => void; redo: () => void };

/**
 * Draw/edit one delivery zone. Polygon: click to add vertices, drag to move
 * them, drag a midpoint to insert one, right-click a vertex to remove it.
 * Circle: click to place, then drag the center or the edge handle.
 * Every change (including Clear) goes into an undo/redo history â€”
 * Ctrl+Z / Ctrl+Shift+Z (or Ctrl+Y) work too.
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
  const [history, setHistory] = useState({ canUndo: false, canRedo: false });
  const historyControls = useRef<HistoryControls | null>(null);
  const drawing = mode !== "edit";

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || isTypingTarget(e.target)) return;
      const key = e.key.toLowerCase();
      const redo = key === "y" || (key === "z" && e.shiftKey);
      if (key !== "z" && !redo) return;
      e.preventDefault();
      if (redo) historyControls.current?.redo();
      else historyControls.current?.undo();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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
          controlsRef={historyControls}
          onModeChange={setMode}
          onVertexCount={setVertexCount}
          onHistory={(canUndo, canRedo) => setHistory({ canUndo, canRedo })}
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
            <Tooltip title="Undo (Ctrl+Z)">
              <Button
                size="small"
                icon={<UndoOutlined />}
                aria-label="Undo"
                disabled={!history.canUndo}
                onClick={() => historyControls.current?.undo()}
              />
            </Tooltip>
            <Tooltip title="Redo (Ctrl+Shift+Z)">
              <Button
                size="small"
                icon={<RedoOutlined />}
                aria-label="Redo"
                disabled={!history.canRedo}
                onClick={() => historyControls.current?.redo()}
              />
            </Tooltip>
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
 * Owns the single editable google.maps.Polygon / Circle imperatively â€” the
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
  controlsRef,
  onModeChange,
  onVertexCount,
  onDraft,
  onHistory,
}: {
  mapId: string;
  initial: ZoneDraft | null;
  mode: Mode;
  clearSignal: number;
  warehousePoint: google.maps.LatLngLiteral | null;
  otherZones: DeliveryZone[];
  controlsRef: RefObject<HistoryControls | null>;
  onModeChange: (m: Mode) => void;
  onVertexCount: (n: number) => void;
  onDraft: (d: ZoneDraft | null) => void;
  onHistory: (canUndo: boolean, canRedo: boolean) => void;
}) {
  const map = useMap(mapId);
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  // Latest callbacks without re-running the effects that wire up Maps listeners.
  const cbRef = useRef({ onModeChange, onVertexCount, onDraft, onHistory });
  cbRef.current = { onModeChange, onVertexCount, onDraft, onHistory };
  const fittedRef = useRef(false);

  // Undo/redo: snapshots of the draft, with `index` pointing at the current one.
  const historyRef = useRef<{ stack: (ZoneDraft | null)[]; index: number }>({ stack: [null], index: 0 });
  const currentRef = useRef<ZoneDraft | null>(null);
  const pendingCommitRef = useRef<number | null>(null);
  // Set while rebuilding a shape from history so that rebuild isn't recorded as a new step.
  const silentRef = useRef(false);

  const reportHistory = () => {
    const h = historyRef.current;
    cbRef.current.onHistory(h.index > 0, h.index < h.stack.length - 1);
  };

  const commit = () => {
    if (pendingCommitRef.current != null) {
      clearTimeout(pendingCommitRef.current);
      pendingCommitRef.current = null;
    }
    const h = historyRef.current;
    if (sameDraft(h.stack[h.index], currentRef.current)) return;
    h.stack = [...h.stack.slice(0, h.index + 1), currentRef.current].slice(-MAX_HISTORY);
    h.index = h.stack.length - 1;
    reportHistory();
  };

  const emit = (d: ZoneDraft | null, coalesce = false) => {
    currentRef.current = d;
    cbRef.current.onDraft(d);
    if (silentRef.current) return;
    if (!coalesce) return commit();
    if (pendingCommitRef.current != null) clearTimeout(pendingCommitRef.current);
    pendingCommitRef.current = window.setTimeout(commit, CIRCLE_COMMIT_DELAY_MS);
  };

  const restore = (m: google.maps.Map, d: ZoneDraft | null) => {
    silentRef.current = true;
    try {
      if (d?.shapeType === "RADIUS") {
        const s = d.shape as RadiusShape;
        createCircle(m, s.center, s.radiusMeters);
      } else if (d?.shapeType === "POLYGON") {
        createPolygon(m, ringToPath(d.shape as PolygonShape));
      } else {
        removeShape();
        cbRef.current.onVertexCount(0);
        emit(null);
      }
    } finally {
      silentRef.current = false;
    }
    // Keep the current tool unless it no longer fits the restored shape.
    if (d?.shapeType === "RADIUS") cbRef.current.onModeChange("edit");
    else if (d?.shapeType === "POLYGON") {
      const n = ringToPath(d.shape as PolygonShape).length;
      if (n < 3) cbRef.current.onModeChange("drawPolygon");
      else if (modeRef.current === "drawCircle") cbRef.current.onModeChange("edit");
    }
  };

  const step = (delta: 1 | -1) => {
    if (!map) return;
    commit(); // flush a pending circle drag first
    const h = historyRef.current;
    const i = h.index + delta;
    if (i < 0 || i >= h.stack.length) return;
    h.index = i;
    restore(map, h.stack[i]);
    reportHistory();
  };

  controlsRef.current = { undo: () => step(-1), redo: () => step(1) };

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
    emit(n > 0 ? polygonToDraft(polygon) : null);
  };

  const emitCircle = () => {
    const circle = circleRef.current;
    if (circle) emit(circleToDraft(circle), true);
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
    silentRef.current = true;
    if (initial?.shapeType === "RADIUS") {
      const s = initial.shape as RadiusShape;
      if (isValidLatLng(s.center)) createCircle(map, s.center, s.radiusMeters);
    } else if (initial?.shapeType === "POLYGON") {
      createPolygon(map, ringToPath(initial.shape as PolygonShape));
    }
    silentRef.current = false;
    historyRef.current = { stack: [currentRef.current], index: 0 };
    reportHistory();

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
    return () => {
      if (pendingCommitRef.current != null) clearTimeout(pendingCommitRef.current);
      removeShape();
    };
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
    emit(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
