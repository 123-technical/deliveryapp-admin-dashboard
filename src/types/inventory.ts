export type StockStatus = 'all' | 'in' | 'low' | 'out'

export type InventoryRow = {
  productId: string
  name: string
  sku: string
  unit: string
  price: string
  isAvailable: boolean
  imageUrl: string | null
  quantity: number
  reorderLevel: number
  stockUpdatedAt: string | null
}

export type InventoryCounts = Record<StockStatus, number>

export type InventoryListResponse = {
  data: InventoryRow[]
  total: number
  counts?: InventoryCounts
}

export type InventoryListQuery = {
  warehouseId: string
  status: StockStatus
  search?: string
  page: number
  pageSize: number
}

export type WarehouseStock = {
  warehouseId: string
  warehouseName: string
  quantity: number
  reorderLevel: number
  stockUpdatedAt: string | null
}

export type StockTotals = Record<string, { total: number; lowIn: number; outIn: number }>

/** RESTOCK adds, ADJUSTMENT applies a signed delta, STOCK_COUNT sets an exact count. */
export type ManualStockReason = 'RESTOCK' | 'ADJUSTMENT' | 'STOCK_COUNT'

export type MovementReason = ManualStockReason | 'ORDER_PLACED' | 'ORDER_CANCELLED'

export type AdjustStockDto = {
  productId: string
  warehouseId: string
  reason?: ManualStockReason
  delta?: number
  quantity?: number
  /** What the admin was looking at; the server refuses if stock moved since. */
  expectedQuantity?: number
  reorderLevel?: number
  note?: string
}

export type StockMovement = {
  id: string
  productId: string
  warehouseId: string
  delta: number
  quantityAfter: number
  reason: MovementReason
  orderId: string | null
  orderNumber: string | null
  userId: string | null
  userName: string | null
  note: string | null
  productName: string
  warehouseName: string
  createdAt: string
}
