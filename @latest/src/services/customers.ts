import { authService } from "./auth";
import type { Customer, CustomerStatus, CustomersQuery, CustomersResponse, CreateUserDto, UpdateCustomerDto, UserRole } from '../types/customer';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Helper function to derive status from deletedAt
const getStatusFromDeletedAt = (deletedAt: string | null): CustomerStatus => {
  if (deletedAt === null) {
    return 'active';
  }
  return 'inactive';
};

// Helper function to map backend User to Customer
const mapUserToCustomer = (user: {
  id: string;
  username: string;
  mobile: string;
  email: string | null;
  name: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}): Customer => {
  return {
    id: user.id,
    username: user.username,
    mobile: user.mobile,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    deletedAt: user.deletedAt,
    status: getStatusFromDeletedAt(user.deletedAt),
  };
};

export async function fetchCustomers(params: CustomersQuery): Promise<CustomersResponse> {
  try {
    const token = authService.getToken();
    const queryParams = new URLSearchParams();
    
    queryParams.append('page', params.page.toString());
    queryParams.append('pageSize', params.pageSize.toString());
    queryParams.append('role', 'CUSTOMER'); // Always filter by CUSTOMER role
    
    if (params.search) queryParams.append('search', params.search);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const response = await fetch(`${API_BASE_URL}/api/v1/users?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      // Handle 404 gracefully - return empty result
      if (response.status === 404) {
        return {
          data: [],
          total: 0
        };
      }
      throw new Error(`Failed to fetch customers: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extract the actual data from the wrapped response
    // API returns: { success: true, data: [...], metadata: { total, page, limit } }
    let users: Array<{
      id: string;
      username: string;
      mobile: string;
      email: string | null;
      name: string | null;
      role: string;
      createdAt: string;
      updatedAt: string;
      deletedAt: string | null;
    }> = [];
    let total = 0;
    
    if (data && typeof data === 'object' && 'data' in data) {
      users = data.data || [];
      total = data.metadata?.total || data.data?.length || 0;
    } else if (Array.isArray(data)) {
      users = data;
      total = data.length;
    }
    
    // Map users to customers and filter by status if needed
    let customers = users.map(mapUserToCustomer);
    
    // Filter by status if specified
    if (params.status && params.status !== 'all') {
      customers = customers.filter(c => c.status === params.status);
      // Recalculate total if filtering
      total = customers.length;
    }
    
    return {
      data: customers,
      total: total
    };
  } catch (error) {
    console.error('Get customers error:', error);
    throw error;
  }
}

export async function updateCustomerStatus(id: string, status: CustomerStatus): Promise<Customer> {
  try {
    const token = authService.getToken();
    
    // For now, we'll update the user's deletedAt field based on status
    // If status is 'active', set deletedAt to null
    // If status is 'inactive' or 'blocked', we might need a different approach
    // This depends on backend implementation
    
    const updateData: UpdateCustomerDto = { status };
    
    const response = await fetch(`${API_BASE_URL}/api/v1/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to update customer: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();
    
    // Extract the actual data from the wrapped response
    const user = responseData.data || responseData;
    return mapUserToCustomer(user);
  } catch (error) {
    console.error('Update customer error:', error);
    throw error;
  }
}

export async function createUser(userData: CreateUserDto): Promise<Customer> {
  try {
    const token = authService.getToken();
    
    // Backend automatically sets role to CUSTOMER, so we don't include it in the payload
    // The CreateUserDto type doesn't include role, so we can send userData directly
    
    const response = await fetch(`${API_BASE_URL}/api/v1/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // If backend returns validation errors array, include them in the error message
      const errorMessage = errorData.message || `Failed to create user: ${response.status} ${response.statusText}`;
      const validationErrors = errorData.errors;
      if (Array.isArray(validationErrors) && validationErrors.length > 0) {
        throw new Error(`${errorMessage}: ${validationErrors.join(', ')}`);
      }
      throw new Error(errorMessage);
    }

    const responseData = await response.json();
    
    // Extract the actual data from the wrapped response
    const user = responseData.data || responseData;
    return mapUserToCustomer(user);
  } catch (error) {
    console.error('Create user error:', error);
    throw error;
  }
}

export async function getCustomerById(id: string): Promise<Customer> {
  try {
    const token = authService.getToken();
    const response = await fetch(`${API_BASE_URL}/api/v1/users/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch customer: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extract the actual data from the wrapped response
    const user = data.data || data;
    return mapUserToCustomer(user);
  } catch (error) {
    console.error('Get customer by ID error:', error);
    throw error;
  }
}
