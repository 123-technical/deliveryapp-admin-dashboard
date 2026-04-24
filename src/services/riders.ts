import { faker } from '@faker-js/faker'
import dayjs from 'dayjs'
import type { Rider, RiderStatus, VehicleType, LicenseType, RidersQuery, RidersResponse } from '../types/rider'

const RIDER_STATUSES: RiderStatus[] = ['active', 'inactive', 'suspended', 'offline', 'busy']
const VEHICLE_TYPES: VehicleType[] = ['bicycle', 'motorcycle', 'car', 'van', 'truck']
const LICENSE_TYPES: LicenseType[] = ['A', 'B', 'C', 'D', 'E']

// In-memory mock dataset
const MOCK_RIDERS: Rider[] = Array.from({ length: 120 }).map(() => {
  const joinDate = dayjs().subtract(faker.number.int({ min: 0, max: 1095 }), 'day') // up to 3 years
  const lastActiveAt = faker.helpers.maybe(() => 
    dayjs().subtract(faker.number.int({ min: 0, max: 7 }), 'day').subtract(faker.number.int({ min: 0, max: 1440 }), 'minute'),
    { probability: 0.9 }
  )
  const vehicleType = faker.helpers.arrayElement(VEHICLE_TYPES)
  const licenseType = faker.helpers.arrayElement(LICENSE_TYPES)
  const status = faker.helpers.arrayElement(RIDER_STATUSES)
  
  return {
    id: faker.string.alphanumeric({ length: 8 }).toUpperCase(),
    riderId: `RDR${faker.string.numeric(6)}`,
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email(),
    phone: faker.phone.number(),
    status,
    vehicleType,
    licenseNumber: faker.string.alphanumeric({ length: 10 }).toUpperCase(),
    licenseType,
    licenseExpiry: dayjs().add(faker.number.int({ min: 30, max: 365 }), 'day').toISOString(),
    vehicleRegistration: faker.string.alphanumeric({ length: 8 }).toUpperCase(),
    vehicleModel: faker.vehicle.model(),
    vehicleYear: faker.number.int({ min: 2010, max: 2024 }),
    joinDate: joinDate.toISOString(),
    lastActiveAt: lastActiveAt?.toISOString(),
    currentLocation: faker.helpers.maybe(() => ({
      latitude: faker.location.latitude(),
      longitude: faker.location.longitude(),
      address: faker.location.streetAddress()
    }), { probability: 0.7 }),
    rating: faker.number.float({ min: 1, max: 5, fractionDigits: 1 }),
    totalDeliveries: faker.number.int({ min: 0, max: 1000 }),
    totalEarnings: faker.number.float({ min: 0, max: 50000, fractionDigits: 2 }),
    address: faker.location.streetAddress(),
    emergencyContact: faker.helpers.maybe(() => ({
      name: faker.person.fullName(),
      phone: faker.phone.number(),
      relationship: faker.helpers.arrayElement(['Spouse', 'Parent', 'Sibling', 'Friend', 'Other'])
    }), { probability: 0.8 }),
    profileImageUrl: faker.image.avatar(),
    notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }),
    bankAccount: faker.helpers.maybe(() => ({
      accountNumber: faker.finance.accountNumber(),
      bankName: faker.company.name(),
      accountHolderName: faker.person.fullName()
    }), { probability: 0.6 }),
    documents: faker.helpers.maybe(() => ({
      licenseImage: faker.image.url(),
      vehicleRegistrationImage: faker.image.url(),
      insuranceImage: faker.image.url(),
      profileImage: faker.image.avatar()
    }), { probability: 0.5 }),
    createdAt: joinDate.toISOString(),
    updatedAt: dayjs().subtract(faker.number.int({ min: 0, max: 30 }), 'day').toISOString(),
  }
})

