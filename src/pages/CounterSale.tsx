import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Alert, App, Button, Card, Col, Empty, Input, InputNumber, Radio, Result, Row, Select, Space, Spin, Table, Tooltip, Typography,
} from "antd";
import { DeleteOutlined, PlusOutlined, PrinterOutlined, SearchOutlined } from "@ant-design/icons";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { inventoryService, InventoryApiError } from "../services/inventory";
import { warehouseService } from "../services/warehouses";
import { orderService } from "../services/orders";
import { fetchCustomers } from "../services/customers";
import type { InventoryRow } from "../types/inventory";
import {
  COUNTER_NOTES_MAX, COUNTER_PAYMENT_METHODS, shortOrderNumber, type CounterPaymentMethod, type Order,
} from "../types/order";
import StockLevel from "../components/inventory/StockLevel";
import TableImage from "../components/TableImage";
import CounterReceipt from "../components/orders/CounterReceipt";

const { Text } = Typography;

const WAREHOUSE_KEY = "counter.warehouseId";
// Same rule as the backend's customerMobile: 10 digits, no +91.
const MOBILE_RE = /^[6-9]\d{9}$/;

type CartLine = { productId: string; name: string; sku: string; price: number; stock: number; quantity: number };
type Shortage = { productId: string; name: string; requested: number; available: number };

function readSavedWarehouse(): string | null {
  try { return localStorage.getItem(WAREHOUSE_KEY); } catch { return null; }
}

/** Sellable units right now: a switched-off product can't be sold even with stock. */
const sellable = (r: InventoryRow) => (r.isAvailable ? r.quantity : 0);
const money = (n: number) => `₹${n.toFixed(2)}`;

