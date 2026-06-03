import { Tag } from "antd";
import type { OrderStatus } from "../types/order";

const colorMap: Record<OrderStatus, string> = {
  PENDING: "orange",
  CONFIRMED: "blue",
  PROCESSING: "cyan",
  OUT_FOR_DELIVERY: "orange",
  SHIPPED: "purple",
  DELIVERED: "green",
  CANCELLED: "red",
  REFUNDED: "gold",
};

export default function OrderStatusTag({ status }: { status: OrderStatus }) {
  const color = colorMap[status];
  return (
    <Tag color={color} style={{ textTransform: "capitalize" }}>
      {status}
    </Tag>
  );
}
