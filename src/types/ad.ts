export type AdPlacement = 'HOME_BANNER' | 'CART_INLINE' | 'ORDER_SUCCESS'

/** Derived on the backend from isActive + schedule. */
export type AdStatus = 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'PAUSED'

export type Ad = {
  id: string
  placement: AdPlacement
  advertiserName: string
  title: string
  subtitle: string | null
  /** Ready-to-load URL for display */
  imageUrl: string
  /** Stored object key — send this back as `imageUrl` when saving */
  imageKey: string
  ctaText: string
  targetUrl: string
  backgroundColor: string | null
  ctaColor: string | null
  displaySeconds: number | null
  priority: number
  isActive: boolean
  startAt: string | null
  endAt: string | null
  impressions: number
  clicks: number
  /** Click-through rate, percent (0–100, 2 decimals) */
  ctr: number
  status: AdStatus
  createdAt: string
  updatedAt: string
}

export type CreateAdDto = {
  placement: AdPlacement
  advertiserName: string
  title: string
  subtitle?: string | null
  imageUrl: string
  ctaText: string
  targetUrl: string
  backgroundColor?: string | null
  ctaColor?: string | null
  displaySeconds?: number | null
  priority?: number
  isActive?: boolean
  startAt?: string | null
  endAt?: string | null
}

export type UpdateAdDto = Partial<CreateAdDto>

export type AdsQuery = {
  page: number
  pageSize: number
  search?: string
  placement?: AdPlacement
  status?: AdStatus
}

export type AdsResponse = {
  data: Ad[]
  total: number
}

export type AdSettings = {
  cartAdFrequency: number
  homeAutoRotateSecs: number
}

/** Mirrors the backend DTO limits. */
export const AD_LIMITS = {
  advertiserName: 60,
  title: 40,
  subtitle: 60,
  ctaText: 20,
  displaySecondsMin: 3,
  displaySecondsMax: 15,
  maxImageBytes: 1024 * 1024,
  /** Allowed aspect-ratio drift for uploaded creatives */
  ratioTolerance: 0.02,
} as const

export type PlacementSpec = {
  label: string
  width: number
  height: number
  ratioLabel: string
}

/** Creative size the customer app renders each placement at. */
export const PLACEMENT_SPECS: Record<AdPlacement, PlacementSpec> = {
  HOME_BANNER: { label: 'Home banner', width: 1200, height: 600, ratioLabel: '2:1' },
  CART_INLINE: { label: 'Cart (inline)', width: 600, height: 600, ratioLabel: '1:1' },
  ORDER_SUCCESS: { label: 'Order success', width: 1200, height: 800, ratioLabel: '3:2' },
}
