import { Tag } from "antd";
import type { OrderStatus } from "../types/order";

const colorMap: Record<OrderStatus, string> = {
  PENDING: "blue",
  PROCESSING: "cyan",
  PAID: "geekblue",
  SHIPPED: "purple",
  OUT_FOR_DELIVERY: "orange",
  DELIVERED: "green",
  CANCELLED: "red",
  RETURNED: "gold",
};

const labelMap: Partial<Record<OrderStatus, string>> = {
  PENDING: "Order Placed",
  OUT_FOR_DELIVERY: "Out for Delivery",
};

export default function OrderStatusTag({ status }: { status: OrderStatus }) {
  const color = colorMap[status];
  return (
    <Tag color={color} style={{ textTransform: "capitalize" }}>
      {labelMap[status] || status.replace(/_/g, " ").toLowerCase()}
    </Tag>
  );
}