export async function fetchRiders(params: RidersQuery): Promise<RidersResponse> {
  const {
    page,
    pageSize,
    search,
    status,
    vehicleType,
    licenseType,
    startDate,
    endDate,
    sortBy,
    sortOrder,
  } = params

  let rows = [...MOCK_RIDERS]

  if (search) {
    const s = search.toLowerCase()
    rows = rows.filter((r) =>
      r.firstName.toLowerCase().includes(s) ||
      r.lastName.toLowerCase().includes(s) ||
      r.email.toLowerCase().includes(s) ||
      r.riderId.toLowerCase().includes(s) ||
      r.phone.toLowerCase().includes(s) ||
      r.licenseNumber.toLowerCase().includes(s) ||
      r.vehicleRegistration.toLowerCase().includes(s)
    )
  }

  if (status && status !== 'all') rows = rows.filter((r) => r.status === status)
  if (vehicleType && vehicleType !== 'all') rows = rows.filter((r) => r.vehicleType === vehicleType)
  if (licenseType && licenseType !== 'all') rows = rows.filter((r) => r.licenseType === licenseType)
  if (startDate) rows = rows.filter((r) => dayjs(r.joinDate).isAfter(dayjs(startDate).subtract(1, 'ms')))
  if (endDate) rows = rows.filter((r) => dayjs(r.joinDate).isBefore(dayjs(endDate).add(1, 'day')))

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

export async function updateRider(id: string, partial: Partial<Rider>): Promise<Rider> {
  const idx = MOCK_RIDERS.findIndex((r) => r.id === id)
  if (idx === -1) throw new Error('Rider not found')
  await new Promise((res) => setTimeout(res, 300))
  const updated: Rider = { ...MOCK_RIDERS[idx], ...partial, updatedAt: new Date().toISOString() }
  MOCK_RIDERS[idx] = updated
  return updated
}

export async function createRider(payload: Omit<Rider, 'id' | 'createdAt' | 'updatedAt'>): Promise<Rider> {
  await new Promise((res) => setTimeout(res, 300))
  const rider: Rider = {
    ...payload,
    id: faker.string.alphanumeric({ length: 8 }).toUpperCase(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  MOCK_RIDERS.unshift(rider)
  return rider
}

export async function deleteRider(id: string): Promise<void> {
  const idx = MOCK_RIDERS.findIndex((r) => r.id === id)
  if (idx !== -1) MOCK_RIDERS.splice(idx, 1)
  await new Promise((res) => setTimeout(res, 200))
}

// Bulk helpers
export async function bulkUpdateStatus(ids: string[], status: RiderStatus): Promise<number> {
  await new Promise((res) => setTimeout(res, 300))
  let count = 0
  ids.forEach((id) => {
    const idx = MOCK_RIDERS.findIndex((r) => r.id === id)
    if (idx !== -1) {
      MOCK_RIDERS[idx].status = status
      MOCK_RIDERS[idx].updatedAt = new Date().toISOString()
      count++
    }
  })
  return count
}

export async function bulkAssignVehicleType(ids: string[], vehicleType: VehicleType): Promise<number> {
  await new Promise((res) => setTimeout(res, 300))
  let count = 0
  ids.forEach((id) => {
    const idx = MOCK_RIDERS.findIndex((r) => r.id === id)
    if (idx !== -1) {
      MOCK_RIDERS[idx].vehicleType = vehicleType
      MOCK_RIDERS[idx].updatedAt = new Date().toISOString()
      count++
    }
  })
  return count
}

export async function bulkDelete(ids: string[]): Promise<number> {
  await new Promise((res) => setTimeout(res, 300))
  const before = MOCK_RIDERS.length
  ids.forEach((id) => {
    const idx = MOCK_RIDERS.findIndex((r) => r.id === id)
    if (idx !== -1) MOCK_RIDERS.splice(idx, 1)
  })
  return before - MOCK_RIDERS.length
}

export function exportRidersToCsv(ids: string[]): string {
  const rows = MOCK_RIDERS.filter((r) => ids.includes(r.id))
  const header = [
    'ID','RiderID','FirstName','LastName','Email','Phone','Status','VehicleType','LicenseNumber','LicenseType','JoinDate','LastActive','Rating','TotalDeliveries','TotalEarnings'
  ]
  const csvRows = [header.join(',')]
  rows.forEach((r) => {
    csvRows.push([
      r.id,
      r.riderId,
      JSON.stringify(r.firstName),
      JSON.stringify(r.lastName),
      r.email,
      r.phone,
      r.status,
      r.vehicleType,
      r.licenseNumber,
      r.licenseType,
      r.joinDate,
      r.lastActiveAt || '',
      r.rating.toString(),
      r.totalDeliveries.toString(),
      r.totalEarnings.toString(),
    ].join(','))
  })
  return csvRows.join('\n')
}

export function listAllStatuses(): RiderStatus[] {
  return RIDER_STATUSES
}

export function listAllVehicleTypes(): VehicleType[] {
  return VEHICLE_TYPES
}

export function listAllLicenseTypes(): LicenseType[] {
  return LICENSE_TYPES
}
