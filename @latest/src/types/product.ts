export type ProductUnit = 'PIECE' | 'KG' | 'GRAM' | 'LITER' | 'ML' | 'METER' | 'CM' | 'BOX' | 'PACK'

export type Product = {
  id: string
  name: string
  slug: string
  description: string
  price: string // Decimal as string for backend compatibility
  sku: string
  unit: ProductUnit
  imageUrl: string | null
  isAvailable: boolean
  categoryId: string
  subCategoryId: string
  brandId: string | null
  createdAt: string // ISO date string
  updatedAt: string // ISO date string
  deletedAt: string | null // ISO date string
}

export type ProductsQuery = {
  page: number
  pageSize: number
  search?: string
  categoryId?: string | 'all'
  subCategoryId?: string | 'all'
  brandId?: string | 'all'
  isAvailable?: boolean | 'all'
  minPrice?: number
  maxPrice?: number
  startDate?: string
  endDate?: string
  sortBy?: keyof Product
  sortOrder?: 'ascend' | 'descend'
}

export type ProductsResponse = {
  data: Product[]
  total: number
}

export type CreateProductDto = {
  name: string
  slug: string
  description: string
  price: string // Decimal as string for backend compatibility
  sku: string
  unit: ProductUnit
  imageUrl?: string
  isAvailable?: boolean
  categoryId: string
  brandId?: string // Optional field
}

export type UpdateProductDto = Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>>

