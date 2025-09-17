import { faker } from '@faker-js/faker'
import dayjs from 'dayjs'
import type { Order, OrderStatus, OrdersQuery, OrdersResponse, PaymentStatus } from '../types/order'

// In-memory mock dataset
const STATUSES: OrderStatus[] = ['placed', 'packed', 'assigned', 'picking', 'delivering', 'delivered', 'cancelled', 'refunded']
const PAYMENTS: PaymentStatus[] = ['paid', 'unpaid', 'refunded']

const MOCK_DATA: Order[] = Array.from({ length: 350 }).map(() => {
  const createdAt = dayjs().subtract(faker.number.int({ min: 0, max: 30 }), 'day').subtract(faker.number.int({ min: 0, max: 1440 }), 'minute')
  const status = faker.helpers.arrayElement(STATUSES)
  const paymentStatus = faker.helpers.arrayElement(PAYMENTS)
  const itemsCount = faker.number.int({ min: 1, max: 8 })
  const totalPrice = Number(faker.commerce.price({ min: 5, max: 120, dec: 2 }))
  const withRider = ['assigned', 'picking', 'delivering', 'delivered'].includes(status)

  return {
    id: faker.string.alphanumeric({ length: 8 }).toUpperCase(),
    createdAt: createdAt.toISOString(),
    customerName: faker.person.fullName(),
    contact: faker.phone.number(),
    itemsCount,
    totalPrice,
    status,
    paymentStatus,
    riderName: withRider ? faker.person.firstName() : undefined,
    etaMinutes: withRider ? faker.number.int({ min: 5, max: 60 }) : undefined,
    notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.2 }) || undefined,
  }
})

export async function fetchOrders(params: OrdersQuery): Promise<OrdersResponse> {
  const {
    page,
    pageSize,
    search,
    status,
    payment,
    startDate,
    endDate,
    sortBy,
    sortOrder,
  } = params

  let rows = [...MOCK_DATA]

  if (search) {
    const s = search.toLowerCase()
    rows = rows.filter((r) =>
      r.id.toLowerCase().includes(s) ||
      r.customerName.toLowerCase().includes(s) ||
      r.contact.toLowerCase().includes(s)
    )
  }

  if (status && status !== 'all') {
    rows = rows.filter((r) => r.status === status)
  }
  if (payment && payment !== 'all') {
    rows = rows.filter((r) => r.paymentStatus === payment)
  }
  if (startDate) {
    const start = dayjs(startDate)
    rows = rows.filter((r) => dayjs(r.createdAt).isAfter(start.subtract(1, 'ms')))
  }
  if (endDate) {
    const end = dayjs(endDate)
    rows = rows.filter((r) => dayjs(r.createdAt).isBefore(end.add(1, 'day')))
  }

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

  // Simulate latency
  await new Promise((res) => setTimeout(res, 300))

  return { data: paged, total }
} 