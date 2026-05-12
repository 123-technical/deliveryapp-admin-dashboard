export type UserRole = 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN' | 'DELIVERY_PERSONNEL'

export type User = {
  id: string
  username: string
  name: string | null
  email: string | null
  mobile: string
  role: UserRole
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export type UsersQuery = {
  page: number
  pageSize: number
  search?: string
  role?: UserRole | 'all'
  sortBy?: keyof User
  sortOrder?: 'ascend' | 'descend'
}

export type UsersResponse = {
  data: User[]
  metadata: {
    total: number
    page: number
    limit: number
  }
}
