import { authService } from "./auth";
import type { Warehouse } from "../types/warehouse";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

class WarehouseService {
    private baseURL: string;

    constructor() {
        this.baseURL = API_BASE_URL;
    }

    async getWarehouses(): Promise<Warehouse[]> {
        try {
            const token = authService.getToken();
            // Large limit — this powers a selector dropdown, not a paginated table.
            const response = await fetch(`${this.baseURL}/api/v1/warehouses?limit=1000`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
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
}

export const warehouseService = new WarehouseService();
