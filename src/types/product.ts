export type ProductUnit = 'PIECE' | 'KG' | 'GRAM' | 'LITRE' | 'ML' | 'METER' | 'CM' | 'BOX' | 'PACK'

export type Product = {
  id: string
  name: string
  slug: string
  description: string
  price: string // Decimal as string for backend compatibility
  sku: string
  unit: ProductUnit
  imageKeys: string[]      // raw storage keys from backend
  imageUrls: string[]      // full Oracle Cloud URLs from backend
  isAvailable: boolean
  categoryId: string
  subCategoryId?: string   // optional — only if backend returns it
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
  imageKeys: string[]      // array of objectNames returned by uploadService.uploadFile()
  isAvailable?: boolean
  categoryId: string
  brandId?: string         // omit from payload entirely if not selected
}

export type UpdateProductDto = Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'imageKeys'>> & {
  imageKeys?: string[]     // objectNames to replace existing images
}
