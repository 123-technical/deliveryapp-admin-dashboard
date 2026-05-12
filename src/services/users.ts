import { authService } from "./auth";
import type { User, UsersQuery, UsersResponse, UserRole } from '../types/user';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export async function fetchStaffs(params: UsersQuery): Promise<UsersResponse> {
  try {
    const token = authService.getToken();
    const queryParams = new URLSearchParams();
    
    queryParams.append('page', params.page.toString());
    queryParams.append('limit', params.pageSize.toString());
    
    if (params.search) queryParams.append('search', params.search);
    if (params.role && params.role !== 'all') {
      queryParams.append('role', params.role);
    }
    if (params.sortBy) {
      queryParams.append('sort', JSON.stringify({ [params.sortBy]: params.sortOrder === 'descend' ? 'desc' : 'asc' }));
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/users?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
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

export async function updateStaff(id: string, partial: Partial<User>): Promise<User> {
  try {
    const token = authService.getToken();
    const response = await fetch(`${API_BASE_URL}/api/v1/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
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

export async function createStaff(payload: any): Promise<User> {
  try {
    const token = authService.getToken();
    const response = await fetch(`${API_BASE_URL}/api/v1/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
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

export async function deleteStaff(id: string): Promise<void> {
  try {
    const token = authService.getToken();
    const response = await fetch(`${API_BASE_URL}/api/v1/users/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
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
export async function getProfile(): Promise<User> {
  try {
    const token = authService.getToken();
    const response = await fetch(`${API_BASE_URL}/api/v1/users/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
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
  return ['CUSTOMER', 'ADMIN', 'SUPER_ADMIN', 'DELIVERY_PERSONNEL'];
}

export function listAllDepartments(): string[] {
  return []; // Backend doesn't seem to have departments in User model yet
}

export function listAllPermissions(): string[] {
  return []; // Backend doesn't seem to have separate permissions in User model yet
}

// Stub for bulk operations if needed, though backend might not support them yet
export async function bulkUpdateStatus(ids: string[], status: string): Promise<number> {
  console.warn('Bulk update not implemented on backend');
  return 0;
}

export async function bulkAssignRole(ids: string[], role: UserRole): Promise<number> {
  console.warn('Bulk assign role not implemented on backend');
  return 0;
}

export async function bulkAssignDepartment(ids: string[], department: string): Promise<number> {
  return 0;
}

export async function bulkDelete(ids: string[]): Promise<number> {
  return 0;
}

export function exportStaffsToCsv(ids: string[]): string {
  return '';
}
