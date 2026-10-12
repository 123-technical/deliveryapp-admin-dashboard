import { Circle, Polygon } from "@vis.gl/react-google-maps";
import type { DeliveryZone, PolygonShape, RadiusShape } from "../../types/deliveryZone";
import { isValidLatLng, ringToPath } from "./zoneShapes";

type Props = {
  zone: Pick<DeliveryZone, "shapeType" | "shape">;
  color: string;
  /** Inactive zones are drawn dashed-looking (thin, low opacity). */
  dimmed?: boolean;
  /** Very faint, non-interactive — used as context behind the editor. */
  faint?: boolean;
  onClick?: () => void;
  onHover?: (hovering: boolean) => void;
};

/** Read-only rendering of a stored zone. Must be a child of <Map>. */
export default function ZoneOverlay({ zone, color, dimmed, faint, onClick, onHover }: Props) {
  const clickable = !!onClick && !faint;
  const style = {
    strokeColor: color,
    strokeOpacity: faint ? 0.45 : dimmed ? 0.4 : 0.9,
    strokeWeight: faint ? 1 : dimmed ? 1 : 2,
    fillColor: color,
    fillOpacity: faint ? 0.08 : dimmed ? 0.05 : 0.18,
    clickable,
    zIndex: faint ? 0 : dimmed ? 1 : 2,
  };
  const events = clickable
    ? {
        onClick: () => onClick?.(),
        onMouseOver: () => onHover?.(true),
        onMouseOut: () => onHover?.(false),
      }
    : {};

  if (zone.shapeType === "RADIUS") {
    const s = zone.shape as RadiusShape;
    if (!isValidLatLng(s?.center) || !(s.radiusMeters > 0)) return null;
    return <Circle center={s.center} radius={s.radiusMeters} {...style} {...events} />;
  }
  const path = ringToPath(zone.shape as PolygonShape).filter(isValidLatLng);
  if (path.length < 3) return null;
  return <Polygon paths={path} {...style} {...events} />;
}
