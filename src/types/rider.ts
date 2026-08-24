export type Rider = {
  id: string
  username: string
  name: string | null
  email: string | null
  mobile: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export type RidersQuery = {
  page: number
  pageSize: number
  search?: string
  createdAfter?: string // ISO date; used for stats counts
  sortBy?: keyof Rider
  sortOrder?: 'ascend' | 'descend'
}

export type RidersResponse = {
  data: Rider[]
  metadata: {
    total: number
    page: number
    limit: number
  }
}
