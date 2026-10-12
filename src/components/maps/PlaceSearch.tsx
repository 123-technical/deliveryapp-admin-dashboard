import { useEffect, useRef, useState } from "react";
import { AutoComplete, Input, Spin } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import {
  placesService,
  newPlacesSessionToken,
  PlacesError,
  type PlaceSuggestion,
} from "../../services/places";

export type PickedPlace = {
  lat: number;
  lng: number;
  title: string;
  subtitle: string;
};

type Props = {
  /** Current map center, used to bias results towards what the admin is looking at. */
  getBias?: () => google.maps.LatLngLiteral | undefined;
  onPick: (place: PickedPlace) => void;
  placeholder?: string;
  style?: React.CSSProperties;
};

const MIN_CHARS = 2;
const DEBOUNCE_MS = 300;

/**
 * Search box backed by our /places endpoints (never Google Places directly).
 * One session token covers every keystroke of a search plus the final details
 * call, so Google bills the whole thing as a single session.
 */
export default function PlaceSearch({ getBias, onPick, placeholder, style }: Props) {
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [provider, setProvider] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<string | null>(null);
  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    },
    []
  );

  const handleSearch = (value: string) => {
    setText(value);
    setError(null);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const q = value.trim();
    if (q.length < MIN_CHARS) {
      abortRef.current?.abort();
      setSuggestions([]);
      setLoading(false);
      return;
    }
    if (!sessionRef.current) sessionRef.current = newPlacesSessionToken();

    debounceRef.current = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const bias = getBias?.();
        const result = await placesService.autocomplete(q, {
          lat: bias?.lat,
          lng: bias?.lng,
          sessionToken: sessionRef.current ?? undefined,
          signal: controller.signal,
        });
        setSuggestions(result.suggestions);
        setProvider(result.provider);
      } catch (err) {
        if (controller.signal.aborted) return;
        setSuggestions([]);
        setError(
          err instanceof PlacesError && err.isUnavailable
            ? "Location search is temporarily unavailable — you can still move the map by hand."
            : "Couldn't search locations. Try again."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);
  };

  const handleSelect = async (id: string) => {
    const picked = suggestions.find((s) => s.id === id);
    if (!picked) return;
    setText(picked.title);
    setSuggestions([]);
    const token = sessionRef.current ?? undefined;
    // The session ends with this pick; the next search starts a fresh one.
    sessionRef.current = null;

    let resolved = picked;
    if (picked.lat === null || picked.lng === null) {
      setLoading(true);
      try {
        resolved = await placesService.details(picked.id, token);
      } catch (err) {
        setError(
          err instanceof PlacesError && err.isUnavailable
            ? "Location search is temporarily unavailable — you can still move the map by hand."
            : "Couldn't load that place. Try another result."
        );
        return;
      } finally {
        setLoading(false);
      }
    }
    if (resolved.lat === null || resolved.lng === null) {
      setError("That place has no coordinates. Try another result.");
      return;
    }
    onPick({ lat: resolved.lat, lng: resolved.lng, title: picked.title, subtitle: picked.subtitle });
  };

  const options = suggestions.map((s) => ({
    value: s.id,
    label: (
      <div style={{ lineHeight: 1.3, padding: "2px 0" }}>
        <div style={{ fontWeight: 500, color: "#0F172A", whiteSpace: "normal" }}>{s.title}</div>
        {s.subtitle && (
          <div style={{ fontSize: 12, color: "#64748B", whiteSpace: "normal" }}>{s.subtitle}</div>
        )}
      </div>
    ),
  }));

  return (
    <div style={style}>
      <AutoComplete
        value={text}
        options={options}
        onSearch={handleSearch}
        onSelect={handleSelect}
        onChange={(v) => setText(v)}
        filterOption={false}
        style={{ width: "100%" }}
        popupRender={(menu) => (
          <>
            {menu}
            {provider === "GOOGLE" && suggestions.length > 0 && (
              <div style={{ fontSize: 11, color: "#64748B", textAlign: "right", padding: "4px 8px 2px" }}>
                Powered by Google
              </div>
            )}
          </>
        )}
      >
        <Input
          placeholder={placeholder ?? "Search for a place…"}
          prefix={loading ? <Spin size="small" /> : <SearchOutlined style={{ color: "#94A3B8" }} />}
          allowClear
        />
      </AutoComplete>
      {error && (
        <div
          role="status"
          style={{
            marginTop: 4,
            fontSize: 12,
            color: "#B45309",
            background: "#FFFBEB",
            borderRadius: 6,
            padding: "4px 8px",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
