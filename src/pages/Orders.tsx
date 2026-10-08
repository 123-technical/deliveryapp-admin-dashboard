import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  DatePicker,
  Input,
  Select,
  Table,
  Modal,
  Form,
  Popconfirm,
  Radio,
  Spin,
  message,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { orderService } from "../services/orders";
import { productService } from "../services/products";
import { fetchCustomers } from "../services/customers";
import { useAuth } from "../contexts/AuthContext";
import type {
  Order,
  OrderStatus,
  OrdersQuery,
  CreateOrderDto,
} from "../types/order";
import type { Product } from "../types/product";
import DrawerForm from "../components/DrawerForm";
import StatusBadge from "../components/StatusBadge";
import CopyableId from "../components/CopyableId";

const { RangePicker } = DatePicker;
const { Option } = Select;

// Helper: is valid UUID
const isValidUUID = (str: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());

export default function Orders() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState<string>("");
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Edit Status Modal
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editForm] = Form.useForm();

  // Create Order Drawer
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  // Drawer form state
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [slots, setSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [notes, setNotes] = useState("");

  const queryParams: OrdersQuery = useMemo(
    () => ({
      page,
      pageSize,
      search: search || undefined,
      status: status === "all" ? undefined : status,
      startDate: range?.[0]?.toISOString(),
      endDate: range?.[1]?.toISOString(),
    }),
    [page, pageSize, search, status, range]
  );

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      if (search && isValidUUID(search)) {
        try {
          const order = await orderService.getOrderById(search.trim());
          setOrders([order]);
          setTotal(1);
        } catch {
          message.error("Order not found");
          setOrders([]);
          setTotal(0);
        }
      } else {
        const response = await orderService.getOrders(queryParams);
        setOrders(response.data || []);
        setTotal(response.total || 0);
      }
    } catch {
      message.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, [queryParams, search]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Edit Status
  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    editForm.setFieldsValue({ status: order.status });
    setIsEditModalVisible(true);
  };

  const handleEditModalOk = async () => {
    try {
      const values = await editForm.validateFields();
      if (editingOrder) {
        await orderService.updateOrder(editingOrder.id, { status: values.status });
        message.success("Order status updated successfully");
        setIsEditModalVisible(false);
        fetchOrders();
      }
    } catch {
      message.error("Failed to update order status");
    }
  };

  const handleDelete = async (orderId: string) => {
    try {
      await orderService.deleteOrder(orderId);
      message.success("Order deleted successfully");
      fetchOrders();
    } catch {
      message.error("Failed to delete order");
    }
  };

  // Create Order Drawer logic (unchanged)
  const openCreateDrawer = () => {
    setIsDrawerVisible(true);
    setSelectedUserId("");
    setSelectedAddressId("");
    setSelectedSlotId("");
    setOrderItems([{ productId: "", quantity: 1, priceAtPurchase: 0 }]);
    setNotes("");
    fetchProductsList();
  };

  const closeCreateDrawer = () => { setIsDrawerVisible(false); };

  const searchCustomers = async (searchTerm: string) => {
    if (!searchTerm) { setUsers([]); return; }
    setLoadingUsers(true);
    try {
      const response = await fetchCustomers({ page: 1, pageSize: 20, search: searchTerm });
      setUsers(response.data || []);
    } catch { message.error("Failed to search customers"); }
    finally { setLoadingUsers(false); }
  };

  const fetchAddresses = async (uid: string) => {
    setLoadingAddresses(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/v1/users/${uid}/addresses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAddresses(Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : []);
      } else { setAddresses([]); }
    } catch { setAddresses([]); }
    finally { setLoadingAddresses(false); }
  };

  const fetchSlotsList = async () => {
    setLoadingSlots(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/v1/delivery-slots`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSlots(Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : []);
      } else { setSlots([]); }
    } catch { setSlots([]); }
    finally { setLoadingSlots(false); }
  };

  useEffect(() => {
    if (selectedUserId) { fetchAddresses(selectedUserId); fetchSlotsList(); }
  }, [selectedUserId]);

  const fetchProductsList = async () => {
    setLoadingProducts(true);
    try {
      const response = await productService.getProducts({ page: 1, pageSize: 100, isAvailable: true });
      setProducts(response.data || []);
    } catch { message.error("Failed to fetch products"); }
    finally { setLoadingProducts(false); }
  };

  const handleCreateOrder = async () => {
    if (!selectedUserId) return message.error("Please select a customer");
    if (!selectedAddressId && addresses.length > 0) return message.error("Please select a delivery address");
    if (orderItems.some((item) => !item.productId || item.quantity < 1)) {
      return message.error("Please complete all order items");
    }
    setSavingOrder(true);
    try {
      const payload: CreateOrderDto = {
        userId: selectedUserId,
        deliveryAddressId: selectedAddressId || "manual-address",
        deliverySlotId: selectedSlotId || undefined,
        notes,
        orderItems: orderItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          priceAtPurchase: Number(item.priceAtPurchase),
        })),
      };
      await orderService.createOrder(payload);
      message.success("Order created successfully");
      closeCreateDrawer();
      fetchOrders();
    } catch (error: any) {
      message.error(error.message || "Failed to create order");
    } finally {
      setSavingOrder(false);
    }
  };

  const drawerTotal = orderItems.reduce(
    (acc, item) => acc + Number(item.priceAtPurchase) * item.quantity, 0
  );

  // ── Columns ──
  const columns = [
    {
      title: "Order ID",
      dataIndex: "id",
      key: "id",
      width: 120,
      render: (id: string) => <CopyableId id={id} />,
    },
    {
      title: "Customer",
      key: "customer",
      render: (_: any, record: Order) => {
        const name = record.user?.name || "Unknown";
        const email = record.user?.email || "";
        return (
          <div>
            <div style={{ fontWeight: 500, fontSize: 13, color: "#0F172A" }}>{name}</div>
            {email && <div style={{ fontSize: 12, color: "#64748B" }}>{email}</div>}
          </div>
        );
      },
    },
    {
      title: "Items",
      key: "items",
      width: 80,
      render: (_: any, record: Order) => {
        const count = record.orderItems?.length || record.items?.length || 0;
        return <span style={{ fontSize: 13 }}>{count} {count === 1 ? "item" : "items"}</span>;
      },
    },
    {
      title: "Total",
      dataIndex: "finalAmount",
      key: "finalAmount",
      width: 110,
      render: (amount: string) => (
        <span style={{ fontWeight: 600, color: "#0F172A" }}>
          ₹{parseFloat(amount || "0").toFixed(2)}
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (status: string) => <StatusBadge status={status} />,
    },
    {
      title: "Delivery Slot",
      key: "deliverySlot",
      width: 130,
      render: (_: any, record: Order) => {
        const slot = record.deliverySlot;
        if (!slot || !slot.date) return <span style={{ color: "#94A3B8" }}>—</span>;
        return <span style={{ fontSize: 13 }}>{dayjs(slot.date).format("MMM D")} {slot.startTime}-{slot.endTime}</span>;
      },
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 130,
      render: (date: string) => <span style={{ fontSize: 13, color: "#64748B" }}>{dayjs(date).format("DD MMM YYYY")}</span>,
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      fixed: "right" as const,
      render: (_: any, record: Order) => (
        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
          <Button
            className="ds-action-btn edit"
            icon={<EyeOutlined style={{ fontSize: 14 }} />}
            onClick={() => navigate(`/orders/${record.id}`)}
            title="View Order"
          />
          {isAdmin && (
            <>
              <Button
                className="ds-action-btn edit"
                icon={<EditOutlined style={{ fontSize: 14 }} />}
                onClick={() => handleEdit(record)}
                disabled={!!record.deletedAt}
                title="Edit Status"
              />
              <Popconfirm
                title="Delete Order"
                description="Are you sure you want to delete this order?"
                onConfirm={() => handleDelete(record.id)}
                okText="Delete"
                cancelText="Cancel"
                okType="danger"
                disabled={!!record.deletedAt}
              >
                <Button
                  className="ds-action-btn delete"
                  icon={<DeleteOutlined style={{ fontSize: 14 }} />}
                  disabled={!!record.deletedAt}
                  title="Delete Order"
                />
              </Popconfirm>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      {/* Page Header */}
      <div className="ds-page-header">
        <h1 className="ds-page-title">Orders</h1>
        {isAdmin && (
          <Button icon={<PlusOutlined />} className="ds-btn-primary" onClick={openCreateDrawer}>
            Create Order
          </Button>
        )}
      </div>

      {/* Filters */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #E2E8F0",
          borderRadius: 12,
          padding: "16px 20px",
          marginBottom: 20,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <Input.Search
          allowClear
          placeholder="Search Order ID / User ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={() => { setPage(1); fetchOrders(); }}
          style={{ width: 280, borderRadius: 8 }}
        />
        <Select
          style={{ width: 160 }}
          value={status}
          onChange={(val) => { setStatus(val); setPage(1); }}
        >
          <Option value="all">All Status</Option>
          <Option value="PENDING">Order Placed</Option>
          <Option value="OUT_FOR_DELIVERY">Out for Delivery</Option>
          <Option value="DELIVERED">Delivered</Option>
        </Select>
        <RangePicker onChange={(val) => { setRange(val as any); setPage(1); }} />
        <Button onClick={() => { setSearch(""); setStatus("all"); setRange(null); setPage(1); }}>
          Reset
        </Button>
      </div>

      {/* Table */}
      <div className="ds-table-wrapper">
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={orders}
          scroll={{ x: 1000 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t, r) => `${r[0]}-${r[1]} of ${t} orders`,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          }}
          locale={{
            emptyText: (
              <div className="ds-empty">
                <div className="ds-empty-icon">🛒</div>
                <div className="ds-empty-text">No orders found</div>
              </div>
            ),
          }}
        />
      </div>

      {/* Edit Status Modal */}
      <Modal
        title="Update Order Status"
        open={isEditModalVisible}
        onOk={handleEditModalOk}
        onCancel={() => setIsEditModalVisible(false)}
        okText="Update"
        okButtonProps={{ style: { background: "#0F172A", borderColor: "#0F172A" } }}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select>
              <Option value="PENDING">Order Placed</Option>
              <Option value="OUT_FOR_DELIVERY">Out for Delivery</Option>
              <Option value="DELIVERED">Delivered</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Order Drawer (restyled) */}
      <DrawerForm
        isOpen={isDrawerVisible}
        title="Create New Order"
        onClose={closeCreateDrawer}
        onSubmit={handleCreateOrder}
        isSubmitting={savingOrder}
        submitLabel="Create Order"
        width={680}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Step 1: Customer */}
          <div>
            <div className="ds-section-label">Step 1: Select Customer</div>
            <Select
              showSearch
              placeholder="Search user by name or email"
              style={{ width: "100%" }}
              onSearch={searchCustomers}
              onChange={setSelectedUserId}
              value={selectedUserId || undefined}
              filterOption={false}
              loading={loadingUsers}
            >
              {users.map((u) => (
                <Option key={u.id} value={u.id}>
                  {u.name || u.username} ({u.email || u.mobile})
                </Option>
              ))}
            </Select>
            {selectedUserId && (
              <div style={{ marginTop: 8 }}>
                <span className="ds-badge confirmed">Selected: {selectedUserId.substring(0, 8)}…</span>
              </div>
            )}
          </div>

          {/* Step 2: Delivery Address */}
          <div>
            <div className="ds-section-label">Step 2: Delivery Address</div>
            {loadingAddresses ? (
              <div style={{ marginTop: 8 }}><Spin size="small" /></div>
            ) : addresses.length > 0 ? (
              <Radio.Group
                style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}
                value={selectedAddressId}
                onChange={(e) => setSelectedAddressId(e.target.value)}
              >
                {addresses.map((a) => (
                  <Radio key={a.id} value={a.id}>
                    {a.street}, {a.city} {a.postalCode}
                  </Radio>
                ))}
              </Radio.Group>
            ) : selectedUserId ? (
              <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 8 }}>
                No saved addresses found. Using fallback.
              </p>
            ) : null}
          </div>

          {/* Step 3: Delivery Slot */}
          <div>
            <div className="ds-section-label">Step 3: Delivery Slot (Optional)</div>
            {loadingSlots ? (
              <div style={{ marginTop: 8 }}><Spin size="small" /></div>
            ) : slots.length > 0 ? (
              <Select
                style={{ width: "100%", marginTop: 8 }}
                placeholder="Select a slot"
                value={selectedSlotId || undefined}
                onChange={setSelectedSlotId}
                allowClear
              >
                {slots.map((s) => (
                  <Option key={s.id} value={s.id}>
                    {s.date ? dayjs(s.date).format("MMM D") : "Any"} | {s.startTime} - {s.endTime}
                  </Option>
                ))}
              </Select>
            ) : (
              <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 8 }}>No delivery slots available.</p>
            )}
          </div>

          {/* Step 4: Order Items */}
          <div>
            <div className="ds-section-label">Step 4: Order Items</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {orderItems.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: 10,
                    padding: 14,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: "#0F172A" }}>Item {idx + 1}</span>
                    {orderItems.length > 1 && (
                      <button
                        className="ds-copy-btn"
                        onClick={() => {
                          const newItems = [...orderItems];
                          newItems.splice(idx, 1);
                          setOrderItems(newItems);
                        }}
                        style={{ color: "#EF4444" }}
                      >
                        <CloseOutlined style={{ fontSize: 12 }} />
                      </button>
                    )}
                  </div>
                  <Select
                    showSearch
                    placeholder="Search product"
                    style={{ width: "100%", marginBottom: 10 }}
                    value={item.productId || undefined}
                    loading={loadingProducts}
                    filterOption={(input, option) =>
                      (option?.children as unknown as string)
                        ?.toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    onChange={(val) => {
                      const newItems = [...orderItems];
                      const product = products.find((p) => p.id === val);
                      newItems[idx] = {
                        ...item,
                        productId: val,
                        priceAtPurchase: product ? product.price : 0,
                      };
                      setOrderItems(newItems);
                    }}
                  >
                    {products.map((p) => (
                      <Option key={p.id} value={p.id}>
                        {p.name} — ₹{p.price}
                      </Option>
                    ))}
                  </Select>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    <div>
                      <label className="ds-label">Qty</label>
                      <input
                        className="ds-input"
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => {
                          const newItems = [...orderItems];
                          newItems[idx].quantity = Number(e.target.value) || 1;
                          setOrderItems(newItems);
                        }}
                      />
                    </div>
                    <div>
                      <label className="ds-label">Price (₹)</label>
                      <input
                        className="ds-input"
                        type="number"
                        value={item.priceAtPurchase}
                        onChange={(e) => {
                          const newItems = [...orderItems];
                          newItems[idx].priceAtPurchase = Number(e.target.value) || 0;
                          setOrderItems(newItems);
                        }}
                      />
                    </div>
                    <div>
                      <label className="ds-label">Subtotal</label>
                      <div
                        className="ds-input"
                        style={{ background: "#F1F5F9", color: "#64748B", cursor: "default" }}
                      >
                        ₹{(Number(item.priceAtPurchase) * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={() =>
                  setOrderItems([
                    ...orderItems,
                    { productId: "", quantity: 1, priceAtPurchase: 0 },
                  ])
                }
                style={{
                  border: "1px dashed #CBD5E1",
                  background: "transparent",
                  borderRadius: 8,
                  padding: "10px",
                  fontSize: 13,
                  color: "#64748B",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                + Add Another Item
              </button>
              <div style={{ textAlign: "right", paddingTop: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>
                  Grand Total: ₹{drawerTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Step 5: Notes */}
          <div>
            <div className="ds-section-label">Step 5: Notes (Optional)</div>
            <textarea
              className="ds-input"
              rows={3}
              placeholder="Add delivery notes or special instructions"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ resize: "vertical", minHeight: 80 }}
            />
          </div>
        </div>
      </DrawerForm>
    </div>
  );
}
