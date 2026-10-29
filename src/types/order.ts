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
  | 'CASH' // paid at the store counter
  | 'CASH_ON_DELIVERY'
  | 'UPI'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'NET_BANKING'

/** ONLINE: placed in the app and delivered. COUNTER: rung up in the store from this dashboard. */
export type OrderChannel = 'ONLINE' | 'COUNTER'

export type CounterPaymentMethod = Extract<PaymentMethod, 'CASH' | 'UPI' | 'CREDIT_CARD' | 'DEBIT_CARD'>

export const COUNTER_PAYMENT_METHODS: { value: CounterPaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CREDIT_CARD', label: 'Credit card' },
  { value: 'DEBIT_CARD', label: 'Debit card' },
]

/** Matches the backend's CreateCounterOrderDto.notes limit. */
export const COUNTER_NOTES_MAX = 500

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
  deliveryFee?: string
  deliveryDistanceMeters?: number | null
  userId: string
  /** Null for counter sales. */
  deliveryAddressId: string | null
  deliverySlotId: string | null
  deliveryPersonnelId?: string | null
  notes: string | null
  status: OrderStatus
  paymentMethod?: PaymentMethod
  channel?: OrderChannel
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
  user?: { name: string | null; email?: string | null; phone?: string; mobile?: string; isSystem?: boolean }
  deliveryAddress?: { [key: string]: any } | null
  deliverySlot?: { [key: string]: any }
}

export type OrderWithItems = Order

/** First 8 characters of the order number, as printed on receipts (searchable on the Orders page). */
export const shortOrderNumber = (order: Pick<Order, 'id' | 'orderNumber'>) =>
  (order.orderNumber ?? order.id).slice(0, 8).toUpperCase()

/** POST /orders/counter. Prices come from the catalog; no mobile means the walk-in customer. */
export type CreateCounterOrderDto = {
  warehouseId: string
  paymentMethod: CounterPaymentMethod
  customerMobile?: string
  notes?: string
  orderItems: { productId: string; quantity: number }[]
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
  channel?: OrderChannel
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