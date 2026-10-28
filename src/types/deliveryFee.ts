export type FeeTier = {
  /** Distances up to and including this many metres pay [fee]. */
  upToMeters: number
  /** Rupees; 0 = free delivery. */
  fee: number
}

export type DeliveryFeeSettings = {
  /** Ascending by upToMeters. */
  tiers: FeeTier[]
  /** Past the last tier, and when a distance can't be measured. */
  beyondFee: number
  updatedAt: string | null
}

/** Mirrors the backend's feeForDistance (inclusive upper bounds). */
export function feeForDistance(meters: number, s: Pick<DeliveryFeeSettings, 'tiers' | 'beyondFee'>): number {
  const tier = s.tiers.find((t) => meters <= t.upToMeters)
  return tier ? tier.fee : s.beyondFee
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`
  const km = meters / 1000
  return `${Number.isInteger(km) ? km : km.toFixed(1)} km`
}

export function formatFee(fee: number): string {
  return fee === 0 ? 'Free' : `₹${Number.isInteger(fee) ? fee : fee.toFixed(2)}`
}

/** Straight-line metres between two points (haversine), like the backend. */
export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_008.8
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Ring/legend colour per tier: free green, then warmer as delivery gets dearer. */
export const TIER_COLORS = ['#16A34A', '#F59E0B', '#EA580C', '#DC2626', '#9333EA', '#2563EB']
export const tierColor = (index: number) => TIER_COLORS[index % TIER_COLORS.length]
