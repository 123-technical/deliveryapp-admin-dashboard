import { useState } from "react";
import { Button, Table } from "antd";
import { EditOutlined, HistoryOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { inventoryService } from "../../services/inventory";
import { useAuth } from "../../contexts/AuthContext";
import type { WarehouseStock } from "../../types/inventory";
import StockLevel from "./StockLevel";
import StockAdjustModal, { type StockTarget } from "./StockAdjustModal";
import StockHistoryDrawer from "./StockHistoryDrawer";

/** One product's stock in every warehouse, with restock/count and history. */
export default function ProductStockCard({ productId, productName }: { productId: string; productName: string }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canEdit = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const [target, setTarget] = useState<StockTarget | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const stock = useQuery({
    queryKey: ["product-stock", productId],
    queryFn: () => inventoryService.productStock(productId),
    refetchInterval: 30_000,
  });
  const total = (stock.data ?? []).reduce((sum, w) => sum + w.quantity, 0);

  return (
    <div style={{ background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e5e7eb", marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: "#111827" }}>
          Stock by warehouse
          {stock.data && <span style={{ marginLeft: 8, fontWeight: 500, fontSize: 13, color: "#64748B" }}>{total} total</span>}
        </h3>
        <Button icon={<HistoryOutlined />} onClick={() => setHistoryOpen(true)}>History</Button>
      </div>
      <Table<WarehouseStock>
        rowKey="warehouseId"
        size="small"
        pagination={false}
        loading={stock.isLoading}
        dataSource={stock.data ?? []}
        locale={{ emptyText: "No warehouses yet" }}
        columns={[
          { title: "Warehouse", dataIndex: "warehouseName" },
          { title: "Stock", key: "q", render: (_, w) => <StockLevel quantity={w.quantity} reorderLevel={w.reorderLevel} /> },
          { title: "Reorder at", dataIndex: "reorderLevel", width: 100 },
          {
            title: "Updated",
            dataIndex: "stockUpdatedAt",
            width: 150,
            render: (v: string | null) => (v ? dayjs(v).format("DD MMM, HH:mm") : <span style={{ color: "#94A3B8" }}>Never stocked</span>),
          },
          ...(canEdit
            ? [{
                title: "",
                key: "edit",
                width: 110,
                render: (_: unknown, w: WarehouseStock) => (
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => setTarget({ productId, productName, warehouseId: w.warehouseId, warehouseName: w.warehouseName, quantity: w.quantity, reorderLevel: w.reorderLevel })}
                  >
                    Update
                  </Button>
                ),
              }]
            : []),
        ]}
      />
      <StockAdjustModal
        target={target}
        onClose={() => setTarget(null)}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["product-stock", productId] });
          queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
        }}
      />
      <StockHistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} productId={productId} title={`History · ${productName}`} />
    </div>
  );
}