export default function CounterSale() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const [warehouseId, setWarehouseId] = useState<string | null>(readSavedWarehouse);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [mobile, setMobile] = useState("");
  const [debouncedMobile, setDebouncedMobile] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<CounterPaymentMethod>("CASH");
  const [notes, setNotes] = useState("");
  const [shortages, setShortages] = useState<Shortage[]>([]);
  const [sale, setSale] = useState<{ order: Order; productNames: Map<string, string> } | null>(null);

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
    const h = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(h);
  }, [searchInput]);

  useEffect(() => {
    const h = setTimeout(() => setDebouncedMobile(mobile), 300);
    return () => clearTimeout(h);
  }, [mobile]);

  const products = useQuery({
    queryKey: ["inventory", warehouseId, "all", search, 1, 20],
    queryFn: () => inventoryService.list({ warehouseId: warehouseId!, status: "all", search: search || undefined, page: 1, pageSize: 20 }),
    enabled: !!warehouseId,
    placeholderData: keepPreviousData,
  });

  const mobileValid = MOBILE_RE.test(debouncedMobile);
  const customer = useQuery({
    queryKey: ["customers", "mobile", debouncedMobile],
    queryFn: () => fetchCustomers({ page: 1, pageSize: 1, mobile: debouncedMobile }),
    enabled: mobileValid,
  });
  const matchedCustomer = customer.data?.data[0];

  const totals = useMemo(
    () => cart.reduce((t, l) => ({ units: t.units + l.quantity, amount: t.amount + l.price * l.quantity }), { units: 0, amount: 0 }),
    [cart],
  );
  const qtyById = useMemo(() => new Map(cart.map((l) => [l.productId, l.quantity])), [cart]);

  const addToCart = (r: InventoryRow) => {
    const stock = sellable(r);
    setCart((lines) => {
      const existing = lines.find((l) => l.productId === r.productId);
      if (!existing) return [...lines, { productId: r.productId, name: r.name, sku: r.sku, price: Number(r.price), stock, quantity: 1 }];
      return lines.map((l) => (l.productId === r.productId ? { ...l, stock, quantity: Math.min(l.quantity + 1, stock) } : l));
    });
  };
  const setQuantity = (productId: string, quantity: number) =>
    setCart((lines) => lines.map((l) => (l.productId === productId ? { ...l, quantity } : l)));
  const removeLine = (productId: string) => setCart((lines) => lines.filter((l) => l.productId !== productId));

  const resetSale = () => {
    setCart([]);
    setMobile("");
    setNotes("");
    setPaymentMethod("CASH");
    setShortages([]);
    setSale(null);
  };

  const completeSale = useMutation({
    mutationFn: () =>
      orderService.createCounterOrder({
        warehouseId: warehouseId!,
        paymentMethod,
        customerMobile: mobile || undefined,
        notes: notes.trim() || undefined,
        orderItems: cart.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      }),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setSale({ order, productNames: new Map(cart.map((l) => [l.productId, l.name])) });
      setShortages([]);
    },
    onError: (err) => {
      if (err instanceof InventoryApiError && err.code === "INSUFFICIENT_STOCK") {
        const items = (err.data?.items ?? []) as Shortage[];
        const available = new Map(items.map((i) => [i.productId, i.available]));
        // Cap the cart at what's actually left so the next attempt can go through.
        setCart((lines) =>
          lines.flatMap((l) => {
            const left = available.get(l.productId);
            if (left == null) return [l];
            return left > 0 ? [{ ...l, stock: left, quantity: Math.min(l.quantity, left) }] : [];
          }),
        );
        setShortages(items);
        queryClient.invalidateQueries({ queryKey: ["inventory"] });
        return;
      }
      message.error(err instanceof Error ? err.message : "Failed to record the sale");
    },
  });

  const mobileIncomplete = mobile !== "" && !MOBILE_RE.test(mobile);
  const canComplete = !!warehouseId && cart.length > 0 && !mobileIncomplete && !completeSale.isPending;

  if (sale) {
    return (
      <div style={{ padding: 24 }}>
        <Result
          status="success"
          title={`Sale recorded · #${shortOrderNumber(sale.order)}`}
          subTitle={`Total ${money(Number(sale.order.finalAmount ?? 0))} · stock updated in ${warehouse?.name ?? "the store"}`}
          extra={[
            <Button key="print" icon={<PrinterOutlined />} onClick={() => window.print()}>Print receipt</Button>,
            <Link key="view" to={`/orders/${sale.order.id}`}><Button>View order</Button></Link>,
            <Button key="new" type="primary" className="ds-btn-primary" onClick={resetSale}>New sale</Button>,
          ]}
        />
        <div style={{ display: "flex", justifyContent: "center" }}>
          <CounterReceipt order={sale.order} productNames={sale.productNames} store={warehouse} />
        </div>
      </div>
    );
  }

  const productColumns = [
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
          <div style={{ fontWeight: 600, fontSize: 13, color: "#0F172A" }}>{r.name}</div>
          <div style={{ fontSize: 12, color: "#94A3B8" }}>
            {r.sku}
            {!r.isAvailable && <span style={{ color: "#B91C1C", marginLeft: 8 }}>· switched off</span>}
          </div>
        </div>
      ),
    },
    { title: "Price", key: "price", width: 90, render: (_: unknown, r: InventoryRow) => money(Number(r.price)) },
    {
      title: "Stock",
      key: "stock",
      width: 130,
      render: (_: unknown, r: InventoryRow) => <StockLevel quantity={sellable(r)} reorderLevel={r.reorderLevel} />,
    },
    {
      title: "",
      key: "add",
      width: 64,
      render: (_: unknown, r: InventoryRow) => (
        <Button
          icon={<PlusOutlined />}
          title="Add to sale"
          disabled={(qtyById.get(r.productId) ?? 0) >= sellable(r)}
          onClick={() => addToCart(r)}
        />
      ),
    },
  ];

  const cartColumns = [
    {
      title: "Item",
      key: "name",
      render: (_: unknown, l: CartLine) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: 13 }}>{l.name}</div>
          <div style={{ fontSize: 12, color: "#94A3B8" }}>{money(l.price)} · {l.stock} available</div>
        </div>
      ),
    },
    {
      title: "Qty",
      key: "qty",
      width: 90,
      render: (_: unknown, l: CartLine) => (
        <InputNumber
          size="small"
          min={1}
          max={l.stock}
          precision={0}
          value={l.quantity}
          onChange={(v) => v != null && setQuantity(l.productId, v)}
          style={{ width: 70 }}
        />
      ),
    },
    { title: "Total", key: "total", width: 90, align: "right" as const, render: (_: unknown, l: CartLine) => money(l.price * l.quantity) },
    {
      title: "",
      key: "remove",
      width: 40,
      render: (_: unknown, l: CartLine) => (
        <Button type="text" size="small" danger icon={<DeleteOutlined />} title="Remove" onClick={() => removeLine(l.productId)} />
      ),
    },
  ];

  const customerHint = mobile === ""
    ? <Text type="secondary">Walk-in customer</Text>
    : mobileIncomplete
      ? <Text type="secondary">Enter a 10-digit mobile number</Text>
      : customer.isFetching || mobile !== debouncedMobile
        ? <Spin size="small" />
        : matchedCustomer
          ? <Text type="success">{matchedCustomer.name || matchedCustomer.username}</Text>
          : <Text type="warning">New customer will be created</Text>;

  return (
    <div style={{ padding: 24 }}>
      <div className="ds-page-header">
        <h1 className="ds-page-title">Counter Sale</h1>
        <Tooltip title={cart.length > 0 ? "Finish or clear the current sale to switch store" : ""}>
          <Select
            style={{ minWidth: 220 }}
            loading={warehouses.isLoading}
            value={warehouseId ?? undefined}
            onChange={setWarehouseId}
            disabled={cart.length > 0}
            options={(warehouses.data ?? []).map((w) => ({ value: w.id, label: w.name }))}
            placeholder="Store"
          />
        </Tooltip>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={14}>
          <Card>
            <Input
              placeholder="Search product name or SKU…"
              prefix={<SearchOutlined style={{ color: "#94A3B8" }} />}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              allowClear
              autoFocus
              style={{ marginBottom: 16, borderRadius: 8 }}
            />
            <Table<InventoryRow>
              rowKey="productId"
              size="small"
              columns={productColumns}
              dataSource={products.data?.data ?? []}
              loading={products.isLoading || warehouses.isLoading}
              pagination={false}
              // Scroll the list on its own (sticky header) so the page and the sale panel stay put.
              // 300px ≈ app header + page header + card padding + search + table header.
              scroll={{ y: "max(240px, calc(100dvh - 300px))" }}
              rowClassName={(r) => (sellable(r) === 0 ? "ds-row-out" : "")}
              locale={{
                emptyText: warehouses.data?.length === 0
                  ? <Empty description="Create a warehouse first" />
                  : <Empty description={search ? "No matching products" : "No products"} />,
              }}
            />
            {products.isError && <Alert type="error" showIcon style={{ marginTop: 12 }} message={(products.error as Error).message} />}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title={`Sale${totals.units ? ` · ${totals.units} item${totals.units === 1 ? "" : "s"}` : ""}`}>
            {shortages.length > 0 && (
              <Alert
                type="warning"
                showIcon
                closable
                onClose={() => setShortages([])}
                style={{ marginBottom: 16 }}
                message="Not enough stock. Quantities were reduced to what's left:"
                description={
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {shortages.map((s) => (
                      <li key={s.productId}>
                        {s.name}: wanted {s.requested}, {s.available === 0 ? "sold out (removed)" : `${s.available} left`}
                      </li>
                    ))}
                  </ul>
                }
              />
            )}
            <Table<CartLine>
              rowKey="productId"
              size="small"
              columns={cartColumns}
              dataSource={cart}
              pagination={false}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Add products from the list" /> }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "16px 0" }}>
              <Text strong>Total</Text>
              <Text strong style={{ fontSize: 22 }}>{money(totals.amount)}</Text>
            </div>

            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <div>
                <div className="ds-section-label">Customer phone (optional)</div>
                <Input
                  addonBefore="+91"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="Leave empty for walk-in"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                  allowClear
                />
                <div style={{ marginTop: 4, minHeight: 22 }}>{customerHint}</div>
              </div>
              <div>
                <div className="ds-section-label">Payment</div>
                <Radio.Group
                  optionType="button"
                  buttonStyle="solid"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  options={COUNTER_PAYMENT_METHODS}
                />
              </div>
              <div>
                <div className="ds-section-label">Notes (optional)</div>
                <Input.TextArea rows={2} maxLength={COUNTER_NOTES_MAX} showCount value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <Button
                type="primary"
                size="large"
                block
                className="ds-btn-primary"
                disabled={!canComplete}
                loading={completeSale.isPending}
                onClick={() => completeSale.mutate()}
              >
                Complete Sale · {money(totals.amount)}
              </Button>
              {cart.length > 0 && (
                <Button block onClick={resetSale} disabled={completeSale.isPending}>Clear sale</Button>
              )}
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
