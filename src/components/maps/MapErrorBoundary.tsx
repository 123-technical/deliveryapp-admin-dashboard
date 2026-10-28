import { Component, type ReactNode } from "react";
import { MapPlaceholder } from "../../lib/googleMaps";

/**
 * Keeps a Google Maps failure inside the map's box. The Maps API can throw
 * from its own internals (e.g. after a key/referrer error it doesn't report
 * as an auth failure), and without this the whole page goes blank.
 */
export default class MapErrorBoundary extends Component<{ height: number | string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Map preview crashed:", error);
  }

  render() {
    if (this.state.failed) {
      return (
        <MapPlaceholder
          height={this.props.height}
          text="The map couldn't load here (check the Google Maps key allows this site). Fees still save normally."
        />
      );
    }
    return this.props.children;
  }
}
