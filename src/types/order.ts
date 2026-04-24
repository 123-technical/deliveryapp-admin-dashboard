export type OrderStatus = 
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED'

export type PaymentStatus = 
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED'

export type PaymentMethod = 
  | 'CASH'
  | 'CARD'
  | 'UPI'
  | 'NET_BANKING'

export type Order = {
  id: string
  orderNumber: string
  totalAmount: string // Decimal as string for backend compatibility
  discountAmount: string // Decimal as string for backend compatibility
  finalAmount: string // Decimal as string for backend compatibility
  status: OrderStatus
  userId: string
  createdAt: string // ISO date string
  updatedAt: string // ISO date string
  deletedAt: string | null // ISO date string
  notes: string | null
  deliveryAddressId: string
  deliverySlotId: string | null
  deliveryPersonnelId: string | null
}

export type OrderItem = {
  id: string
  quantity: number
  priceAtPurchase: string // Decimal as string for backend compatibility
  orderId: string
  productId: string
}

export type OrderWithItems = Order & {
  items: OrderItem[]
}

export type CreateOrderDto = {
  userId: string
  deliveryAddressId: string
  deliverySlotId?: string
  notes?: string
  orderItems: OrderItemDto[]
}

export type OrderItemDto = {
  productId: string
  quantity: number
  priceAtPurchase: number
}

export type UpdateOrderDto = {
  status?: OrderStatus
  notes?: string
  deliveryPersonnelId?: string
}

export type OrdersQuery = {
  page: number
  pageSize: number
  search?: string
  status?: OrderStatus
  userId?: string
  sortBy?: keyof Order
  sortOrder?: 'ascend' | 'descend'
  startDate?: string // ISO date string
  endDate?: string // ISO date string
}

export type OrdersResponse = {
  data: OrderWithItems[]
  total: number
}