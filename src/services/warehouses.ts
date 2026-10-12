import { fetchWithAuth } from "./auth";
import type { Warehouse } from "../types/warehouse";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export type CreateWarehouseDto = {
    name: string;
    location: string;
    latitude?: number | null;
    longitude?: number | null;
};
export type UpdateWarehouseDto = Partial<CreateWarehouseDto>;

class WarehouseService {
    private baseURL: string;

    constructor() {
        this.baseURL = API_BASE_URL;
    }

    async getWarehouses(): Promise<Warehouse[]> {
        try {
            // Large limit — this powers a selector dropdown, not a paginated table.
            const response = await fetchWithAuth(`${this.baseURL}/api/v1/warehouses?limit=1000`, {
                method: 'GET',
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch warehouses: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const payload = data?.data ?? data;

            // Handle both { data: Warehouse[] } and { data: { data: Warehouse[] } } (paginated) shapes
            if (Array.isArray(payload)) return payload;
            if (payload && Array.isArray(payload.data)) return payload.data;
            return [];
        } catch (error) {
            console.error('Get warehouses error:', error);
            throw error;
        }
    }

    async createWarehouse(dto: CreateWarehouseDto): Promise<Warehouse> {
        try {
            const response = await fetchWithAuth(`${this.baseURL}/api/v1/warehouses`, {
                method: 'POST',
                body: JSON.stringify(dto),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to create warehouse: ${response.status} ${response.statusText}`);
            }

            const responseData = await response.json();
            return responseData.data || responseData;
        } catch (error) {
            console.error('Create warehouse error:', error);
            throw error;
        }
    }

    async updateWarehouse(id: string, dto: UpdateWarehouseDto): Promise<Warehouse> {
        try {
            const response = await fetchWithAuth(`${this.baseURL}/api/v1/warehouses/${id}`, {
                method: 'PUT',
                body: JSON.stringify(dto),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to update warehouse: ${response.status} ${response.statusText}`);
            }

            const responseData = await response.json();
            return responseData.data || responseData;
        } catch (error) {
            console.error('Update warehouse error:', error);
            throw error;
        }
    }

    async deleteWarehouse(id: string): Promise<void> {
        try {
            const response = await fetchWithAuth(`${this.baseURL}/api/v1/warehouses/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error(`Failed to delete warehouse: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error('Delete warehouse error:', error);
            throw error;
        }
    }
}

export const warehouseService = new WarehouseService();
