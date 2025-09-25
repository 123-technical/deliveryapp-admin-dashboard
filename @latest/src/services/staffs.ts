import { faker } from '@faker-js/faker'
import dayjs from 'dayjs'
import type { Staff, StaffStatus, StaffRole, Department, Permission, StaffsQuery, StaffsResponse } from '../types/staff'

const STAFF_STATUSES: StaffStatus[] = ['active', 'inactive', 'suspended', 'terminated']
const STAFF_ROLES: StaffRole[] = ['admin', 'manager', 'supervisor', 'staff', 'support']
const DEPARTMENTS: Department[] = ['operations', 'customer_service', 'logistics', 'sales', 'hr', 'finance', 'tech']

const ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  admin: ['admin_access'],
  manager: ['view_orders', 'edit_orders', 'view_customers', 'edit_customers', 'view_products', 'edit_products', 'view_staff', 'view_reports', 'manage_inventory', 'manage_deliveries'],
  supervisor: ['view_orders', 'edit_orders', 'view_customers', 'view_products', 'view_staff', 'manage_deliveries'],
  staff: ['view_orders', 'view_customers', 'view_products'],
  support: ['view_orders', 'view_customers', 'view_products']
}

// In-memory mock dataset
const MOCK_STAFF: Staff[] = Array.from({ length: 150 }).map(() => {
  const hireDate = dayjs().subtract(faker.number.int({ min: 0, max: 1095 }), 'day') // up to 3 years
  const lastLoginAt = faker.helpers.maybe(() => 
    dayjs().subtract(faker.number.int({ min: 0, max: 30 }), 'day').subtract(faker.number.int({ min: 0, max: 1440 }), 'minute'),
    { probability: 0.8 }
  )
  const role = faker.helpers.arrayElement(STAFF_ROLES)
  const department = faker.helpers.arrayElement(DEPARTMENTS)
  const status = faker.helpers.arrayElement(STAFF_STATUSES)
  
  return {
    id: faker.string.alphanumeric({ length: 8 }).toUpperCase(),
    employeeId: `EMP${faker.string.numeric(6)}`,
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email(),
    phone: faker.phone.number(),
    role,
    department,
    status,
    permissions: ROLE_PERMISSIONS[role],
    hireDate: hireDate.toISOString(),
    lastLoginAt: lastLoginAt?.toISOString(),
    salary: faker.helpers.maybe(() => faker.number.int({ min: 30000, max: 120000 }), { probability: 0.7 }),
    address: faker.location.streetAddress(),
    emergencyContact: faker.helpers.maybe(() => ({
      name: faker.person.fullName(),
      phone: faker.phone.number(),
      relationship: faker.helpers.arrayElement(['Spouse', 'Parent', 'Sibling', 'Friend', 'Other'])
    }), { probability: 0.6 }),
    profileImageUrl: faker.image.avatar(),
    notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }),
    createdAt: hireDate.toISOString(),
    updatedAt: dayjs().subtract(faker.number.int({ min: 0, max: 30 }), 'day').toISOString(),
  }
})

export async function fetchStaffs(params: StaffsQuery): Promise<StaffsResponse> {
  const {
    page,
    pageSize,
    search,
    role,
    department,
    status,
    startDate,
    endDate,
    sortBy,
    sortOrder,
  } = params

  let rows = [...MOCK_STAFF]

  if (search) {
    const s = search.toLowerCase()
    rows = rows.filter((r) =>
      r.firstName.toLowerCase().includes(s) ||
      r.lastName.toLowerCase().includes(s) ||
      r.email.toLowerCase().includes(s) ||
      r.employeeId.toLowerCase().includes(s) ||
      r.phone.toLowerCase().includes(s)
    )
  }

  if (role && role !== 'all') rows = rows.filter((r) => r.role === role)
  if (department && department !== 'all') rows = rows.filter((r) => r.department === department)
  if (status && status !== 'all') rows = rows.filter((r) => r.status === status)
  if (startDate) rows = rows.filter((r) => dayjs(r.hireDate).isAfter(dayjs(startDate).subtract(1, 'ms')))
  if (endDate) rows = rows.filter((r) => dayjs(r.hireDate).isBefore(dayjs(endDate).add(1, 'day')))

  if (sortBy) {
    rows.sort((a, b) => {
      const av = a[sortBy]
      const bv = b[sortBy]
      let cmp = 0
      if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv
      else cmp = String(av).localeCompare(String(bv))
      return sortOrder === 'descend' ? -cmp : cmp
    })
  }

  const total = rows.length
  const start = (page - 1) * pageSize
  const paged = rows.slice(start, start + pageSize)

  await new Promise((res) => setTimeout(res, 300))

  return { data: paged, total }
}

