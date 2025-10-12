import { authService } from "./auth";
import type { Category, CreateCategoryDto } from '../types/category';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

class CategoryService {
    private baseURL: string;

    constructor() {
        this.baseURL = API_BASE_URL;
    }

    async getEnabledCategories(): Promise<Category[]> {
        try {
            const token = authService.getToken();
            const user = authService.getUser();
            console.log('Current user:', user);
            console.log('Token:', token ? 'Present' : 'Missing');
            console.log('User role:', user?.role);
            
            const response = await fetch(`${this.baseURL}/api/v1/categories`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
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


    async createCategory(categoryData: CreateCategoryDto): Promise<Category> {
        try {
            const token = authService.getToken();
            const response = await fetch(`${this.baseURL}/api/v1/categories`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
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

    async deleteCategory(id: string): Promise<void> {
        try {
            const token = authService.getToken();
            const response = await fetch(`${this.baseURL}/api/v1/categories/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
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
