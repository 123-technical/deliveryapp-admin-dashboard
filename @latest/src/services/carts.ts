import { authService } from "./auth";
import type { Cart, CartItem, CartWithItems, CreateCartDto, AddCartItemDto, UpdateCartItemDto, CartsQuery, CartsResponse } from '../types/cart';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

class CartService {
    private baseURL: string;

    constructor() {
        this.baseURL = API_BASE_URL;
    }

    async getCarts(query: CartsQuery): Promise<CartsResponse> {
        try {
            const token = authService.getToken();
            const queryParams = new URLSearchParams();
            
            queryParams.append('page', query.page.toString());
            queryParams.append('pageSize', query.pageSize.toString());
            
            if (query.search) queryParams.append('search', query.search);
            if (query.userId) queryParams.append('userId', query.userId);
            if (query.sortBy) queryParams.append('sortBy', query.sortBy);
            if (query.sortOrder) queryParams.append('sortOrder', query.sortOrder);

            const response = await fetch(`${this.baseURL}/api/v1/carts?${queryParams}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
            });

            if (!response.ok) {
                // Don't throw error for 404, return empty result instead
                if (response.status === 404) {
                    return {
                        data: [],
                        total: 0
                    };
                }
                throw new Error(`Failed to fetch carts: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            // Extract the actual data from the wrapped response
            // API returns: { success: true, data: [...], metadata: { total, page, limit } }
            if (data && typeof data === 'object' && 'data' in data) {
                return {
                    data: data.data || [],
                    total: data.metadata?.total || data.data?.length || 0
                };
            }
            
            // Fallback: if data is already an array
            return {
                data: Array.isArray(data) ? data : [],
                total: Array.isArray(data) ? data.length : 0
            };
        } catch (error) {
            console.error('Get carts error:', error);
            throw error;
        }
    }

    async getCartById(cartId: string): Promise<CartWithItems> {
        try {
            const token = authService.getToken();
            // Note: This endpoint might need adjustment based on backend implementation
            // If backend distinguishes between userId and cartId, you may need a different endpoint
            const response = await fetch(`${this.baseURL}/api/v1/carts/${cartId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch cart: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            // Extract the actual data from the wrapped response
            return data.data || data;
        } catch (error) {
            console.error('Get cart by ID error:', error);
            throw error;
        }
    }

    async createCart(cartData: CreateCartDto): Promise<Cart> {
        try {
            const token = authService.getToken();
            
            const response = await fetch(`${this.baseURL}/api/v1/carts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
                body: JSON.stringify(cartData),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to create cart: ${response.status} ${response.statusText}`);
            }

            const responseData = await response.json();
            
            // Extract the actual data from the wrapped response
            return responseData.data || responseData;
        } catch (error) {
            console.error('Create cart error:', error);
            throw error;
        }
    }

    async getCart(userId: string): Promise<CartWithItems> {
        try {
            const token = authService.getToken();
            const response = await fetch(`${this.baseURL}/api/v1/carts/${userId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch cart: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            // Extract the actual data from the wrapped response
            return data.data || data;
        } catch (error) {
            console.error('Get cart error:', error);
            throw error;
        }
    }

    async addItemToCart(userId: string, itemData: AddCartItemDto): Promise<CartItem> {
        try {
            const token = authService.getToken();
            
            const response = await fetch(`${this.baseURL}/api/v1/carts/${userId}/items`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
                body: JSON.stringify(itemData),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to add item to cart: ${response.status} ${response.statusText}`);
            }

            const responseData = await response.json();
            
            // Extract the actual data from the wrapped response
            return responseData.data || responseData;
        } catch (error) {
            console.error('Add item to cart error:', error);
            throw error;
        }
    }

    async updateCartItem(itemId: string, itemData: UpdateCartItemDto): Promise<CartItem> {
        try {
            const token = authService.getToken();
            
            const response = await fetch(`${this.baseURL}/api/v1/carts/items/${itemId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
                body: JSON.stringify(itemData),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to update cart item: ${response.status} ${response.statusText}`);
            }

            const responseData = await response.json();
            
            // Extract the actual data from the wrapped response
            return responseData.data || responseData;
        } catch (error) {
            console.error('Update cart item error:', error);
            throw error;
        }
    }

    async removeCartItem(itemId: string): Promise<void> {
        try {
            const token = authService.getToken();
            const response = await fetch(`${this.baseURL}/api/v1/carts/items/${itemId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to remove cart item: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error('Remove cart item error:', error);
            throw error;
        }
    }

    async clearCart(userId: string): Promise<void> {
        try {
            const token = authService.getToken();
            const response = await fetch(`${this.baseURL}/api/v1/carts/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to clear cart: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error('Clear cart error:', error);
            throw error;
        }
    }
}

export const cartService = new CartService();
