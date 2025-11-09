export type UserRole = 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN' | 'RIDER' | 'STAFF'

export type CustomerStatus = 'active' | 'blocked' | 'inactive'

// Customer type matching backend User entity structure
export type Customer = {
  id: string
  username: string
  mobile: string
  email: string | null
  name: string | null
  role: UserRole
  createdAt: string // ISO date string
  updatedAt: string // ISO date string
  deletedAt: string | null // ISO date string
  // Computed fields for display
  status: CustomerStatus // Derived from deletedAt
}

export type CustomersQuery = {
  page: number
  pageSize: number
  search?: string
  status?: CustomerStatus | 'all'
  role?: UserRole
  startDate?: string
  endDate?: string
  sortBy?: keyof Customer
  sortOrder?: 'ascend' | 'descend'
}

export type CustomersResponse = {
  data: Customer[]
  total: number
}

export type CreateUserDto = {
  username: string
  mobile: string
  password: string
  email?: string
  name?: string
  // Note: role is not included - backend automatically sets it to CUSTOMER
}

export type UpdateCustomerDto = {
  status?: CustomerStatus
  // Add other updatable fields as needed
} 