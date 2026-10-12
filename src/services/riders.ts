import { fetchWithAuth } from "./auth";
import type { Rider, RidersQuery, RidersResponse } from '../types/rider';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export async function fetchRiders(params: RidersQuery): Promise<RidersResponse> {
  try {
    const queryParams = new URLSearchParams();

    queryParams.append('page', params.page.toString());
    queryParams.append('limit', params.pageSize.toString());

    if (params.search) queryParams.append('search', params.search);

    const filters: Record<string, unknown> = { role: 'DELIVERY_PERSONNEL' };
    if (params.createdAfter) {
      filters.createdAt = { gte: new Date(params.createdAfter).getTime() };
    }
    queryParams.append('filters', JSON.stringify(filters));

    if (params.sortBy) {
      queryParams.append('sort', JSON.stringify({ [params.sortBy]: params.sortOrder === 'descend' ? 'desc' : 'asc' }));
    }

    const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/users?${queryParams.toString()}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch riders');
    }

    const responseData = await response.json();
    return responseData; // Backend returns { success, code, message, data, metadata }
  } catch (error) {
    console.error('Error fetching riders:', error);
    throw error;
  }
}

export async function updateRider(id: string, partial: Partial<Rider>): Promise<Rider> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(partial),
    });

    if (!response.ok) {
      throw new Error('Failed to update rider');
    }

    const res = await response.json();
    return res.data;
  } catch (error) {
    console.error('Error updating rider:', error);
    throw error;
  }
}

export async function createRider(payload: Partial<Rider> & { password: string }): Promise<Rider> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/users`, {
      method: 'POST',
      body: JSON.stringify({ ...payload, role: 'DELIVERY_PERSONNEL' }),
    });

    if (!response.ok) {
      throw new Error('Failed to create rider');
    }

    const res = await response.json();
    return res.data;
  } catch (error) {
    console.error('Error creating rider:', error);
    throw error;
  }
}

export async function deleteRider(id: string): Promise<void> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/users/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete rider');
    }
  } catch (error) {
    console.error('Error deleting rider:', error);
    throw error;
  }
}

export async function getRiderById(id: string): Promise<Rider> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/users/${id}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch rider details');
    }

    const res = await response.json();
    return res.data;
  } catch (error) {
    console.error('Error fetching rider details:', error);
    throw error;
  }
}
