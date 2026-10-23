import { useState } from "react";
import { Drawer, Table, Tag } from "antd";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import { inventoryService } from "../../services/inventory";
import type { MovementReason, StockMovement } from "../../types/inventory";

const REASON: Record<MovementReason, { label: string; color: string }> = {
  ORDER_PLACED: { label: "Order", color: "blue" },
  ORDER_CANCELLED: { label: "Order cancelled", color: "purple" },
  RESTOCK: { label: "Restock", color: "green" },
  ADJUSTMENT: { label: "Adjustment", color: "orange" },
  STOCK_COUNT: { label: "Stock count", color: "geekblue" },
};

type Props = {
  open: boolean;
  onClose: () => void;
  productId?: string;
  warehouseId?: string;
  title: string;
};

/** Newest-first ledger of every stock change: orders, cancellations, restocks, counts. */
export default function StockHistoryDrawer({ open, onClose, productId, warehouseId, title }: Props) {
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const { data, isFetching } = useQuery({
    queryKey: ["inventory-movements", productId, warehouseId, page],
    queryFn: () => inventoryService.movements({ productId, warehouseId, page, pageSize }),
    enabled: open,
  });

  return (
    <Drawer open={open} onClose={onClose} title={title} width={720} destroyOnHidden>
      <Table<StockMovement>
        rowKey="id"
        size="small"
        loading={isFetching}
        dataSource={data?.data ?? []}
        pagination={{ current: page, pageSize, total: data?.total ?? 0, onChange: setPage, showSizeChanger: false }}
        columns={[
          { title: "When", dataIndex: "createdAt", width: 130, render: (v: string) => dayjs(v).format("DD MMM, HH:mm") },
          ...(productId ? [] : [{ title: "Product", dataIndex: "productName" }]),
          ...(warehouseId ? [] : [{ title: "Warehouse", dataIndex: "warehouseName" }]),
          {
            title: "Change",
            dataIndex: "delta",
            width: 80,
            render: (d: number) => (
              <span style={{ fontWeight: 700, color: d > 0 ? "#15803D" : "#B91C1C" }}>{d > 0 ? `+${d}` : d}</span>
            ),
          },
          { title: "After", dataIndex: "quantityAfter", width: 70 },
          {
            title: "Reason",
            dataIndex: "reason",
            render: (r: MovementReason, m) => (
              <div>
                <Tag color={REASON[r].color}>{REASON[r].label}</Tag>
                {m.orderId && (
                  <Link to={`/orders/${m.orderId}`} style={{ fontSize: 12 }}>
                    #{(m.orderNumber ?? m.orderId).slice(-8).toUpperCase()}
                  </Link>
                )}
                {m.note && <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{m.note}</div>}
              </div>
            ),
          },
          { title: "By", dataIndex: "userName", width: 140, render: (v: string | null) => v ?? "—" },
        ]}
      />
    </Drawer>
  );
}
