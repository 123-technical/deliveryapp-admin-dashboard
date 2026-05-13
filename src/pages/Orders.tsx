import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  DatePicker,
  Input,
  Select,
  Space,
  Table,
  Card,
  Typography,
  Tag,
  message,
  Modal,
  Form,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SyncOutlined,
  ShoppingOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { orderService } from "../services/orders";
import { useAuth } from "../contexts/AuthContext";
import type {
  Order,
  OrderWithItems,
  OrderStatus,
  OrdersQuery,
  UpdateOrderDto,
} from "../types/order";

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

const Orders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState<string>("");
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [userId, setUserId] = useState<string>("");
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sorter, setSorter] = useState<{
    sortBy?: keyof Order;
    sortOrder?: "ascend" | "descend";
  }>({});
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderWithItems | null>(null);
  const [editForm] = Form.useForm();
  const { user } = useAuth();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Dayjs>(dayjs());
  const [stats, setStats] = useState({
    pending: 0,
    processing: 0,
    delivered: 0,
    cancelled: 0,
  });

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const queryParams: OrdersQuery = useMemo(
    () => ({
      page,
      pageSize,
      search: search || undefined,
      status: status === "all" ? undefined : status,
      userId: userId || undefined,
      startDate: range?.[0]?.toISOString(),
      endDate: range?.[1]?.toISOString(),
      sortBy: sorter.sortBy,
      sortOrder: sorter.sortOrder,
    }),
    [page, pageSize, search, status, userId, range, sorter]
  );

  // Helper function to check if a string is a valid UUID
  const isValidUUID = (str: string): boolean => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str.trim());
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      // If search is a valid UUID, fetch by ID instead
      if (search && isValidUUID(search)) {
        try {
          const order = await orderService.getOrderById(search.trim());
          setOrders([order]);
          setTotal(1);
        } catch (error) {
          console.error("Failed to fetch order by ID:", error);
          message.error("Order not found");
          setOrders([]);
          setTotal(0);
        }
      } else {
        // Otherwise, use the general search
        const response = await orderService.getOrders(queryParams);
        setOrders(response.data || []);
        setTotal(response.total || 0);
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      message.error("Failed to fetch orders");
      setOrders([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [queryParams, search]);

  useEffect(() => {
    fetchOrders();
    setLastRefreshed(dayjs());
  }, [fetchOrders]);

  // Polling for new orders
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchOrders();
        setLastRefreshed(dayjs());
      }, 30000); // Refresh every 30 seconds
    }
    return () => clearInterval(interval);
  }, [autoRefresh, fetchOrders]);

  // Update stats whenever orders change
  useEffect(() => {
    if (orders.length > 0) {
      const newStats = orders.reduce(
        (acc, order) => {
          if (order.status === "PENDING") acc.pending++;
          if (order.status === "PROCESSING") acc.processing++;
          if (order.status === "DELIVERED") acc.delivered++;
          if (order.status === "CANCELLED") acc.cancelled++;
          return acc;
        },
        { pending: 0, processing: 0, delivered: 0, cancelled: 0 }
      );
      setStats(newStats);
    }
  }, [orders]);

  const handleEdit = (order: OrderWithItems) => {
    setEditingOrder(order);
    editForm.setFieldsValue({
      status: order.status,
      notes: order.notes,
      deliveryPersonnelId: order.deliveryPersonnelId,
    });
    setIsEditModalVisible(true);
  };

  const handleEditModalOk = async () => {
    try {
      const values = await editForm.validateFields();
      if (editingOrder) {
        const updateData: UpdateOrderDto = {
          status: values.status,
          notes: values.notes,
          deliveryPersonnelId: values.deliveryPersonnelId,
        };

        await orderService.updateOrder(editingOrder.id, updateData);
        message.success("Order updated successfully");
        setIsEditModalVisible(false);
        editForm.resetFields();
        setEditingOrder(null);
        fetchOrders();
      }
    } catch (error) {
      console.error("Failed to update order:", error);
      message.error("Failed to update order");
    }
  };

  const handleEditModalCancel = () => {
    setIsEditModalVisible(false);
    editForm.resetFields();
    setEditingOrder(null);
  };

  const handleDelete = async (orderId: string) => {
    try {
      await orderService.deleteOrder(orderId);
      message.success("Order deleted successfully");
      fetchOrders();
    } catch (error) {
      console.error("Failed to delete order:", error);
      message.error("Failed to delete order");
    }
  };

  const handleViewDetails = (orderId: string) => {
    navigate(`/order/${orderId}`);
  };



  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 100,
      render: (id: string) => (
        <Typography.Text
          copyable={{ text: id }}
          style={{ fontFamily: "monospace", fontSize: "12px" }}
        >
          {id.substring(0, 8)}...
        </Typography.Text>
      ),
    },
    {
      title: "Order Number",
      dataIndex: "orderNumber",
      key: "orderNumber",
      width: 140,
      fixed: "left" as const,
      ellipsis: true,
      render: (orderNumber: string, record: OrderWithItems) => (
        <Button
          type="link"
          onClick={() => handleViewDetails(record.id)}
          style={{ padding: 0, height: "auto" }}
        >
          <Typography.Text
            copyable={{ text: orderNumber }}
            style={{ fontFamily: "monospace", fontSize: "12px" }}
            ellipsis={{ tooltip: orderNumber }}
          >
            {orderNumber.substring(0, 12)}...
          </Typography.Text>
        </Button>
      ),
      sorter: (a: OrderWithItems, b: OrderWithItems) =>
        a.orderNumber.localeCompare(b.orderNumber),
    },
    {
      title: "User ID",
      dataIndex: "userId",
      key: "userId",
      width: 120,
      ellipsis: true,
      render: (userId: string) => (
        <Typography.Text
          copyable={{ text: userId }}
          style={{ fontFamily: "monospace", fontSize: "12px" }}
          ellipsis={{ tooltip: userId }}
        >
          {userId.substring(0, 8)}...
        </Typography.Text>
      ),
    },
    {
      title: "Items",
      key: "items",
      width: 80,
      render: (_: unknown, record: OrderWithItems) => (
        <Tag color="blue">{record.items?.length || 0}</Tag>
      ),
    },
    // {
    //   title: "Total Amount",
    //   dataIndex: "totalAmount",
    //   key: "totalAmount",
    //   width: 120,
    //   render: (amount: string) => `₹${parseFloat(amount).toFixed(2)}`,
    //   sorter: (a: OrderWithItems, b: OrderWithItems) =>
    //     parseFloat(a.totalAmount) - parseFloat(b.totalAmount),
    // },
    // {
    //   title: "Discount",
    //   dataIndex: "discountAmount",
    //   key: "discountAmount",
    //   width: 120,
    //   render: (amount: string) => `₹${parseFloat(amount).toFixed(2)}`,
    //   sorter: (a: OrderWithItems, b: OrderWithItems) =>
    //     parseFloat(a.discountAmount) - parseFloat(b.discountAmount),
    // },
    {
      title: "Final Amount",
      dataIndex: "finalAmount",
      key: "finalAmount",
      width: 120,
      render: (amount: string) => (
        <Text strong style={{ color: "#4f46e5" }}>
          ₹{parseFloat(amount).toFixed(2)}
        </Text>
      ),
      sorter: (a: OrderWithItems, b: OrderWithItems) =>
        parseFloat(a.finalAmount) - parseFloat(b.finalAmount),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (status: string) => {
        // Handle status values that might not be in OrderStatus type (like "PAID")
        const statusMap: Record<string, { label: string; color: string }> = {
          PENDING: { label: "Pending", color: "orange" },
          CONFIRMED: { label: "Confirmed", color: "blue" },
          PROCESSING: { label: "Processing", color: "cyan" },
          SHIPPED: { label: "Shipped", color: "purple" },
          DELIVERED: { label: "Delivered", color: "green" },
          CANCELLED: { label: "Cancelled", color: "red" },
          REFUNDED: { label: "Refunded", color: "volcano" },
          PAID: { label: "Paid", color: "green" },
        };
        const statusInfo = statusMap[status] || {
          label: status,
          color: "default",
        };
        return <Tag color={statusInfo.color as any}>{statusInfo.label}</Tag>;
      },
      filters: [
        { text: "Pending", value: "PENDING" },
        { text: "Confirmed", value: "CONFIRMED" },
        { text: "Processing", value: "PROCESSING" },
        { text: "Shipped", value: "SHIPPED" },
        { text: "Delivered", value: "DELIVERED" },
        { text: "Cancelled", value: "CANCELLED" },
        { text: "Refunded", value: "REFUNDED" },
        { text: "Paid", value: "PAID" },
      ],
      onFilter: (value: boolean | React.Key, record: OrderWithItems) =>
        record.status === value,
    },
    // {
    //   title: "Delivery Address ID",
    //   dataIndex: "deliveryAddressId",
    //   key: "deliveryAddressId",
    //   width: 150,
    //   ellipsis: true,
    //   render: (addressId: string) => (
    //     <Typography.Text
    //       copyable={{ text: addressId }}
    //       style={{ fontFamily: "monospace", fontSize: "12px" }}
    //       ellipsis={{ tooltip: addressId }}
    //     >
    //       {addressId.substring(0, 8)}...
    //     </Typography.Text>
    //   ),
    // },
    // {
    //   title: "Delivery Slot ID",
    //   dataIndex: "deliverySlotId",
    //   key: "deliverySlotId",
    //   width: 150,
    //   ellipsis: true,
    //   render: (slotId: string | null) =>
    //     slotId ? (
    //       <Typography.Text
    //         copyable={{ text: slotId }}
    //         style={{ fontFamily: "monospace", fontSize: "12px" }}
    //         ellipsis={{ tooltip: slotId }}
    //       >
    //         {slotId.substring(0, 8)}...
    //       </Typography.Text>
    //     ) : (
    //       <Typography.Text type="secondary">-</Typography.Text>
    //     ),
    // },
    // {
    //   title: "Delivery Personnel",
    //   dataIndex: "deliveryPersonnelId",
    //   key: "deliveryPersonnelId",
    //   width: 150,
    //   ellipsis: true,
    //   render: (personnelId: string | null) =>
    //     personnelId ? (
    //       <Typography.Text
    //         copyable={{ text: personnelId }}
    //         style={{ fontFamily: "monospace", fontSize: "12px" }}
    //         ellipsis={{ tooltip: personnelId }}
    //       >
    //         {personnelId.substring(0, 8)}...
    //       </Typography.Text>
    //     ) : (
    //       <Typography.Text type="secondary">-</Typography.Text>
    //     ),
    // },
    // {
    //   title: "Notes",
    //   dataIndex: "notes",
    //   key: "notes",
    //   width: 200,
    //   ellipsis: true,
    //   render: (notes: string | null) => notes || "-",
    // },
    {
      title: "Order Status",
      key: "orderStatus",
      width: 100,
      render: (_: unknown, record: OrderWithItems) => (
        <Typography.Text
          type={record.deletedAt ? "danger" : "success"}
          style={{ fontWeight: 500 }}
        >
          {record.deletedAt ? "Deleted" : "Active"}
        </Typography.Text>
      ),
    },
    // {
    //   title: "Created At",
    //   dataIndex: "createdAt",
    //   key: "createdAt",
    //   width: 150,
    //   render: (date: string) => dayjs(date).format("YYYY-MM-DD HH:mm"),
    //   sorter: (a: OrderWithItems, b: OrderWithItems) =>
    //     new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    // },
    // {
    //   title: "Updated At",
    //   dataIndex: "updatedAt",
    //   key: "updatedAt",
    //   width: 150,
    //   render: (date: string) => dayjs(date).format("YYYY-MM-DD HH:mm"),
    //   sorter: (a: OrderWithItems, b: OrderWithItems) =>
    //     new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
    // },
    // {
    //   title: "Deleted At",
    //   dataIndex: "deletedAt",
    //   key: "deletedAt",
    //   width: 150,
    //   render: (date: string | null) =>
    //     date ? dayjs(date).format("YYYY-MM-DD HH:mm") : "-",
    //   sorter: (a: OrderWithItems, b: OrderWithItems) => {
    //     if (!a.deletedAt && !b.deletedAt) return 0;
    //     if (!a.deletedAt) return 1;
    //     if (!b.deletedAt) return -1;
    //     return (
    //       new Date(a.deletedAt).getTime() - new Date(b.deletedAt).getTime()
    //     );
    
    //   },
    // },
    {
      title: "Actions",
      key: "actions",
      width: 180,
      fixed: "right" as const,
      render: (_: unknown, record: OrderWithItems) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record.id)}
          >
            View
          </Button>
          {isAdmin && (
            <>
              <Button
                type="default"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
                disabled={!!record.deletedAt}
              >
                Edit
              </Button>
              <Popconfirm
                title="Delete Order"
                description="Are you sure you want to delete this order? This action cannot be undone."
                onConfirm={() => handleDelete(record.id)}
                okText="Yes, Delete"
                cancelText="Cancel"
                okType="danger"
                disabled={!!record.deletedAt}
              >
                <Button
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  disabled={!!record.deletedAt}
                >
                  Delete
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px", maxWidth: "1600px", margin: "0 auto" }}>
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>
              Orders Management
            </Title>
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                Manage and track all orders in the system
              </Text>
              <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: "12px" }}>
                <Tag icon={autoRefresh ? <SyncOutlined spin /> : <SyncOutlined />} color={autoRefresh ? "processing" : "default"}>
                  {autoRefresh ? "Live Updates On" : "Live Updates Off"}
                </Tag>
                <Text type="secondary" style={{ fontSize: "12px" }}>
                  Last synced: {lastRefreshed.format("HH:mm:ss")}
                </Text>
              </div>
            </div>
          </div>
          <Space>
            <Button
              icon={<SyncOutlined />}
              onClick={() => {
                fetchOrders();
                setLastRefreshed(dayjs());
              }}
              loading={loading}
            >
              Refresh
            </Button>
            <Button
              type={autoRefresh ? "default" : "primary"}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? "Pause Live" : "Resume Live"}
            </Button>
            {isAdmin && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate("/orders/add")}
              >
                Create Order
              </Button>
            )}
          </Space>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <Card bordered={false} className="stat-card" style={{ background: "#fff7e6" }}>
          <Space align="start">
            <div style={{ padding: "12px", background: "#ffe7ba", borderRadius: "8px" }}>
              <ClockCircleOutlined style={{ fontSize: "24px", color: "#d46b08" }} />
            </div>
            <div>
              <Text type="secondary">Pending Orders</Text>
              <Title level={3} style={{ margin: 0 }}>{stats.pending}</Title>
            </div>
          </Space>
        </Card>
        <Card bordered={false} className="stat-card" style={{ background: "#e6f7ff" }}>
          <Space align="start">
            <div style={{ padding: "12px", background: "#bae7ff", borderRadius: "8px" }}>
              <ShoppingOutlined style={{ fontSize: "24px", color: "#096dd9" }} />
            </div>
            <div>
              <Text type="secondary">Processing</Text>
              <Title level={3} style={{ margin: 0 }}>{stats.processing}</Title>
            </div>
          </Space>
        </Card>
        <Card bordered={false} className="stat-card" style={{ background: "#f6ffed" }}>
          <Space align="start">
            <div style={{ padding: "12px", background: "#d9f7be", borderRadius: "8px" }}>
              <CheckCircleOutlined style={{ fontSize: "24px", color: "#389e0d" }} />
            </div>
            <div>
              <Text type="secondary">Delivered</Text>
              <Title level={3} style={{ margin: 0 }}>{stats.delivered}</Title>
            </div>
          </Space>
        </Card>
        <Card bordered={false} className="stat-card" style={{ background: "#fff1f0" }}>
          <Space align="start">
            <div style={{ padding: "12px", background: "#ffccc7", borderRadius: "8px" }}>
              <CloseCircleOutlined style={{ fontSize: "24px", color: "#cf1322" }} />
            </div>
            <div>
              <Text type="secondary">Cancelled</Text>
              <Title level={3} style={{ margin: 0 }}>{stats.cancelled}</Title>
            </div>
          </Space>
        </Card>
      </div>

      <Card style={{ marginBottom: "24px" }} bodyStyle={{ padding: "16px" }}>
        <Space wrap size="middle">
          <Input.Search
            allowClear
            placeholder="Search Order ID / Number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={() => {
              setPage(1);
              fetchOrders();
            }}
            style={{ width: 280 }}
          />
          <Select<OrderStatus | "all">
            style={{ width: 150 }}
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            options={[
              { label: "All Status", value: "all" },
              { label: "Pending", value: "PENDING" },
              { label: "Confirmed", value: "CONFIRMED" },
              { label: "Processing", value: "PROCESSING" },
              { label: "Shipped", value: "SHIPPED" },
              { label: "Delivered", value: "DELIVERED" },
              { label: "Cancelled", value: "CANCELLED" },
              { label: "Refunded", value: "REFUNDED" },
            ]}
          />
          <Input
            placeholder="User ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            style={{ width: 180 }}
          />
          <RangePicker
            onChange={(value) => {
              setRange(value as [Dayjs | null, Dayjs | null] | null);
              setPage(1);
            }}
            allowEmpty={[true, true]}
          />
          <Button
            type="dashed"
            onClick={() => {
              setSearch("");
              setStatus("all");
              setUserId("");
              setRange(null);
              setPage(1);
              setSorter({});
            }}
          >
            Reset Filters
          </Button>
        </Space>
      </Card>

      <Card bodyStyle={{ padding: 0 }}>
        <Table<OrderWithItems>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={orders}
          size="middle"
          scroll={{ x: 1800 }}
          pagination={{
            current: page,
            pageSize,
            total: total,
            responsive: true,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} orders`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          onChange={(_pagination, _filters, sorter) => {
            if (!Array.isArray(sorter)) {
              setSorter({
                sortBy: (sorter.field as keyof Order) || undefined,
                sortOrder: sorter.order || undefined,
              });
            }
          }}
        />
      </Card>
      {/* Edit Order Modal */}
      {isAdmin && (
        <Modal
          title="Edit Order"
          open={isEditModalVisible}
          onOk={handleEditModalOk}
          onCancel={handleEditModalCancel}
          okText="Update"
          cancelText="Cancel"
        >
          <Form form={editForm} layout="vertical" name="editOrderForm">
            <Form.Item
              name="status"
              label="Order Status"
              rules={[
                { required: true, message: "Please select order status!" },
              ]}
            >
              <Select
                placeholder="Select status"
                options={[
                  { label: "Pending", value: "PENDING" },
                  { label: "Confirmed", value: "CONFIRMED" },
                  { label: "Processing", value: "PROCESSING" },
                  { label: "Shipped", value: "SHIPPED" },
                  { label: "Delivered", value: "DELIVERED" },
                  { label: "Cancelled", value: "CANCELLED" },
                  { label: "Refunded", value: "REFUNDED" },
                ]}
              />
            </Form.Item>
            <Form.Item name="notes" label="Notes">
              <Input.TextArea placeholder="Enter order notes" rows={3} />
            </Form.Item>
            <Form.Item name="deliveryPersonnelId" label="Delivery Personnel ID">
              <Input placeholder="Enter delivery personnel ID (optional)" />
            </Form.Item>
          </Form>
        </Modal>
      )}
    </div>
  );
};

export default Orders;
