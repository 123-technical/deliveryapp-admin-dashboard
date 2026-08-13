import { authService } from "./auth";
import type { DeliveryZone, CreateDeliveryZoneDto, UpdateDeliveryZoneDto } from '../types/deliveryZone';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

class DeliveryZoneService {
    private baseURL: string;

    constructor() {
        this.baseURL = API_BASE_URL;
    }

    async getDeliveryZones(warehouseId?: string): Promise<DeliveryZone[]> {
        try {
            const token = authService.getToken();
            const queryParams = new URLSearchParams();
            queryParams.append('limit', '1000');
            // Backend's generic list filtering takes a JSON-encoded `filters` object,
            // not a bare `warehouseId` param — matches the convention used across
            // this API's other list endpoints (see FilterQueryPipe).
            if (warehouseId) queryParams.append('filters', JSON.stringify({ warehouseId }));

            const response = await fetch(`${this.baseURL}/api/v1/delivery-zones?${queryParams.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch delivery zones: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const payload = data?.data ?? data;

            if (Array.isArray(payload)) return payload;
            if (payload && Array.isArray(payload.data)) return payload.data;
            return [];
        } catch (error) {
            console.error('Get delivery zones error:', error);
            throw error;
        }
    }

    async createDeliveryZone(dto: CreateDeliveryZoneDto): Promise<DeliveryZone> {
        try {
            const token = authService.getToken();

            const response = await fetch(`${this.baseURL}/api/v1/delivery-zones`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
                body: JSON.stringify(dto),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to create delivery zone: ${response.status} ${response.statusText}`);
            }

            const responseData = await response.json();
            return responseData.data || responseData;
        } catch (error) {
            console.error('Create delivery zone error:', error);
            throw error;
        }
    }

    async updateDeliveryZone(id: string, dto: UpdateDeliveryZoneDto): Promise<DeliveryZone> {
        try {
            const token = authService.getToken();

            const response = await fetch(`${this.baseURL}/api/v1/delivery-zones/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
                body: JSON.stringify(dto),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to update delivery zone: ${response.status} ${response.statusText}`);
            }

            const responseData = await response.json();
            return responseData.data || responseData;
        } catch (error) {
            console.error('Update delivery zone error:', error);
            throw error;
        }
    }

    async deleteDeliveryZone(id: string): Promise<void> {
        try {
            const token = authService.getToken();
            const response = await fetch(`${this.baseURL}/api/v1/delivery-zones/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to delete delivery zone: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error('Delete delivery zone error:', error);
            throw error;
        }
    }
}

export const deliveryZoneService = new DeliveryZoneService();
