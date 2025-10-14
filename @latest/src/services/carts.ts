import { authService } from "./auth";
import type { Cart, CartItem, CartWithItems, CreateCartDto, AddCartItemDto, UpdateCartItemDto } from '../types/cart';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

class CartService {
    private baseURL: string;

    constructor() {
        this.baseURL = API_BASE_URL;
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
