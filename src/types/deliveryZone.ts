export type LatLng = {
  lat: number
  lng: number
}

export type PolygonShape = {
  vertices: LatLng[] // ring, first point == last point
}

export type RadiusShape = {
  center: LatLng
  radiusMeters: number
}

export type DeliveryZoneShapeType = 'POLYGON' | 'RADIUS'

export type DeliveryZone = {
  id: string
  name: string
  warehouseId: string
  isActive: boolean
  priority: number
  shapeType: DeliveryZoneShapeType
  shape: PolygonShape | RadiusShape
}

export type CreateDeliveryZoneDto = {
  name: string
  warehouseId: string
  isActive: boolean
  priority: number
  shapeType: DeliveryZoneShapeType
  shape: PolygonShape | RadiusShape
}

export type UpdateDeliveryZoneDto = Partial<CreateDeliveryZoneDto>
