import { faker } from '@faker-js/faker'
import dayjs from 'dayjs'
import type { Product, ProductStatus, ProductsQuery, ProductsResponse, StockStatus } from '../types/product'

const PRODUCT_STATUSES: ProductStatus[] = ['active', 'inactive', 'out_of_stock']
const STOCK_STATUSES: StockStatus[] = ['in_stock', 'low_stock', 'out_of_stock']

const CATEGORIES = [
  { category: 'Beverages', sub: ['Soda', 'Juice', 'Water'] },
  { category: 'Snacks', sub: ['Chips', 'Nuts', 'Cookies'] },
  { category: 'Dairy', sub: ['Milk', 'Cheese', 'Yogurt'] },
  { category: 'Bakery', sub: ['Bread', 'Pastries'] },
  { category: 'Produce', sub: ['Fruits', 'Vegetables'] },
]

function computeStockStatus(qty: number): StockStatus {
  if (qty <= 0) return 'out_of_stock'
  if (qty < 10) return 'low_stock'
  return 'in_stock'
}

// In-memory mock dataset
const MOCK_PRODUCTS: Product[] = Array.from({ length: 500 }).map(() => {
  const cat = faker.helpers.arrayElement(CATEGORIES)
  const sub = faker.helpers.arrayElement(cat.sub)
  const regularPrice = Number(faker.commerce.price({ min: 2, max: 200, dec: 2 }))
  const salePrice = faker.helpers.maybe(() => Number(faker.commerce.price({ min: 1, max: regularPrice, dec: 2 })), { probability: 0.4 })
  const stockQty = faker.number.int({ min: 0, max: 200 })
  const stockStatus = computeStockStatus(stockQty)
  const status: ProductStatus = stockStatus === 'out_of_stock' ? 'out_of_stock' : faker.helpers.arrayElement(PRODUCT_STATUSES)
  const modified = dayjs().subtract(faker.number.int({ min: 0, max: 30 }), 'day').subtract(faker.number.int({ min: 0, max: 1440 }), 'minute')
  const name = faker.commerce.productName()
  const sku = faker.string.alphanumeric({ length: 8 }).toUpperCase()
  return {
    id: faker.string.alphanumeric({ length: 8 }).toUpperCase(),
    name,
    sku,
    description: faker.commerce.productDescription(),
    brand: faker.company.name(),
    category: cat.category,
    subcategory: sub,
    tags: faker.helpers.arrayElements(['eco', 'new', 'bestseller', 'limited', 'imported'], { min: 0, max: 3 }),
    thumbnailUrl: faker.image.urlPicsumPhotos({ width: 80, height: 80 }),
    images: Array.from({ length: faker.number.int({ min: 1, max: 4 }) }).map(() => faker.image.urlPicsumPhotos({ width: 800, height: 800 })),
    regularPrice,
    salePrice: salePrice || undefined,
    pricingTiers: faker.helpers.maybe(() => [
      { minQty: 10, price: Number((regularPrice * 0.95).toFixed(2)) },
      { minQty: 50, price: Number((regularPrice * 0.9).toFixed(2)) },
    ], { probability: 0.3 }) || undefined,
    stockQty,
    stockStatus,
    status,
    weightKg: faker.number.float({ min: 0.1, max: 10, precision: 0.01 }),
    dimensionsCm: faker.helpers.maybe(() => ({ length: faker.number.int({ min: 5, max: 40 }), width: faker.number.int({ min: 5, max: 40 }), height: faker.number.int({ min: 5, max: 40 }) }), { probability: 0.3 }) || undefined,
    fragile: faker.datatype.boolean(),
    seoTitle: faker.commerce.productName(),
    seoDescription: faker.lorem.sentence(),
    barcode: faker.string.alphanumeric({ length: 12 }).toUpperCase(),
    supplier: faker.company.name(),
    vendor: faker.company.name(),
    rating: faker.number.float({ min: 2, max: 5, precision: 0.1 }),
    reviewsCount: faker.number.int({ min: 0, max: 5000 }),
    lastModifiedAt: modified.toISOString(),
  }
})

