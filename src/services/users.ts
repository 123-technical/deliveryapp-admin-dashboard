import { fetchWithAuth } from "./auth";
import type { User, UsersQuery, UsersResponse, UserRole } from '../types/user';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export async function fetchUsers(params: UsersQuery): Promise<UsersResponse> {
  try {
    const queryParams = new URLSearchParams();

    queryParams.append('page', params.page.toString());
    queryParams.append('limit', params.pageSize.toString());

    if (params.search) queryParams.append('search', params.search);

    // Staff page: scope to non-customer roles by default, or a single role when filtered
    const roleFilter = params.role && params.role !== 'all'
      ? { role: params.role }
      : { role: { not: 'CUSTOMER' } };
    queryParams.append('filters', JSON.stringify(roleFilter));

    if (params.sortBy) {
      queryParams.append('sort', JSON.stringify({ [params.sortBy]: params.sortOrder === 'descend' ? 'desc' : 'asc' }));
    }

    const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/users?${queryParams.toString()}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }

    const responseData = await response.json();
    return responseData; // Backend returns { success, code, message, data, metadata }
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

export async function updateUser(id: string, partial: Partial<User>): Promise<User> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(partial),
    });

    if (!response.ok) {
      throw new Error('Failed to update user');
    }

    const res = await response.json();
    return res.data;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

export async function createUser(payload: any): Promise<User> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/users`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Failed to create user');
    }

    const res = await response.json();
    return res.data;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

export async function deleteUser(id: string): Promise<void> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/users/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete user');
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

// Keep helper functions for UI consistency even if not yet fully implemented on backend
export async function getUserById(id: string): Promise<User> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/users/${id}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user details');
    }

    const res = await response.json();
    return res.data;
  } catch (error) {
    console.error('Error fetching user details:', error);
    throw error;
  }
}

export async function getProfile(): Promise<User> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/users/profile`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch profile');
    }

    const res = await response.json();
    return res.data;
  } catch (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }
}

export function listAllRoles(): UserRole[] {
  return ['ADMIN', 'SUPER_ADMIN', 'SUPPORT_STAFF', 'DELIVERY_PERSONNEL'];
}
