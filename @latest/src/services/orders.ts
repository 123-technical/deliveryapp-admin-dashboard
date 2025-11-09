import { authService } from "./auth";
import type { 
  Order, 
  OrderWithItems, 
  CreateOrderDto, 
  UpdateOrderDto, 
  OrdersQuery, 
  OrdersResponse 
} from '../types/order';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

class OrderService {
    private baseURL: string;

    constructor() {
        this.baseURL = API_BASE_URL;
    }

    async getOrders(query: OrdersQuery): Promise<OrdersResponse> {
        try {
            const token = authService.getToken();
            const queryParams = new URLSearchParams();
            
            queryParams.append('page', query.page.toString());
            queryParams.append('pageSize', query.pageSize.toString());
            
            if (query.search) queryParams.append('search', query.search);
            if (query.status) queryParams.append('status', query.status);
            if (query.userId) queryParams.append('userId', query.userId);
            if (query.sortBy) queryParams.append('sortBy', query.sortBy);
            if (query.sortOrder) queryParams.append('sortOrder', query.sortOrder);
            if (query.startDate) queryParams.append('startDate', query.startDate);
            if (query.endDate) queryParams.append('endDate', query.endDate);

            const response = await fetch(`${this.baseURL}/api/v1/orders?${queryParams}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch orders: ${response.status} ${response.statusText}`);
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
            console.error('Get orders error:', error);
            throw error;
        }
    }

    async getOrderById(orderId: string): Promise<OrderWithItems> {
        try {
            const token = authService.getToken();
            const response = await fetch(`${this.baseURL}/api/v1/orders/${orderId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch order: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            // Extract the actual data from the wrapped response
            return data.data || data;
        } catch (error) {
            console.error('Get order error:', error);
            throw error;
        }
    }

    async getUserOrders(userId: string, query: Omit<OrdersQuery, 'userId'>): Promise<OrdersResponse> {
        try {
            const token = authService.getToken();
            const queryParams = new URLSearchParams();
            
            queryParams.append('page', query.page.toString());
            queryParams.append('pageSize', query.pageSize.toString());
            
            if (query.search) queryParams.append('search', query.search);
            if (query.status) queryParams.append('status', query.status);
            if (query.sortBy) queryParams.append('sortBy', query.sortBy);
            if (query.sortOrder) queryParams.append('sortOrder', query.sortOrder);
            if (query.startDate) queryParams.append('startDate', query.startDate);
            if (query.endDate) queryParams.append('endDate', query.endDate);

            const response = await fetch(`${this.baseURL}/api/v1/orders/user/${userId}?${queryParams}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch user orders: ${response.status} ${response.statusText}`);
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
            console.error('Get user orders error:', error);
            throw error;
        }
    }

    async createOrder(orderData: CreateOrderDto): Promise<Order> {
        try {
            const token = authService.getToken();
            
            const response = await fetch(`${this.baseURL}/api/v1/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
                body: JSON.stringify(orderData),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                // If backend returns validation errors array, include them in the error message
                const errorMessage = errorData.message || `Failed to create order: ${response.status} ${response.statusText}`;
                const validationErrors = errorData.errors;
                if (Array.isArray(validationErrors) && validationErrors.length > 0) {
                    throw new Error(`${errorMessage}: ${validationErrors.join(', ')}`);
                }
                throw new Error(errorMessage);
            }

            const responseData = await response.json();
            
            // Extract the actual data from the wrapped response
            return responseData.data || responseData;
        } catch (error) {
            console.error('Create order error:', error);
            throw error;
        }
    }

    async updateOrder(orderId: string, orderData: UpdateOrderDto): Promise<Order> {
        try {
            const token = authService.getToken();
            
            const response = await fetch(`${this.baseURL}/api/v1/orders/${orderId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
                body: JSON.stringify(orderData),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to update order: ${response.status} ${response.statusText}`);
            }

            const responseData = await response.json();
            
            // Extract the actual data from the wrapped response
            return responseData.data || responseData;
        } catch (error) {
            console.error('Update order error:', error);
            throw error;
        }
    }

    async deleteOrder(orderId: string): Promise<void> {
        try {
            const token = authService.getToken();
            const response = await fetch(`${this.baseURL}/api/v1/orders/${orderId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to delete order: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error('Delete order error:', error);
            throw error;
        }
    }
}

export const orderService = new OrderService();