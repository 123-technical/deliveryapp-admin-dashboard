import { authService } from "./auth";
import type { Product, ProductsQuery, ProductsResponse, CreateProductDto, UpdateProductDto } from '../types/product';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

class ProductService {
    private baseURL: string;

    constructor() {
        this.baseURL = API_BASE_URL;
    }

    async getProducts(params: ProductsQuery): Promise<ProductsResponse> {
        try {
            const token = authService.getToken();
            const queryParams = new URLSearchParams();
            
            // Add query parameters
            queryParams.append('page', params.page.toString());
            queryParams.append('limit', params.pageSize.toString());
            
            if (params.search) queryParams.append('search', params.search);
            if (params.categoryId && params.categoryId !== 'all') queryParams.append('categoryId', params.categoryId);
            if (params.subCategoryId && params.subCategoryId !== 'all') queryParams.append('subCategoryId', params.subCategoryId);
            if (params.brandId && params.brandId !== 'all') queryParams.append('brandId', params.brandId);
            if (params.isAvailable !== undefined && params.isAvailable !== 'all') queryParams.append('isAvailable', params.isAvailable.toString());
            if (params.minPrice != null) queryParams.append('minPrice', params.minPrice.toString());
            if (params.maxPrice != null) queryParams.append('maxPrice', params.maxPrice.toString());
            if (params.startDate) queryParams.append('startDate', params.startDate);
            if (params.endDate) queryParams.append('endDate', params.endDate);
            if (params.sortBy) queryParams.append('sortBy', params.sortBy);
            if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

            const response = await fetch(`${this.baseURL}/api/v1/products?${queryParams.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch products');
            }
            
            const responseData = await response.json();
            console.log('Products response:', responseData);
            
            // Extract the actual data from the wrapped response
            const data = responseData.data || responseData;
            console.log('Products data:', data);
            
            // Handle the case where backend returns { data: [], total: 0 }
            if (data && typeof data === 'object' && 'data' in data && 'total' in data) {
                return data;
            }
            
            // If it's just an array, wrap it in the expected format
            return {
                data: Array.isArray(data) ? data : [],
                total: Array.isArray(data) ? data.length : 0
            };
        } catch (error) {
            console.error('Get products error:', error);
            throw error;
        }
    }

    async getProductById(id: string): Promise<Product> {
        try {
            const token = authService.getToken();
            const response = await fetch(`${this.baseURL}/api/v1/products/${id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch product');
            }
            
            const responseData = await response.json();
            console.log('Get product by ID response:', responseData);
            
            // Extract the actual data from the wrapped response
            const data = responseData.data || responseData;
            console.log('Product data:', data);
            
            return data;
        } catch (error) {
            console.error('Get product by ID error:', error);
            throw error;
        }
    }

    async createProduct(productData: CreateProductDto): Promise<Product> {
        try {
            const token = authService.getToken();
            console.log('Creating product with data:', productData);
            
            const response = await fetch(`${this.baseURL}/api/v1/products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
                body: JSON.stringify(productData),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Backend validation error:', errorData);
                console.error('Full error object:', JSON.stringify(errorData, null, 2));
                if (errorData.errors && Array.isArray(errorData.errors)) {
                    console.error('Validation errors:', errorData.errors);
                }
                console.error('Response status:', response.status);
                console.error('Response statusText:', response.statusText);
                throw new Error(errorData.message || `Failed to create product: ${response.status} ${response.statusText}`);
            }

            const responseData = await response.json();
            console.log('Create product response:', responseData);
            
            // Extract the actual data from the wrapped response
            const data = responseData.data || responseData;
            console.log('Create product data:', data);
            
            return data;
        } catch (error) {
            console.error('Create product error:', error);
            throw error;
        }
    }

    async updateProduct(id: string, productData: UpdateProductDto): Promise<Product> {
        try {
            const token = authService.getToken();
            const response = await fetch(`${this.baseURL}/api/v1/products/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
                body: JSON.stringify(productData),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to update product');
            }

            const responseData = await response.json();
            console.log('Update product response:', responseData);
            
            // Extract the actual data from the wrapped response
            const data = responseData.data || responseData;
            console.log('Update product data:', data);
            
            return data;
        } catch (error) {
            console.error('Update product error:', error);
            throw error;
        }
    }

    async deleteProduct(id: string): Promise<void> {
        try {
            const token = authService.getToken();
            const response = await fetch(`${this.baseURL}/api/v1/products/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to delete product');
            }
        } catch (error) {
            console.error('Delete product error:', error);
            throw error;
        }
    }
}

export const productService = new ProductService();