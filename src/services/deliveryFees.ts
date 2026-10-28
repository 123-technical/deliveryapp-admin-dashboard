import { fetchWithAuth } from "./auth";
import type { DeliveryFeeSettings } from "../types/deliveryFee";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

async function unwrap<T>(response: Response, fallback: string): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = Array.isArray(body.errors) && body.errors.length ? `: ${body.errors.join(', ')}` : '';
    throw new Error((body.message || fallback) + details);
  }
  return body.data as T;
}

class DeliveryFeeService {
  async getSettings(): Promise<DeliveryFeeSettings> {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/delivery-fees/settings`, { method: 'GET' });
    return unwrap(response, 'Failed to load delivery fees');
  }

  async updateSettings(settings: Pick<DeliveryFeeSettings, 'tiers' | 'beyondFee'>): Promise<DeliveryFeeSettings> {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/delivery-fees/settings`, {
      method: 'PUT',
      body: JSON.stringify({ tiers: settings.tiers, beyondFee: settings.beyondFee }),
    });
    return unwrap(response, 'Failed to save delivery fees');
  }
}

export const deliveryFeeService = new DeliveryFeeService();
