export type ProductStatus = 'active' | 'inactive' | 'out_of_stock'

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock'

export type PricingTier = {
  minQty: number
  price: number
}

export type Product = {
  id: string
  name: string
  sku: string
  description?: string
  brand?: string
  category: string
  subcategory?: string
  tags?: string[]
  thumbnailUrl?: string
  images?: string[]
  regularPrice: number
  salePrice?: number
  pricingTiers?: PricingTier[]
  stockQty: number
  stockStatus: StockStatus
  status: ProductStatus
  weightKg?: number
  dimensionsCm?: { length: number; width: number; height: number }
  fragile?: boolean
  seoTitle?: string
  seoDescription?: string
  barcode?: string
  supplier?: string
  vendor?: string
  rating?: number
  reviewsCount?: number
  lastModifiedAt: string // ISO date
}

export type ProductsQuery = {
  page: number
  pageSize: number
  search?: string
  category?: string | 'all'
  brand?: string | 'all'
  status?: ProductStatus | 'all'
  stock?: StockStatus | 'all'
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

