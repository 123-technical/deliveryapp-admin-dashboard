import type { Order } from './order'

export type UserRole = 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN' | 'RIDER' | 'STAFF'

export type CustomerStatus = 'active' | 'blocked' | 'inactive'

export type AddressType = 'HOME' | 'WORK' | 'OTHER'

export type Address = {
  id: string
  street: string
  city: string
  state: string
  postalCode: string
  country: string
  addressType: AddressType
  isDefault: boolean
  userId: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

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
  // Optional relations, present when the API includes them (e.g. customer detail view)
  addresses?: Address[]
  orders?: Order[]
  // Present on the list view when the API includes relation counts
  _count?: { orders: number }
}

export type CustomersQuery = {
  page: number
  pageSize: number
  search?: string
  status?: CustomerStatus | 'all'
  role?: UserRole
  /** Exact mobile match */
  mobile?: string
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