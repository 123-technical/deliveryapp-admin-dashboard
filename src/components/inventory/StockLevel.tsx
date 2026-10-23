import { Tag, Tooltip } from "antd";

/** Stock count with a colour for its state: out (red), low (orange, at/below reorder level), ok (green). */
export default function StockLevel({ quantity, reorderLevel }: { quantity: number; reorderLevel: number }) {
  if (quantity <= 0) {
    return <Tag color="red" style={{ fontWeight: 600, margin: 0 }}>Out of stock</Tag>;
  }
  if (quantity <= reorderLevel) {
    return (
      <Tooltip title={`At or below the reorder level (${reorderLevel})`}>
        <Tag color="orange" style={{ fontWeight: 600, margin: 0 }}>{quantity} · Low</Tag>
      </Tooltip>
    );
  }
  return <Tag color="green" style={{ fontWeight: 600, margin: 0 }}>{quantity} in stock</Tag>;
}
