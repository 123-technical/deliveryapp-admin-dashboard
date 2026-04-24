import { authService } from "./auth";
import type { Brand, BrandsQuery, BrandsResponse, CreateBrandDto, UpdateBrandDto } from '../types/brand';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

class BrandService {
    private baseURL: string;

    constructor() {
        this.baseURL = API_BASE_URL;
    }

    async getBrands(params: BrandsQuery): Promise<BrandsResponse> {
        try {
            const token = authService.getToken();
            const queryParams = new URLSearchParams();
            
            // Add query parameters
            queryParams.append('page', params.page.toString());
            queryParams.append('limit', params.pageSize.toString());
            if (params.search) queryParams.append('search', params.search);
            if (params.sortBy) queryParams.append('sortBy', params.sortBy);
            if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

            const response = await fetch(`${this.baseURL}/api/v1/brands?${queryParams.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch brands: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            // Extract the actual data from the wrapped response
            if (data && typeof data === 'object' && 'data' in data) {
                return {
                    data: data.data || [],
                    total: data.data?.length || 0
                };
            }
            return {
                data: Array.isArray(data) ? data : [],
                total: Array.isArray(data) ? data.length : 0
            };
        } catch (error) {
            console.error('Get brands error:', error);
            throw error;
        }
    }

    async getBrandById(id: string): Promise<Brand> {
        try {
            const token = authService.getToken();
            const response = await fetch(`${this.baseURL}/api/v1/brands/${id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch brand: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            // Extract the actual data from the wrapped response
            return data.data || data;
        } catch (error) {
            console.error('Get brand by ID error:', error);
            throw error;
        }
    }

    async createBrand(brandData: CreateBrandDto): Promise<Brand> {
        try {
            const token = authService.getToken();
            
            const response = await fetch(`${this.baseURL}/api/v1/brands`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
                body: JSON.stringify(brandData),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to create brand: ${response.status} ${response.statusText}`);
            }

            const responseData = await response.json();
            
            // Extract the actual data from the wrapped response
            return responseData.data || responseData;
        } catch (error) {
            console.error('Create brand error:', error);
            throw error;
        }
    }

    async updateBrand(id: string, brandData: UpdateBrandDto): Promise<Brand> {
        try {
            const token = authService.getToken();
            
            const response = await fetch(`${this.baseURL}/api/v1/brands/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
                body: JSON.stringify(brandData),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to update brand: ${response.status} ${response.statusText}`);
            }

            const responseData = await response.json();
            
            // Extract the actual data from the wrapped response
            return responseData.data || responseData;
        } catch (error) {
            console.error('Update brand error:', error);
            throw error;
        }
    }

    async deleteBrand(id: string): Promise<void> {
        try {
            const token = authService.getToken();
            const response = await fetch(`${this.baseURL}/api/v1/brands/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to delete brand: ${response.status} ${response.statusText}`);
            }

        } catch (error) {
            console.error('Delete brand error:', error);
            throw error;
        }
    }
}

export const brandService = new BrandService();
