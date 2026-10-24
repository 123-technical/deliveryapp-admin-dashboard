export type OrderStatus = 
  | 'PENDING' // shown as "Order Placed"
  | 'PROCESSING'
  | 'PAID'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED'

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

export type OrderItem = {
  id?: string
  orderId?: string
  productId: string
  quantity: number
  priceAtPurchase: number | string // support backend string decimals
  // additional fields from GET response if present
  productName?: string
  productImageUrl?: string
}

export type Order = {
  id: string
  orderNumber?: string
  totalAmount?: string 
  discountAmount?: string 
  finalAmount?: string 
  userId: string
  deliveryAddressId: string
  deliverySlotId: string | null
  deliveryPersonnelId?: string | null
  notes: string | null
  status: OrderStatus
  /** Backend enum: CASH_ON_DELIVERY, UPI, CREDIT_CARD, DEBIT_CARD, NET_BANKING */
  paymentMethod?: string
  /** Online-payment orders hold stock until this time; null once paid. */
  stockHoldExpiresAt?: string | null
  warehouseId?: string | null
  cancelledAt?: string | null
  cancelledBy?: 'CUSTOMER' | 'STAFF' | 'SYSTEM' | null
  cancelReason?: string | null
  orderItems: OrderItem[]
  items?: OrderItem[] // fallback for existing UI
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  // nested objects if returned by GET /api/v1/orders/{id}:
  user?: { name: string; email: string; phone?: string }
  deliveryAddress?: { [key: string]: any }
  deliverySlot?: { [key: string]: any }
}

export type OrderWithItems = Order

export type CreateOrderDto = {
  userId: string
  deliveryAddressId: string
  deliverySlotId?: string
  notes?: string
  orderItems: {
    productId: string
    quantity: number
    priceAtPurchase: number
  }[]
}

export type UpdateOrderDto = {
  status?: OrderStatus
  notes?: string
  deliveryPersonnelId?: string
  /** With status CANCELLED */
  cancelReason?: string
}

export type OrdersQuery = {
  page: number
  pageSize: number
  search?: string
  status?: OrderStatus | 'all'
  userId?: string
  sortBy?: keyof Order
  sortOrder?: 'ascend' | 'descend'
  startDate?: string // ISO date string
  endDate?: string // ISO date string
}

export type OrdersResponse = {
  data: Order[]
  total: number
}