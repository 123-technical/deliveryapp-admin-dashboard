export type CustomerStatus = 'active' | 'blocked' | 'inactive'

export type Customer = {
  id: string
  fullName: string
  email: string
  phone: string
  location: string
  registrationDate: string // ISO date
  totalOrders: number
  totalSpent: number
  lastOrderAt?: string // ISO date
  status: CustomerStatus
}

export type CustomersQuery = {
  page: number
  pageSize: number
  search?: string
  status?: CustomerStatus | 'all'
  startDate?: string
  endDate?: string
  sortBy?: keyof Customer
  sortOrder?: 'ascend' | 'descend'
}

export type CustomersResponse = {
  data: Customer[]
  total: number
} 