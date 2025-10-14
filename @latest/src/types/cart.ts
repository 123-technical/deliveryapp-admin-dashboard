export type Cart = {
  id: string
  userId: string
  createdAt: string // ISO date string
  updatedAt: string // ISO date string
  deletedAt: string | null // ISO date string
}

export type CartItem = {
  id: string
  quantity: number
  cartId: string
  productId: string
  createdAt: string // ISO date string
  updatedAt: string // ISO date string
  deletedAt: string | null // ISO date string
}

export type CreateCartDto = {
  userId: string
}

export type AddCartItemDto = {
  productId: string
  quantity: number
}

export type UpdateCartItemDto = {
  quantity: number
}

export type CartWithItems = Cart & {
  items: CartItem[]
}

export type CartsQuery = {
  page: number
  pageSize: number
  search?: string
  userId?: string
  sortBy?: keyof Cart
  sortOrder?: 'ascend' | 'descend'
}

export type CartsResponse = {
  data: CartWithItems[]
  total: number
}
