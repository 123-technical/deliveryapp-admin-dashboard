import { fetchWithAuth } from "./auth";
import type {
  AdjustStockDto,
  InventoryListQuery,
  InventoryListResponse,
  StockMovement,
  StockTotals,
  WarehouseStock,
} from "../types/inventory";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

/** Backend error that carries the envelope's `data` (e.g. `{ code: 'STOCK_CHANGED', quantity }`). */
export class InventoryApiError extends Error {
  code?: string;
  data?: Record<string, unknown>;
  status: number;

  constructor(message: string, status: number, data?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.data = data;
    this.code = typeof data?.code === 'string' ? data.code : undefined;
  }
}

type ListMetadata = { total?: number; page?: number; limit?: number; counts?: InventoryListResponse['counts'] };

async function request<T>(path: string, init?: RequestInit): Promise<{ data: T; metadata?: ListMetadata }> {
  const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/inventory${path}`, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new InventoryApiError(body.message || `Request failed (${response.status})`, response.status, body.data ?? undefined);
  }
  return { data: body.data as T, metadata: body.metadata };
}

class InventoryService {
  async list(query: InventoryListQuery): Promise<InventoryListResponse> {
    const params = new URLSearchParams({
      warehouseId: query.warehouseId,
      status: query.status,
      page: String(query.page),
      limit: String(query.pageSize),
    });
    if (query.search) params.set('search', query.search);
    const { data, metadata } = await request<InventoryListResponse['data']>(`?${params}`);
    return { data, total: metadata?.total ?? data.length, counts: metadata?.counts };
  }

  async productStock(productId: string): Promise<WarehouseStock[]> {
    return (await request<WarehouseStock[]>(`/products/${productId}`)).data;
  }

  async totals(productIds: string[]): Promise<StockTotals> {
    if (productIds.length === 0) return {};
    return (await request<StockTotals>(`/totals?productIds=${productIds.join(',')}`)).data;
  }

  async movements(params: { productId?: string; warehouseId?: string; page: number; pageSize: number }) {
    const qs = new URLSearchParams({ page: String(params.page), limit: String(params.pageSize) });
    if (params.productId) qs.set('productId', params.productId);
    if (params.warehouseId) qs.set('warehouseId', params.warehouseId);
    const { data, metadata } = await request<StockMovement[]>(`/movements?${qs}`);
    return { data, total: metadata?.total ?? data.length };
  }

  async adjust(dto: AdjustStockDto) {
    return (await request<{ quantity: number; reorderLevel: number }>(`/adjust`, {
      method: 'POST',
      body: JSON.stringify(dto),
    })).data;
  }
}

export const inventoryService = new InventoryService();
