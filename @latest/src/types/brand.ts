export type Brand = {
  id: string
  name: string
  description: string | null
  logoUrl: string | null
  createdAt: string // ISO date string
  updatedAt: string // ISO date string
  deletedAt: string | null // ISO date string
}

export type CreateBrandDto = {
  name: string
  logoUrl?: string
  description?: string
}

export type UpdateBrandDto = Partial<CreateBrandDto>

export type BrandsQuery = {
  page: number
  pageSize: number
  search?: string
  sortBy?: keyof Brand
  sortOrder?: 'ascend' | 'descend'
}

export type BrandsResponse = {
  data: Brand[]
  total: number
}
