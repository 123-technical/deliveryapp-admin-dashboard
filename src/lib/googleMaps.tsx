// Single entry point for the Google Maps JavaScript API. <MapsProvider> is
// mounted once (in AdminLayout), so the script is only ever injected once with
// one fixed set of loader params — every map component below it just consumes
// the already-loaded API.
import { Component } from "react";
import { APIProvider,APILoadingStatus, useApiLoadingStatus } from "@vis.gl/react-google-maps";
import { EnvironmentOutlined } from "@ant-design/icons";
import { GOOGLE_MAPS_API_KEY, MapsConfiguredContext, useMapsConfigured } from "./googleMapsConfig";

export function MapsProvider({ children }: { children: React.ReactNode }) {
  if (!GOOGLE_MAPS_API_KEY) {
    return <MapsConfiguredContext.Provider value={false}>{children}</MapsConfiguredContext.Provider>;
  }
  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} region="IN" language="en">
      <MapsConfiguredContext.Provider value={true}>{children}</MapsConfiguredContext.Provider>
    </APIProvider>
  );
}

export function MapPlaceholder({ height, text }: { height: number | string; text: string }) {
  return (
    <div
      style={{
        height,
        width: "100%",
        borderRadius: 8,
        border: "1px dashed #CBD5E1",
        background: "#F8FAFC",
        color: "#64748B",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        fontSize: 13,
        textAlign: "center",
        padding: 16,
      }}
    >
      <EnvironmentOutlined style={{ fontSize: 24, color: "#94A3B8" }} />
      {text}
    </div>
  );
}

/**
 * Renders children only once the Maps API is usable; otherwise a placeholder
 * explaining why (no key, still loading, or Google rejected the key). Every
 * map must render through this — it also catches anything the map throws, so
 * a Maps failure stays inside the map's box instead of blanking the page.
 */
export function MapGate({ height, children }: { height: number | string; children: React.ReactNode }) {
  const configured = useMapsConfigured();
  if (!configured) return <MapPlaceholder height={height} text="Google Maps key not configured" />;
  return (
    <MapErrorBoundary height={height}>
      <LoadedGate height={height}>{children}</LoadedGate>
    </MapErrorBoundary>
  );
}

/**
 * The Maps API can throw from its own internals (e.g. after a key/referrer
 * error it doesn't report as an auth failure) — useApiLoadingStatus alone
 * doesn't catch that.
 */
class MapErrorBoundary extends Component<{ height: number | string; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Map crashed:", error);
  }

  render() {
    if (this.state.failed) {
      return (
        <MapPlaceholder
          height={this.props.height}
          text="The map couldn't load here — check that the Google Maps key allows this site's URL. The rest of the page still works."
        />
      );
    }
    return this.props.children;
  }
}

function LoadedGate({ height, children }: { height: number | string; children: React.ReactNode }) {
  const status = useApiLoadingStatus();
  if (status === APILoadingStatus.AUTH_FAILURE) {
    return (
      <MapPlaceholder
        height={height}
        text="Google Maps rejected the API key — check that it's valid and allows this site's URL."
      />
    );
  }
  if (status === APILoadingStatus.FAILED) {
    return <MapPlaceholder height={height} text="Google Maps failed to load. Check your connection." />;
  }
  return <>{children}</>;
}
