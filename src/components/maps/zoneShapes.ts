import type {
  DeliveryZone,
  DeliveryZoneShapeType,
  LatLng,
  PolygonShape,
  RadiusShape,
} from "../../types/deliveryZone";

export type ZoneDraft = {
  shapeType: DeliveryZoneShapeType;
  shape: PolygonShape | RadiusShape;
};

const sameLatLng = (a: LatLng, b: LatLng) => a.lat === b.lat && a.lng === b.lng;

export const isValidLatLng = (p: LatLng | null | undefined): p is LatLng =>
  !!p &&
  Number.isFinite(p.lat) &&
  Number.isFinite(p.lng) &&
  p.lat >= -90 &&
  p.lat <= 90 &&
  p.lng >= -180 &&
  p.lng <= 180;

/** Stored ring (first == last) → open path for google.maps.Polygon. */
export function ringToPath(shape: PolygonShape): LatLng[] {
  const v = shape?.vertices ?? [];
  if (v.length > 1 && sameLatLng(v[0], v[v.length - 1])) return v.slice(0, -1);
  return v.slice();
}

/** Open path from google.maps.Polygon → closed ring as the backend expects. */
export function pathToRing(path: LatLng[]): PolygonShape {
  const vertices = path.map((p) => ({ lat: p.lat, lng: p.lng }));
  if (vertices.length > 0 && !sameLatLng(vertices[0], vertices[vertices.length - 1])) {
    vertices.push({ ...vertices[0] });
  }
  return { vertices };
}

export function polygonToDraft(polygon: google.maps.Polygon): ZoneDraft {
  const path = polygon
    .getPath()
    .getArray()
    .map((p) => ({ lat: p.lat(), lng: p.lng() }));
  return { shapeType: "POLYGON", shape: pathToRing(path) };
}

export function circleToDraft(circle: google.maps.Circle): ZoneDraft | null {
  const c = circle.getCenter();
  if (!c) return null;
  return {
    shapeType: "RADIUS",
    shape: { center: { lat: c.lat(), lng: c.lng() }, radiusMeters: Math.round(circle.getRadius()) },
  };
}

/** Returns a human-readable problem, or null when the draft can be saved. */
export function validateZoneDraft(draft: ZoneDraft | null): string | null {
  if (!draft) return "Draw the zone on the map first.";
  if (draft.shapeType === "RADIUS") {
    const s = draft.shape as RadiusShape;
    if (!isValidLatLng(s.center)) return "The circle's center is not a valid coordinate.";
    if (!(Number.isFinite(s.radiusMeters) && s.radiusMeters > 0)) return "The circle's radius must be greater than 0.";
    return null;
  }
  const s = draft.shape as PolygonShape;
  const vertices = s.vertices ?? [];
  if (!vertices.every(isValidLatLng)) return "The polygon has a vertex outside the valid lat/lng range.";
  const distinct = new Set(ringToPath(s).map((p) => `${p.lat},${p.lng}`));
  if (distinct.size < 3) return "The polygon needs at least 3 distinct points.";
  if (!sameLatLng(vertices[0], vertices[vertices.length - 1])) return "The polygon ring is not closed.";
  return null;
}

/** Bounds covering the zone's shape. */
export function zoneBounds(zone: Pick<DeliveryZone, "shapeType" | "shape">): google.maps.LatLngBounds | null {
  if (zone.shapeType === "RADIUS") {
    const s = zone.shape as RadiusShape;
    if (!isValidLatLng(s?.center) || !(s.radiusMeters > 0)) return null;
    return new google.maps.Circle({ center: s.center, radius: s.radiusMeters }).getBounds();
  }
  const path = ringToPath(zone.shape as PolygonShape).filter(isValidLatLng);
  if (path.length === 0) return null;
  const b = new google.maps.LatLngBounds();
  path.forEach((p) => b.extend(p));
  return b;
}

// Distinct, readable stroke colors — one per warehouse, assigned by index.
const WAREHOUSE_PALETTE = ["#2563EB", "#DB2777", "#059669", "#D97706", "#7C3AED", "#0891B2", "#DC2626", "#65A30D"];

export function warehouseColor(warehouseIds: string[], warehouseId: string): string {
  const i = warehouseIds.indexOf(warehouseId);
  return WAREHOUSE_PALETTE[(i < 0 ? 0 : i) % WAREHOUSE_PALETTE.length];
}
