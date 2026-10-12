import { useId } from "react";
import { AdvancedMarker, Map, Pin } from "@vis.gl/react-google-maps";
import { MapGate } from "../../lib/googleMaps";
import { GOOGLE_MAPS_MAP_ID } from "../../lib/googleMapsConfig";
import { isValidLatLng } from "./zoneShapes";

type Props = {
  lat: number | null | undefined;
  lng: number | null | undefined;
  height?: number;
};

/** Small read-only map for a single point. Renders nothing when the point is missing. */
export default function LocationPreviewMap({ lat, lng, height = 200 }: Props) {
  const mapId = useId();
  const point = { lat: lat ?? NaN, lng: lng ?? NaN };
  if (!isValidLatLng(point)) return null;

  return (
    <MapGate height={height}>
      <div style={{ height, width: "100%", borderRadius: 8, overflow: "hidden" }}>
        <Map
          id={mapId}
          mapId={GOOGLE_MAPS_MAP_ID}
          defaultCenter={point}
          defaultZoom={16}
          gestureHandling="cooperative"
          disableDefaultUI
          zoomControl
          clickableIcons={false}
          style={{ height: "100%", width: "100%" }}
        >
          <AdvancedMarker position={point}>
            <Pin background="#10B981" borderColor="#065F46" glyphColor="#fff" />
          </AdvancedMarker>
        </Map>
      </div>
    </MapGate>
  );
}
