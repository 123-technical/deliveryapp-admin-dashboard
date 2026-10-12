import { fetchWithAuth } from "./auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Place search always goes through our backend, which picks the provider
// (PLACES_PROVIDER = PHOTON | OLA | GOOGLE) and holds the provider key.
// The dashboard never talks to Google Places directly.

export type PlaceSuggestion = {
    id: string;
    title: string;
    subtitle: string;
    /** Null when the provider needs a details call to resolve coordinates (Google). */
    lat: number | null;
    lng: number | null;
};

export type AutocompleteResult = {
    suggestions: PlaceSuggestion[];
    /** Active provider, e.g. "GOOGLE" — drives the required attribution. */
    provider: string | null;
};

export class PlacesError extends Error {
    readonly status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
    /** 503 = upstream provider down, as opposed to "no matches". */
    get isUnavailable() {
        return this.status === 503;
    }
}

/** One token per search: shared by every keystroke plus the final details call. */
export function newPlacesSessionToken(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    // crypto.randomUUID is unavailable outside secure contexts (plain-http IPs).
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}

class PlacesService {
    private baseURL = API_BASE_URL;

    async autocomplete(
        q: string,
        opts: { lat?: number; lng?: number; sessionToken?: string; signal?: AbortSignal } = {},
    ): Promise<AutocompleteResult> {
        const params = new URLSearchParams({ q });
        if (opts.lat !== undefined && opts.lng !== undefined) {
            params.append('lat', opts.lat.toFixed(6));
            params.append('lng', opts.lng.toFixed(6));
        }
        if (opts.sessionToken) params.append('sessionToken', opts.sessionToken);

        const response = await fetchWithAuth(`${this.baseURL}/api/v1/places/autocomplete?${params.toString()}`, {
            method: 'GET',
            signal: opts.signal,
        });
        const body = await this.parse(response);
        return {
            suggestions: Array.isArray(body?.data) ? body.data : [],
            provider: body?.metadata?.provider ?? null,
        };
    }

    async details(id: string, sessionToken?: string): Promise<PlaceSuggestion> {
        const params = new URLSearchParams({ id });
        if (sessionToken) params.append('sessionToken', sessionToken);
        const response = await fetchWithAuth(`${this.baseURL}/api/v1/places/details?${params.toString()}`, {
            method: 'GET',
        });
        const body = await this.parse(response);
        return body?.data ?? body;
    }

    private async parse(response: Response) {
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new PlacesError(
                errorData.message || `Location search failed: ${response.status} ${response.statusText}`,
                response.status,
            );
        }
        return response.json();
    }
}

export const placesService = new PlacesService();