export async function updateStaff(id: string, partial: Partial<Staff>): Promise<Staff> {
  const idx = MOCK_STAFF.findIndex((s) => s.id === id)
  if (idx === -1) throw new Error('Staff not found')
  await new Promise((res) => setTimeout(res, 300))
  const updated: Staff = { ...MOCK_STAFF[idx], ...partial, updatedAt: new Date().toISOString() }
  MOCK_STAFF[idx] = updated
  return updated
}

export async function createStaff(payload: Omit<Staff, 'id' | 'createdAt' | 'updatedAt'>): Promise<Staff> {
  await new Promise((res) => setTimeout(res, 300))
  const staff: Staff = {
    ...payload,
    id: faker.string.alphanumeric({ length: 8 }).toUpperCase(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  MOCK_STAFF.unshift(staff)
  return staff
}

export async function deleteStaff(id: string): Promise<void> {
  const idx = MOCK_STAFF.findIndex((s) => s.id === id)
  if (idx !== -1) MOCK_STAFF.splice(idx, 1)
  await new Promise((res) => setTimeout(res, 200))
}

// Bulk helpers
export async function bulkUpdateStatus(ids: string[], status: StaffStatus): Promise<number> {
  await new Promise((res) => setTimeout(res, 300))
  let count = 0
  ids.forEach((id) => {
    const idx = MOCK_STAFF.findIndex((s) => s.id === id)
    if (idx !== -1) {
      MOCK_STAFF[idx].status = status
      MOCK_STAFF[idx].updatedAt = new Date().toISOString()
      count++
    }
  })
  return count
}

export async function bulkAssignRole(ids: string[], role: StaffRole): Promise<number> {
  await new Promise((res) => setTimeout(res, 300))
  let count = 0
  ids.forEach((id) => {
    const idx = MOCK_STAFF.findIndex((s) => s.id === id)
    if (idx !== -1) {
      MOCK_STAFF[idx].role = role
      MOCK_STAFF[idx].permissions = ROLE_PERMISSIONS[role]
      MOCK_STAFF[idx].updatedAt = new Date().toISOString()
      count++
    }
  })
  return count
}

export async function bulkAssignDepartment(ids: string[], department: Department): Promise<number> {
  await new Promise((res) => setTimeout(res, 300))
  let count = 0
  ids.forEach((id) => {
    const idx = MOCK_STAFF.findIndex((s) => s.id === id)
    if (idx !== -1) {
      MOCK_STAFF[idx].department = department
      MOCK_STAFF[idx].updatedAt = new Date().toISOString()
      count++
    }
  })
  return count
}

export async function bulkDelete(ids: string[]): Promise<number> {
  await new Promise((res) => setTimeout(res, 300))
  const before = MOCK_STAFF.length
  ids.forEach((id) => {
    const idx = MOCK_STAFF.findIndex((s) => s.id === id)
    if (idx !== -1) MOCK_STAFF.splice(idx, 1)
  })
  return before - MOCK_STAFF.length
}

export function exportStaffsToCsv(ids: string[]): string {
  const rows = MOCK_STAFF.filter((s) => ids.includes(s.id))
  const header = [
    'ID','EmployeeID','FirstName','LastName','Email','Phone','Role','Department','Status','HireDate','LastLogin'
  ]
  const csvRows = [header.join(',')]
  rows.forEach((s) => {
    csvRows.push([
      s.id,
      s.employeeId,
      JSON.stringify(s.firstName),
      JSON.stringify(s.lastName),
      s.email,
      s.phone,
      s.role,
      s.department,
      s.status,
      s.hireDate,
      s.lastLoginAt || '',
    ].join(','))
  })
  return csvRows.join('\n')
}

export function listAllRoles(): StaffRole[] {
  return STAFF_ROLES
}

export function listAllDepartments(): Department[] {
  return DEPARTMENTS
}

export function listAllPermissions(): Permission[] {
  return [
    'view_orders', 'edit_orders', 'view_customers', 'edit_customers',
    'view_products', 'edit_products', 'view_staff', 'edit_staff',
    'view_reports', 'manage_inventory', 'manage_deliveries', 'admin_access'
  ]
}
