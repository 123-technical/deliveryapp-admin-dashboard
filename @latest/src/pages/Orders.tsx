import { useState, useEffect, useMemo } from "react";
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
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { orderService } from "../services/orders";
import { useAuth } from "../contexts/AuthContext";
import type {
  Order,
  OrderStatus,
  OrdersQuery,
  OrdersResponse,
  UpdateOrderDto,
} from "../types/order";

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const Orders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
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
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editForm] = Form.useForm();
  const { user } = useAuth();

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

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await orderService.getOrders(queryParams);
      setOrders(response.data || []);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      message.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [queryParams]);

  const handleEdit = (order: Order) => {
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

  const getStatusColor = (status: OrderStatus) => {
    const colors: Record<OrderStatus, string> = {
      PENDING: "orange",
      CONFIRMED: "blue",
      PROCESSING: "cyan",
      SHIPPED: "purple",
      DELIVERED: "green",
      CANCELLED: "red",
      REFUNDED: "volcano",
    };
    return colors[status] || "default";
  };

  const columns = [
    {
      title: "Order Number",
      dataIndex: "orderNumber",
      key: "orderNumber",
      width: 140,
      fixed: "left",
      render: (orderNumber: string, record: Order) => (
        <Button
          type="link"
          onClick={() => handleViewDetails(record.id)}
          style={{ padding: 0 }}
        >
          {orderNumber}
        </Button>
      ),
    },
    {
      title: "Date & Time",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (date: string) => dayjs(date).format("YYYY-MM-DD HH:mm"),
      sorter: true,
    },
    {
      title: "User ID",
      dataIndex: "userId",
      key: "userId",
      width: 200,
      render: (userId: string) => <Text code>{userId}</Text>,
    },
    {
      title: "Total Amount",
      dataIndex: "totalAmount",
      key: "totalAmount",
      width: 120,
      render: (amount: string) => `₹${parseFloat(amount).toFixed(2)}`,
      sorter: true,
    },
    {
      title: "Final Amount",
      dataIndex: "finalAmount",
      key: "finalAmount",
      width: 120,
      render: (amount: string) => `₹${parseFloat(amount).toFixed(2)}`,
      sorter: true,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: OrderStatus) => (
        <Tag color={getStatusColor(status)}>{status.replace("_", " ")}</Tag>
      ),
      filters: [
        { text: "Pending", value: "PENDING" },
        { text: "Confirmed", value: "CONFIRMED" },
        { text: "Processing", value: "PROCESSING" },
        { text: "Shipped", value: "SHIPPED" },
        { text: "Delivered", value: "DELIVERED" },
        { text: "Cancelled", value: "CANCELLED" },
        { text: "Refunded", value: "REFUNDED" },
      ],
    },
    {
      title: "Delivery Personnel",
      dataIndex: "deliveryPersonnelId",
      key: "deliveryPersonnelId",
      width: 150,
      render: (personnelId: string | null) =>
        personnelId ? <Text code>{personnelId}</Text> : "-",
    },
    {
      title: "Notes",
      dataIndex: "notes",
      key: "notes",
      width: 200,
      ellipsis: true,
      render: (notes: string | null) => notes || "-",
    },
    {
      title: "Actions",
      key: "actions",
      width: 150,
      fixed: "right",
      render: (_: any, record: Order) => (
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
              >
                <Button danger size="small" icon={<DeleteOutlined />}>
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
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: "24px" }}>
        <Title level={2} style={{ margin: 0 }}>
          Orders Management
        </Title>
        <Text type="secondary">Manage and track all orders in the system</Text>
      </div>

      <Card style={{ marginBottom: "24px" }}>
        <Space wrap>
          <Input.Search
            allowClear
            placeholder="Search by order number, user ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={() => {
              setPage(1);
              fetchOrders();
            }}
            style={{ width: 280 }}
          />
          <Select<OrderStatus | "all">
            style={{ width: 160 }}
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
            placeholder="Filter by User ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            style={{ width: 200 }}
          />
          <RangePicker
            onChange={(value) => {
              setRange(value as [Dayjs | null, Dayjs | null] | null);
              setPage(1);
            }}
            allowEmpty={[true, true]}
          />
          <Button
            onClick={() => {
              setSearch("");
              setStatus("all");
              setUserId("");
              setRange(null);
              setPage(1);
              setSorter({});
            }}
          >
            Reset
          </Button>
        </Space>
      </Card>

      <Card>
        <Table<Order>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={orders}
          size="middle"
          scroll={{ x: "max-content" }}
          pagination={{
            current: page,
            pageSize,
            total: orders.length,
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
          onChange={(pagination, _filters, sorter) => {
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
