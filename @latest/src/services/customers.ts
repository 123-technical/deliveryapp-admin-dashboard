import { faker } from '@faker-js/faker'
import dayjs from 'dayjs'
import type { Customer, CustomerStatus, CustomersQuery, CustomersResponse } from '../types/customer'

const STATUSES: CustomerStatus[] = ['active', 'blocked', 'inactive']

const MOCK_CUSTOMERS: Customer[] = Array.from({ length: 420 }).map(() => {
  const registrationDate = dayjs().subtract(faker.number.int({ min: 0, max: 365 }), 'day')
  const totalOrders = faker.number.int({ min: 0, max: 120 })
  const totalSpent = Number(faker.commerce.price({ min: 0, max: 3000, dec: 2 }))
  const lastOrderAt = totalOrders > 0 ? registrationDate.add(faker.number.int({ min: 1, max: 365 }), 'day') : undefined
  return {
    id: faker.string.alphanumeric({ length: 8 }).toUpperCase(),
    fullName: faker.person.fullName(),
    email: faker.internet.email(),
    phone: faker.phone.number(),
    location: `${faker.location.city()}, ${faker.location.country()}`,
    registrationDate: registrationDate.toISOString(),
    totalOrders,
    totalSpent,
    lastOrderAt: lastOrderAt?.toISOString(),
    status: faker.helpers.arrayElement(STATUSES),
  }
})

export async function fetchCustomers(params: CustomersQuery): Promise<CustomersResponse> {
  const { page, pageSize, search, status, startDate, endDate, sortBy, sortOrder } = params

  let rows = [...MOCK_CUSTOMERS]

  if (search) {
    const s = search.toLowerCase()
    rows = rows.filter((r) =>
      r.id.toLowerCase().includes(s) ||
      r.fullName.toLowerCase().includes(s) ||
      r.email.toLowerCase().includes(s) ||
      r.phone.toLowerCase().includes(s) ||
      r.location.toLowerCase().includes(s)
    )
  }

  if (status && status !== 'all') rows = rows.filter((r) => r.status === status)
  if (startDate) rows = rows.filter((r) => dayjs(r.registrationDate).isAfter(dayjs(startDate).subtract(1, 'ms')))
  if (endDate) rows = rows.filter((r) => dayjs(r.registrationDate).isBefore(dayjs(endDate).add(1, 'day')))

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

export async function updateCustomerStatus(id: string, status: CustomerStatus): Promise<Customer> {
  const idx = MOCK_CUSTOMERS.findIndex((c) => c.id === id)
  if (idx === -1) throw new Error('Customer not found')
  // simulate server latency
  await new Promise((res) => setTimeout(res, 400))
  MOCK_CUSTOMERS[idx] = { ...MOCK_CUSTOMERS[idx], status }
  return MOCK_CUSTOMERS[idx]
} 