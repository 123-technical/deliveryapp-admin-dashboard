import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Table, Input, Select, Segmented, Button, Tooltip, Empty } from "antd";
import { SearchOutlined, EditOutlined, HistoryOutlined, ReloadOutlined } from "@ant-design/icons";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { inventoryService } from "../services/inventory";
import { warehouseService } from "../services/warehouses";
import { useAuth } from "../contexts/AuthContext";
import type { InventoryRow, StockStatus } from "../types/inventory";
import StockLevel from "../components/inventory/StockLevel";
import StockAdjustModal, { type StockTarget } from "../components/inventory/StockAdjustModal";
import StockHistoryDrawer from "../components/inventory/StockHistoryDrawer";
import TableImage from "../components/TableImage";

dayjs.extend(relativeTime);

// Orders from the app decrement stock continuously; poll so this page
// never shows numbers more than half a minute old.
const REFRESH_MS = 30_000;
const WAREHOUSE_KEY = "inventory.warehouseId";

function readSavedWarehouse(): string | null {
  try { return localStorage.getItem(WAREHOUSE_KEY); } catch { return null; }
}

export default function Inventory() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canEdit = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const [warehouseId, setWarehouseId] = useState<string | null>(readSavedWarehouse);
  const [status, setStatus] = useState<StockStatus>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [adjustTarget, setAdjustTarget] = useState<StockTarget | null>(null);
  const [historyFor, setHistoryFor] = useState<InventoryRow | null>(null);

  const warehouses = useQuery({ queryKey: ["warehouses"], queryFn: () => warehouseService.getWarehouses() });
  const warehouse = warehouses.data?.find((w) => w.id === warehouseId);

  // Default to the first warehouse, or recover if the saved one was deleted.
  useEffect(() => {
    const list = warehouses.data;
    if (list && list.length > 0 && !list.some((w) => w.id === warehouseId)) setWarehouseId(list[0].id);
  }, [warehouses.data, warehouseId]);

  useEffect(() => {
    if (!warehouseId) return;
    try { localStorage.setItem(WAREHOUSE_KEY, warehouseId); } catch { /* private mode */ }
  }, [warehouseId]);

  useEffect(() => {
    const h = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => clearTimeout(h);
  }, [searchInput]);

  const inventory = useQuery({
    queryKey: ["inventory", warehouseId, status, search, page, pageSize],
    queryFn: () => inventoryService.list({ warehouseId: warehouseId!, status, search: search || undefined, page, pageSize }),
    enabled: !!warehouseId,
    refetchInterval: REFRESH_MS,
    placeholderData: keepPreviousData,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["inventory"] });
  const counts = inventory.data?.counts;

  const columns = [
    {
      title: "",
      key: "image",
      width: 56,
      render: (_: unknown, r: InventoryRow) => <TableImage src={r.imageUrl ?? undefined} alt={r.name} />,
    },
    {
      title: "Product",
      key: "name",
      render: (_: unknown, r: InventoryRow) => (
        <div>
          <button
            onClick={() => navigate(`/product/detail/${r.productId}`)}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#0F172A", fontWeight: 600, fontSize: 13, textAlign: "left" }}
          >
            {r.name}
          </button>
          <div style={{ fontSize: 12, color: "#94A3B8" }}>
            {r.sku}
            {!r.isAvailable && <span style={{ color: "#B91C1C", marginLeft: 8 }}>· switched off</span>}
          </div>
        </div>
      ),
    },
    {
      title: "Stock",
      key: "stock",
      width: 150,
      render: (_: unknown, r: InventoryRow) => <StockLevel quantity={r.quantity} reorderLevel={r.reorderLevel} />,
    },
    { title: "Reorder at", dataIndex: "reorderLevel", key: "reorderLevel", width: 100 },
    {
      title: "Updated",
      dataIndex: "stockUpdatedAt",
      key: "stockUpdatedAt",
      width: 130,
      render: (v: string | null) =>
        v ? <Tooltip title={dayjs(v).format("DD MMM YYYY, HH:mm")}>{dayjs(v).fromNow()}</Tooltip> : <span style={{ color: "#94A3B8" }}>Never stocked</span>,
    },
    {
      title: "",
      key: "actions",
      width: 96,
      fixed: "right" as const,
      render: (_: unknown, r: InventoryRow) => (
        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
          {canEdit && (
            <Button
              className="ds-action-btn edit"
              icon={<EditOutlined style={{ fontSize: 14 }} />}
              title="Update stock"
              onClick={() =>
                setAdjustTarget({
                  productId: r.productId,
                  productName: r.name,
                  warehouseId: warehouseId!,
                  warehouseName: warehouse?.name ?? "",
                  quantity: r.quantity,
                  reorderLevel: r.reorderLevel,
                })
              }
            />
          )}
          <Button className="ds-action-btn view" icon={<HistoryOutlined style={{ fontSize: 14 }} />} title="Stock history" onClick={() => setHistoryFor(r)} />
        </div>
      ),
    },
  ];

  const tab = (label: string, value: StockStatus) => ({
    value,
    label: `${label}${counts ? ` (${counts[value]})` : ""}`,
  });

  return (
    <div style={{ padding: 24 }}>
      <div className="ds-page-header">
        <h1 className="ds-page-title">Inventory</h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <Select
            style={{ minWidth: 220 }}
            loading={warehouses.isLoading}
            value={warehouseId ?? undefined}
            onChange={(id) => { setWarehouseId(id); setPage(1); }}
            options={(warehouses.data ?? []).map((w) => ({ value: w.id, label: w.name }))}
            placeholder="Warehouse"
          />
          <Input
            placeholder="Search name or SKU…"
            prefix={<SearchOutlined style={{ color: "#94A3B8" }} />}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ width: 240, borderRadius: 8 }}
            allowClear
          />
          <Tooltip title={inventory.dataUpdatedAt ? `Auto-refreshes every 30s · last ${dayjs(inventory.dataUpdatedAt).format("HH:mm:ss")}` : ""}>
            <Button icon={<ReloadOutlined spin={inventory.isFetching} />} onClick={refresh} />
          </Tooltip>
        </div>
      </div>

      <Segmented<StockStatus>
        style={{ marginBottom: 16 }}
        value={status}
        onChange={(s) => { setStatus(s); setPage(1); }}
        options={[tab("All", "all"), tab("In stock", "in"), tab("Low", "low"), tab("Out of stock", "out")]}
      />

      <div className="ds-table-wrapper">
        <Table<InventoryRow>
          rowKey="productId"
          columns={columns}
          dataSource={inventory.data?.data ?? []}
          loading={inventory.isLoading || warehouses.isLoading}
          scroll={{ x: 760 }}
          rowClassName={(r) => (r.quantity === 0 ? "ds-row-out" : "")}
          pagination={{
            current: page,
            pageSize,
            total: inventory.data?.total ?? 0,
            showSizeChanger: true,
            showTotal: (t, range) => `${range[0]}-${range[1]} of ${t} products`,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          }}
          locale={{
            emptyText: warehouses.data?.length === 0
              ? <Empty description="Create a warehouse first" />
              : <Empty description={status === "all" ? "No products" : "Nothing here"} />,
          }}
        />
      </div>

      <StockAdjustModal target={adjustTarget} onClose={() => setAdjustTarget(null)} onSaved={refresh} />
      <StockHistoryDrawer
        open={historyFor != null}
        onClose={() => setHistoryFor(null)}
        productId={historyFor?.productId}
        warehouseId={warehouseId ?? undefined}
        title={historyFor ? `History · ${historyFor.name} · ${warehouse?.name ?? ""}` : ""}
      />
    </div>
  );
}
