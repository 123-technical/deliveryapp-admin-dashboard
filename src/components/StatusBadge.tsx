interface StatusBadgeProps {
  status: string | boolean | null | undefined;
}

const statusMap: Record<string, string> = {
  // Boolean / availability
  "true": "available",
  "false": "unavailable",
  // String statuses
  ACTIVE: "active",
  active: "active",
  AVAILABLE: "available",
  available: "available",
  INACTIVE: "inactive",
  inactive: "inactive",
  blocked: "inactive",
  BLOCKED: "inactive",
  PENDING: "pending",
  pending: "pending",
  CONFIRMED: "confirmed",
  confirmed: "confirmed",
  PROCESSING: "processing",
  processing: "processing",
  OUT_FOR_DELIVERY: "out_for_delivery",
  out_for_delivery: "out_for_delivery",
  DELIVERED: "delivered",
  delivered: "delivered",
  CANCELLED: "cancelled",
  cancelled: "cancelled",
  REFUNDED: "cancelled",
  refunded: "cancelled",
  Deleted: "inactive",
  deleted: "inactive",
};

const statusLabel: Record<string, string> = {
  active: "Active",
  available: "Available",
  inactive: "Inactive",
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  unavailable: "Unavailable",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const raw = status === null || status === undefined ? "" : String(status);
  const key = statusMap[raw] || statusMap[raw.toLowerCase()] || "pending";
  const label = statusLabel[key] || raw.replace(/_/g, " ");

  return <span className={`ds-badge ${key}`}>{label}</span>;
}
