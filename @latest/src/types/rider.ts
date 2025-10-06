export type RiderStatus = 'active' | 'inactive' | 'suspended' | 'offline' | 'busy'

export type VehicleType = 'bicycle' | 'motorcycle' | 'car' | 'van' | 'truck'

export type LicenseType = 'A' | 'B' | 'C' | 'D' | 'E' // Different license classes

export type Rider = {
  id: string
  riderId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  status: RiderStatus
  vehicleType: VehicleType
  licenseNumber: string
  licenseType: LicenseType
  licenseExpiry: string // ISO date
  vehicleRegistration: string
  vehicleModel: string
  vehicleYear: number
  joinDate: string // ISO date
  lastActiveAt?: string // ISO date
  currentLocation?: {
    latitude: number
    longitude: number
    address: string
  }
  rating: number // 1-5 stars
  totalDeliveries: number
  totalEarnings: number
  address: string
  emergencyContact?: {
    name: string
    phone: string
    relationship: string
  }
  profileImageUrl?: string
  notes?: string
  bankAccount?: {
    accountNumber: string
    bankName: string
    accountHolderName: string
  }
  documents?: {
    licenseImage?: string
    vehicleRegistrationImage?: string
    insuranceImage?: string
    profileImage?: string
  }
  createdAt: string // ISO date
  updatedAt: string // ISO date
}

export type RidersQuery = {
  page: number
  pageSize: number
  search?: string
  status?: RiderStatus | 'all'
  vehicleType?: VehicleType | 'all'
  licenseType?: LicenseType | 'all'
  startDate?: string
  endDate?: string
  sortBy?: keyof Rider
  sortOrder?: 'ascend' | 'descend'
}

export type RidersResponse = {
  data: Rider[]
  total: number
}
