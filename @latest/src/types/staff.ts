export type StaffStatus = 'active' | 'inactive' | 'suspended' | 'terminated'

export type StaffRole = 'admin' | 'manager' | 'supervisor' | 'staff' | 'support'

export type Department = 'operations' | 'customer_service' | 'logistics' | 'sales' | 'hr' | 'finance' | 'tech'

export type Permission = 
  | 'view_orders'
  | 'edit_orders'
  | 'view_customers'
  | 'edit_customers'
  | 'view_products'
  | 'edit_products'
  | 'view_staff'
  | 'edit_staff'
  | 'view_reports'
  | 'manage_inventory'
  | 'manage_deliveries'
  | 'admin_access'

export type Staff = {
  id: string
  employeeId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: StaffRole
  department: Department
  status: StaffStatus
  permissions: Permission[]
  hireDate: string // ISO date
  lastLoginAt?: string // ISO date
  salary?: number
  address?: string
  emergencyContact?: {
    name: string
    phone: string
    relationship: string
  }
  profileImageUrl?: string
  notes?: string
  createdAt: string // ISO date
  updatedAt: string // ISO date
}

export type StaffsQuery = {
  page: number
  pageSize: number
  search?: string
  role?: StaffRole | 'all'
  department?: Department | 'all'
  status?: StaffStatus | 'all'
  startDate?: string
  endDate?: string
  sortBy?: keyof Staff
  sortOrder?: 'ascend' | 'descend'
}

export type StaffsResponse = {
  data: Staff[]
  total: number
}
