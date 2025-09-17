import { Tag } from "antd";
import type { OrderStatus } from "../types/order";

const colorMap: Record<OrderStatus, string> = {
  placed: "default",
  packed: "processing",
  assigned: "processing",
  picking: "cyan",
  delivering: "geekblue",
  delivered: "green",
  cancelled: "red",
  refunded: "gold",
};

export default function OrderStatusTag({ status }: { status: OrderStatus }) {
  const color = colorMap[status];
  return (
    <Tag color={color} style={{ textTransform: "capitalize" }}>
      {status}
    </Tag>
  );
}
