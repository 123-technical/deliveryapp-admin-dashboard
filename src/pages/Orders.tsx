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
  Tag,
  message,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { orderService } from "../services/orders";
import { useAuth } from "../contexts/AuthContext";
import type {
  Order,
  OrderChannel,
  OrderStatus,
  OrdersQuery,
} from "../types/order";
import StatusBadge from "../components/StatusBadge";
import { confirmCancelOrder } from "../components/orders/confirmCancelOrder";
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
  const [channel, setChannel] = useState<OrderChannel | "all">("all");
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Edit Status Modal
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editForm] = Form.useForm();

  const queryParams: OrdersQuery = useMemo(
    () => ({
      page,
      pageSize,
      search: search || undefined,
      status: status === "all" ? undefined : status,
      channel: channel === "all" ? undefined : channel,
      startDate: range?.[0]?.toISOString(),
      endDate: range?.[1]?.toISOString(),
    }),
    [page, pageSize, search, status, channel, range]
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
    let values: { status: OrderStatus };
    try {
      values = await editForm.validateFields();
    } catch {
      return; // form shows its own validation message
    }
    if (!editingOrder || values.status === editingOrder.status) {
      setIsEditModalVisible(false);
      return;
    }
    const save = async (cancelReason?: string) => {
      try {
        await orderService.updateOrder(editingOrder.id, { status: values.status, cancelReason });
        message.success("Order status updated successfully");
        setIsEditModalVisible(false);
        fetchOrders();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "Failed to update order status");
      }
    };
    if (values.status !== "CANCELLED") return save();
    confirmCancelOrder(save);
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

  // ── Columns ──
  const columns = [
    {
      title: "Order ID",
      dataIndex: "id",
      key: "id",
      width: 120,
      render: (id: string, record: Order) => (
        <div>
          <CopyableId id={id} />
          {record.channel === "COUNTER" && <Tag color="purple" style={{ marginTop: 4 }}>Counter</Tag>}
        </div>
      ),
    },
    {
      title: "Customer",
      key: "customer",
      render: (_: any, record: Order) => {
        const name = record.user?.name || record.user?.mobile || "Unknown";
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
        <Select
          style={{ width: 150 }}
          value={channel}
          onChange={(val) => { setChannel(val); setPage(1); }}
          options={[
            { value: "all", label: "All channels" },
            { value: "ONLINE", label: "Online" },
            { value: "COUNTER", label: "Counter" },
          ]}
        />
        <RangePicker onChange={(val) => { setRange(val as any); setPage(1); }} />
        <Button onClick={() => { setSearch(""); setStatus("all"); setChannel("all"); setRange(null); setPage(1); }}>
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
              <Option value="CANCELLED">Cancelled (returns stock)</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
