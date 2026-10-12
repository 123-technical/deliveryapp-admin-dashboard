import { createContext, useContext } from "react";

export const GOOGLE_MAPS_API_KEY: string = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "").trim();
// Advanced markers need a Map ID. DEMO_MAP_ID is Google's dev placeholder —
// create a real one in Cloud Console for production.
export const GOOGLE_MAPS_MAP_ID: string = (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID ?? "").trim() || "DEMO_MAP_ID";

// Kasaragod, Kerala — used whenever there's nothing better to center on.
export const DEFAULT_CENTER: google.maps.LatLngLiteral = { lat: 12.4996, lng: 74.9869 };
export const DEFAULT_ZOOM = 13;

export const MapsConfiguredContext = createContext(false);

/** False when no API key is set — map components should render a placeholder. */
export function useMapsConfigured(): boolean {
  return useContext(MapsConfiguredContext);
}