export async function fetchProducts(params: ProductsQuery): Promise<ProductsResponse> {
  const {
    page,
    pageSize,
    search,
    category,
    brand,
    status,
    stock,
    minPrice,
    maxPrice,
    startDate,
    endDate,
    sortBy,
    sortOrder,
  } = params

  let rows = [...MOCK_PRODUCTS]

  if (search) {
    const s = search.toLowerCase()
    rows = rows.filter((r) =>
      r.name.toLowerCase().includes(s) ||
      r.sku.toLowerCase().includes(s) ||
      r.category.toLowerCase().includes(s) ||
      (r.subcategory?.toLowerCase().includes(s) ?? false) ||
      (r.brand?.toLowerCase().includes(s) ?? false) ||
      (r.tags?.some((t) => t.toLowerCase().includes(s)) ?? false)
    )
  }

  if (category && category !== 'all') rows = rows.filter((r) => r.category === category)
  if (brand && brand !== 'all') rows = rows.filter((r) => r.brand === brand)
  if (status && status !== 'all') rows = rows.filter((r) => r.status === status)
  if (stock && stock !== 'all') rows = rows.filter((r) => r.stockStatus === stock)
  if (minPrice != null) rows = rows.filter((r) => (r.salePrice ?? r.regularPrice) >= minPrice)
  if (maxPrice != null) rows = rows.filter((r) => (r.salePrice ?? r.regularPrice) <= maxPrice)
  if (startDate) rows = rows.filter((r) => dayjs(r.lastModifiedAt).isAfter(dayjs(startDate).subtract(1, 'ms')))
  if (endDate) rows = rows.filter((r) => dayjs(r.lastModifiedAt).isBefore(dayjs(endDate).add(1, 'day')))

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

export async function updateProduct(id: string, partial: Partial<Product>): Promise<Product> {
  const idx = MOCK_PRODUCTS.findIndex((p) => p.id === id)
  if (idx === -1) throw new Error('Product not found')
  await new Promise((res) => setTimeout(res, 300))
  const updated: Product = { ...MOCK_PRODUCTS[idx], ...partial, lastModifiedAt: new Date().toISOString() }
  MOCK_PRODUCTS[idx] = updated
  return updated
}

export async function createProduct(payload: Omit<Product, 'id' | 'lastModifiedAt' | 'stockStatus'>): Promise<Product> {
  await new Promise((res) => setTimeout(res, 300))
  const stockStatus = computeStockStatus(payload.stockQty)
  const product: Product = {
    ...payload,
    id: faker.string.alphanumeric({ length: 8 }).toUpperCase(),
    stockStatus,
    lastModifiedAt: new Date().toISOString(),
  }
  MOCK_PRODUCTS.unshift(product)
  return product
}

export async function deleteProduct(id: string): Promise<void> {
  const idx = MOCK_PRODUCTS.findIndex((p) => p.id === id)
  if (idx !== -1) MOCK_PRODUCTS.splice(idx, 1)
  await new Promise((res) => setTimeout(res, 200))
}

// Bulk helpers
export async function bulkUpdateStatus(ids: string[], status: ProductStatus): Promise<number> {
  await new Promise((res) => setTimeout(res, 300))
  let count = 0
  ids.forEach((id) => {
    const idx = MOCK_PRODUCTS.findIndex((p) => p.id === id)
    if (idx !== -1) {
      MOCK_PRODUCTS[idx].status = status
      MOCK_PRODUCTS[idx].lastModifiedAt = new Date().toISOString()
      count++
    }
  })
  return count
}

export async function bulkAssignCategory(ids: string[], category: string, subcategory?: string): Promise<number> {
  await new Promise((res) => setTimeout(res, 300))
  let count = 0
  ids.forEach((id) => {
    const idx = MOCK_PRODUCTS.findIndex((p) => p.id === id)
    if (idx !== -1) {
      MOCK_PRODUCTS[idx].category = category
      MOCK_PRODUCTS[idx].subcategory = subcategory
      MOCK_PRODUCTS[idx].lastModifiedAt = new Date().toISOString()
      count++
    }
  })
  return count
}

export async function bulkEditPricing(ids: string[], deltaPercent: number): Promise<number> {
  await new Promise((res) => setTimeout(res, 300))
  let count = 0
  ids.forEach((id) => {
    const idx = MOCK_PRODUCTS.findIndex((p) => p.id === id)
    if (idx !== -1) {
      const p = MOCK_PRODUCTS[idx]
      p.regularPrice = Number((p.regularPrice * (1 + deltaPercent / 100)).toFixed(2))
      if (p.salePrice) p.salePrice = Number((p.salePrice * (1 + deltaPercent / 100)).toFixed(2))
      p.lastModifiedAt = new Date().toISOString()
      count++
    }
  })
  return count
}

export async function bulkDelete(ids: string[]): Promise<number> {
  await new Promise((res) => setTimeout(res, 300))
  const before = MOCK_PRODUCTS.length
  ids.forEach((id) => {
    const idx = MOCK_PRODUCTS.findIndex((p) => p.id === id)
    if (idx !== -1) MOCK_PRODUCTS.splice(idx, 1)
  })
  return before - MOCK_PRODUCTS.length
}

export function exportProductsToCsv(ids: string[]): string {
  const rows = MOCK_PRODUCTS.filter((p) => ids.includes(p.id))
  const header = [
    'ID','Name','SKU','Category','Subcategory','Brand','Price','SalePrice','StockQty','Status','StockStatus','LastModified'
  ]
  const csvRows = [header.join(',')]
  rows.forEach((p) => {
    csvRows.push([
      p.id,
      JSON.stringify(p.name),
      p.sku,
      JSON.stringify(p.category),
      JSON.stringify(p.subcategory ?? ''),
      JSON.stringify(p.brand ?? ''),
      String(p.regularPrice),
      String(p.salePrice ?? ''),
      String(p.stockQty),
      p.status,
      p.stockStatus,
      p.lastModifiedAt,
    ].join(','))
  })
  return csvRows.join('\n')
}

export function listAllCategories(): { category: string; subcategory?: string }[] {
  const set = new Set<string>()
  const scoped: { category: string; subcategory?: string }[] = []
  for (const p of MOCK_PRODUCTS) {
    const key = `${p.category}::${p.subcategory ?? ''}`
    if (!set.has(key)) {
      set.add(key)
      scoped.push({ category: p.category, subcategory: p.subcategory })
    }
  }
  return scoped
}

export function listAllBrands(): string[] {
  return Array.from(new Set(MOCK_PRODUCTS.map((p) => p.brand).filter(Boolean) as string[])).sort()
}

