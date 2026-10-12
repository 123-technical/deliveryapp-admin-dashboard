import { fetchWithAuth } from "./auth";
import type { Category, CreateCategoryDto, UpdateCategoryDto } from '../types/category';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

class CategoryService {
    private baseURL: string;

    constructor() {
        this.baseURL = API_BASE_URL;
    }

    async getEnabledCategories(): Promise<Category[]> {
        try {
            const response = await fetchWithAuth(`${this.baseURL}/api/v1/categories`, {
                method: 'GET',
            });

            if (!response.ok) {
                throw new Error('Failed to fetch categories');
            }
            
            const responseData = await response.json();
            console.log('Categories response:', responseData);
            
            // Extract the actual data from the wrapped response
            const data = responseData.data || responseData;
            console.log('Categories data:', data);
            
            return data;
        } catch (error) {
            console.error('Get categories error:', error);
            throw error;
        }
    }

    async getCategoryById(id: string): Promise<Category> {
        try {
            const response = await fetchWithAuth(`${this.baseURL}/api/v1/categories/${id}`, {
                method: 'GET',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch category');
            }
            
            const responseData = await response.json();
            console.log('Get category by ID response:', responseData);
            
            // Extract the actual data from the wrapped response
            const data = responseData.data || responseData;
            console.log('Category data:', data);
            
            return data;
        } catch (error) {
            console.error('Get category by ID error:', error);
            throw error;
        }
    }


    async getSubCategories(parentId: string): Promise<Category[]> {
        try {
            const response = await fetchWithAuth(`${this.baseURL}/api/v1/categories/sub/${parentId}`, {
                method: 'GET',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch subcategories');
            }

            const responseData = await response.json();
            const data = responseData.data || responseData;
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Get subcategories error:', error);
            throw error;
        }
    }

    async createCategory(categoryData: CreateCategoryDto): Promise<Category> {
        try {
            const response = await fetchWithAuth(`${this.baseURL}/api/v1/categories`, {
                method: 'POST',
                body: JSON.stringify(categoryData),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to create category');
            }

            const responseData = await response.json();
            console.log('Create category response:', responseData);
            
            // Extract the actual data from the wrapped response
            const data = responseData.data || responseData;
            console.log('Create category data:', data);
            
            return data;
        } catch (error) {
            console.error('Create category error:', error);
            throw error;
        }
    }

    async updateCategory(id: string, categoryData: UpdateCategoryDto): Promise<Category> {
        try {
            const response = await fetchWithAuth(`${this.baseURL}/api/v1/categories/${id}`, {
                method: 'PUT',
                body: JSON.stringify(categoryData),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to update category');
            }

            const responseData = await response.json();
            console.log('Update category response:', responseData);
            
            // Extract the actual data from the wrapped response
            const data = responseData.data || responseData;
            console.log('Update category data:', data);
            
            return data;
        } catch (error) {
            console.error('Update category error:', error);
            throw error;
        }
    }

    async deleteCategory(id: string): Promise<void> {
        try {
            const response = await fetchWithAuth(`${this.baseURL}/api/v1/categories/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete category');
            }
        } catch (error) {
            console.error('Delete category error:', error);
            throw error;
        }
    }

}

export const categoryService = new CategoryService();
