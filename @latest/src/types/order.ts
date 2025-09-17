export type OrderStatus =
  | 'placed'
  | 'packed'
  | 'assigned'
  | 'picking'
  | 'delivering'
  | 'delivered'
  | 'cancelled'
  | 'refunded'

export type PaymentStatus = 'paid' | 'unpaid' | 'refunded'

export type Order = {
  id: string
  createdAt: string // ISO date string
  customerName: string
  contact: string
  itemsCount: number
  totalPrice: number
  status: OrderStatus
  paymentStatus: PaymentStatus
  riderName?: string
  etaMinutes?: number
  notes?: string
}

export type OrdersQuery = {
  page: number
  pageSize: number
  search?: string
  status?: OrderStatus | 'all'
  payment?: PaymentStatus | 'all'
  startDate?: string // ISO inclusive
  endDate?: string   // ISO inclusive
  sortBy?: keyof Order
  sortOrder?: 'ascend' | 'descend'
}

export type OrdersResponse = {
  data: Order[]
  total: number
} 