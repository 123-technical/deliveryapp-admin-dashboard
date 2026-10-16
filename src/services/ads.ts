import { fetchWithAuth } from "./auth";
import type { Ad, AdSettings, AdsQuery, AdsResponse, CreateAdDto, UpdateAdDto } from '../types/ad';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

/**
 * A failed request, keeping the backend's validation messages so forms can
 * show them next to the right field (e.g. "title must be shorter than or
 * equal to 40 characters" → the `title` field).
 */
export class AdApiError extends Error {
    readonly fieldErrors: string[];

    constructor(message: string, fieldErrors: string[] = []) {
        super(message);
        this.fieldErrors = fieldErrors;
    }
}

async function toError(response: Response, fallback: string): Promise<AdApiError> {
    const body = await response.json().catch(() => ({}));
    const errors: string[] = Array.isArray(body?.errors) ? body.errors.filter((e: unknown) => typeof e === 'string') : [];
    return new AdApiError(errors[0] || body?.message || `${fallback}: ${response.status} ${response.statusText}`, errors);
}

class AdService {
    private baseURL: string;

    constructor() {
        this.baseURL = API_BASE_URL;
    }

    async getAds(params: AdsQuery): Promise<AdsResponse> {
        const queryParams = new URLSearchParams();
        queryParams.append('page', params.page.toString());
        queryParams.append('limit', params.pageSize.toString());
        if (params.search) queryParams.append('search', params.search);
        if (params.placement) queryParams.append('placement', params.placement);
        if (params.status) queryParams.append('status', params.status);

        const response = await fetchWithAuth(`${this.baseURL}/api/v1/ads/admin?${queryParams.toString()}`, {
            method: 'GET',
        });
        if (!response.ok) throw await toError(response, 'Failed to fetch ads');

        const data = await response.json();
        return {
            data: Array.isArray(data?.data) ? data.data : [],
            total: data?.metadata?.total ?? 0,
        };
    }

    async createAd(dto: CreateAdDto): Promise<Ad> {
        const response = await fetchWithAuth(`${this.baseURL}/api/v1/ads`, {
            method: 'POST',
            body: JSON.stringify(dto),
        });
        if (!response.ok) throw await toError(response, 'Failed to create ad');
        const data = await response.json();
        return data.data || data;
    }

    async updateAd(id: string, dto: UpdateAdDto): Promise<Ad> {
        const response = await fetchWithAuth(`${this.baseURL}/api/v1/ads/${id}`, {
            method: 'PUT',
            body: JSON.stringify(dto),
        });
        if (!response.ok) throw await toError(response, 'Failed to update ad');
        const data = await response.json();
        return data.data || data;
    }

    async toggleAd(id: string): Promise<Ad> {
        const response = await fetchWithAuth(`${this.baseURL}/api/v1/ads/${id}/toggle`, {
            method: 'PATCH',
        });
        if (!response.ok) throw await toError(response, 'Failed to update ad');
        const data = await response.json();
        return data.data || data;
    }

    async deleteAd(id: string): Promise<void> {
        const response = await fetchWithAuth(`${this.baseURL}/api/v1/ads/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw await toError(response, 'Failed to delete ad');
    }

    async getSettings(): Promise<AdSettings> {
        const response = await fetchWithAuth(`${this.baseURL}/api/v1/ads/settings`, {
            method: 'GET',
        });
        if (!response.ok) throw await toError(response, 'Failed to fetch ad settings');
        const data = await response.json();
        return data.data || data;
    }

    async updateSettings(dto: Partial<AdSettings>): Promise<AdSettings> {
        const response = await fetchWithAuth(`${this.baseURL}/api/v1/ads/settings`, {
            method: 'PUT',
            body: JSON.stringify(dto),
        });
        if (!response.ok) throw await toError(response, 'Failed to save ad settings');
        const data = await response.json();
        return data.data || data;
    }
}

export const adService = new AdService();
