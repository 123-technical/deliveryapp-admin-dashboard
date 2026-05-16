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
  Drawer,
  Radio,
  Spin,
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SyncOutlined,
  CopyOutlined,
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
  UpdateOrderDto,
  CreateOrderDto,
} from "../types/order";
import type { Product } from "../types/product";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

// Helper function to check if a string is a valid UUID
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str.trim());
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    PENDING: "orange",
    CONFIRMED: "blue",
    PROCESSING: "cyan",
    OUT_FOR_DELIVERY: "orange",
    SHIPPED: "purple",
    DELIVERED: "green",
    CANCELLED: "red",
    REFUNDED: "volcano",
  };
  return colors[status] || "default";
};

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
  
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editForm] = Form.useForm();

  // Create Order Drawer state
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [drawerStep, setDrawerStep] = useState(1);

  // Drawer Form State
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
        } catch (error) {
          message.error("Order not found");
          setOrders([]);
          setTotal(0);
        }
      } else {
        const response = await orderService.getOrders(queryParams);
        setOrders(response.data || []);
        setTotal(response.total || 0);
      }
    } catch (error) {
      message.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, [queryParams, search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Handle Edit Status
  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    editForm.setFieldsValue({
      status: order.status,
    });
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
    } catch (error) {
      message.error("Failed to update order status");
    }
  };

  const handleDelete = async (orderId: string) => {
    try {
      await orderService.deleteOrder(orderId);
      message.success("Order deleted successfully");
      fetchOrders();
    } catch (error) {
      message.error("Failed to delete order");
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    message.success("Order ID copied");
  };

  // Create Order Drawer Logic
  const openCreateDrawer = () => {
    setIsDrawerVisible(true);
    setDrawerStep(1);
    setSelectedUserId("");
    setSelectedAddressId("");
    setSelectedSlotId("");
    setOrderItems([{ productId: "", quantity: 1, priceAtPurchase: 0 }]);
    setNotes("");
    fetchProducts();
  };

  const closeCreateDrawer = () => {
    setIsDrawerVisible(false);
  };

  const searchCustomers = async (searchTerm: string) => {
    if (!searchTerm) {
      setUsers([]);
      return;
    }
    setLoadingUsers(true);
    try {
      const response = await fetchCustomers({ page: 1, pageSize: 20, search: searchTerm });
      setUsers(response.data || []);
    } catch (error) {
      message.error("Failed to search customers");
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchAddresses = async (uid: string) => {
    setLoadingAddresses(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
      const token = localStorage.getItem("token"); // use your authService getter
      const res = await fetch(`${API_BASE_URL}/api/v1/users/${uid}/addresses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAddresses(Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []));
      } else {
        setAddresses([]);
      }
    } catch {
      setAddresses([]);
    } finally {
      setLoadingAddresses(false);
    }
  };

  // Mocking slots fetch as per instructions, or check endpoint
  const fetchSlots = async () => {
    setLoadingSlots(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/v1/delivery-slots`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSlots(Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []));
      } else {
        setSlots([]);
      }
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    if (selectedUserId) {
      fetchAddresses(selectedUserId);
      fetchSlots();
    }
  }, [selectedUserId]);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const response = await productService.getProducts({ page: 1, pageSize: 100, isAvailable: true });
      setProducts(response.data || []);
    } catch {
      message.error("Failed to fetch products");
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!selectedUserId) return message.error("Please select a customer");
    if (!selectedAddressId && addresses.length > 0) return message.error("Please select a delivery address");
    if (orderItems.some(item => !item.productId || item.quantity < 1)) {
      return message.error("Please complete all order items");
    }

    setSavingOrder(true);
    try {
      const payload: CreateOrderDto = {
        userId: selectedUserId,
        deliveryAddressId: selectedAddressId || "manual-address", // fallback if none returned
        deliverySlotId: selectedSlotId || undefined,
        notes: notes,
        orderItems: orderItems.map(item => ({
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

  const drawerTotal = orderItems.reduce((acc, item) => acc + (Number(item.priceAtPurchase) * item.quantity), 0);

  const columns = [
    {
      title: "Order ID",
      dataIndex: "id",
      key: "id",
      render: (id: string) => (
        <Space>
          <Text code>{id.substring(0, 8)}</Text>
          <Tooltip title="Copy ID">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopyId(id)}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: "Customer",
      key: "customer",
      render: (_: any, record: Order) => {
        const name = record.user?.name || "Unknown";
        const email = record.user?.email || "No email";
        return (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Text strong>{name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{email}</Text>
          </div>
        );
      },
    },
    {
      title: "Items",
      key: "items",
      render: (_: any, record: Order) => {
        const count = record.orderItems?.length || record.items?.length || 0;
        return <Text>{count} {count === 1 ? "item" : "items"}</Text>;
      },
    },
    {
      title: "Total Amount",
      dataIndex: "finalAmount",
      key: "finalAmount",
      render: (amount: string) => <Text strong>₹{parseFloat(amount || "0").toFixed(2)}</Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status.replace(/_/g, " ")}
        </Tag>
      ),
    },
    {
      title: "Delivery Slot",
      key: "deliverySlot",
      render: (_: any, record: Order) => {
        const slot = record.deliverySlot;
        if (!slot || !slot.date) return <Text type="secondary">-</Text>;
        return <Text>{dayjs(slot.date).format("MMM D")} {slot.startTime}-{slot.endTime}</Text>;
      },
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => <Text>{dayjs(date).format("DD MMM YYYY, HH:mm")}</Text>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: Order) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            onClick={() => navigate(`/orders/${record.id}`)}
          >
            View
          </Button>
          {isAdmin && (
            <>
              <Button
                type="default"
                size="small"
                onClick={() => handleEdit(record)}
                disabled={!!record.deletedAt}
              >
                Edit Status
              </Button>
              <Popconfirm
                title="Delete Order"
                description="Are you sure you want to delete this order?"
                onConfirm={() => handleDelete(record.id)}
                okText="Yes"
                cancelText="No"
                okType="danger"
                disabled={!!record.deletedAt}
              >
                <Button
                  danger
                  size="small"
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
    <div style={{ padding: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Orders Management</Title>
        {isAdmin && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer}>
            Create Order
          </Button>
        )}
      </div>

      <Card style={{ marginBottom: 24 }} bodyStyle={{ padding: 16 }}>
        <Space wrap>
          <Input.Search
            allowClear
            placeholder="Search Order ID / User ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={() => {
              setPage(1);
              fetchOrders();
            }}
            style={{ width: 280 }}
          />
          <Select
            style={{ width: 150 }}
            value={status}
            onChange={(val) => {
              setStatus(val);
              setPage(1);
            }}
          >
            <Option value="all">All Status</Option>
            <Option value="PENDING">Pending</Option>
            <Option value="CONFIRMED">Confirmed</Option>
            <Option value="PROCESSING">Processing</Option>
            <Option value="OUT_FOR_DELIVERY">Out for Delivery</Option>
            <Option value="DELIVERED">Delivered</Option>
            <Option value="CANCELLED">Cancelled</Option>
          </Select>
          <RangePicker
            onChange={(val) => {
              setRange(val as any);
              setPage(1);
            }}
          />
          <Button
            onClick={() => {
              setSearch("");
              setStatus("all");
              setRange(null);
              setPage(1);
            }}
          >
            Reset
          </Button>
        </Space>
      </Card>

      <Card bodyStyle={{ padding: 0 }}>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={orders}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>

      {/* Edit Status Modal */}
      <Modal
        title="Update Order Status"
        open={isEditModalVisible}
        onOk={handleEditModalOk}
        onCancel={() => setIsEditModalVisible(false)}
        okText="Update"
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select>
              <Option value="PENDING">Pending</Option>
              <Option value="CONFIRMED">Confirmed</Option>
              <Option value="PROCESSING">Processing</Option>
              <Option value="OUT_FOR_DELIVERY">Out for Delivery</Option>
              <Option value="DELIVERED">Delivered</Option>
              <Option value="CANCELLED">Cancelled</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Order Drawer */}
      <Drawer
        title="Create New Order"
        width={480}
        onClose={closeCreateDrawer}
        open={isDrawerVisible}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Button onClick={closeCreateDrawer} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button onClick={handleCreateOrder} type="primary" loading={savingOrder}>
              Create Order
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Step 1 */}
          <div>
            <Text strong>Step 1: Select Customer</Text>
            <Select
              showSearch
              placeholder="Search user by name or email"
              style={{ width: '100%', marginTop: 8 }}
              onSearch={searchCustomers}
              onChange={setSelectedUserId}
              value={selectedUserId || undefined}
              filterOption={false}
              loading={loadingUsers}
            >
              {users.map(u => (
                <Option key={u.id} value={u.id}>
                  {u.name || u.email} ({u.email})
                </Option>
              ))}
            </Select>
            {selectedUserId && (
              <Tag color="blue" style={{ marginTop: 8 }}>
                Selected User ID: {selectedUserId}
              </Tag>
            )}
          </div>

          {/* Step 2 */}
          <div>
            <Text strong>Step 2: Select Delivery Address</Text>
            {loadingAddresses ? <div style={{ marginTop: 8 }}><Spin size="small" /></div> : (
              addresses.length > 0 ? (
                <Radio.Group 
                  style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}
                  value={selectedAddressId} 
                  onChange={e => setSelectedAddressId(e.target.value)}
                >
                  {addresses.map(a => (
                    <Radio key={a.id} value={a.id}>
                      {a.street}, {a.city} {a.postalCode}
                    </Radio>
                  ))}
                </Radio.Group>
              ) : selectedUserId ? (
                <div style={{ marginTop: 8 }}><Text type="secondary">No saved addresses found. Using manual address fallback.</Text></div>
              ) : null
            )}
          </div>

          {/* Step 3 */}
          <div>
            <Text strong>Step 3: Select Delivery Slot (Optional)</Text>
            {loadingSlots ? <div style={{ marginTop: 8 }}><Spin size="small" /></div> : (
              slots.length > 0 ? (
                <Select
                  style={{ width: '100%', marginTop: 8 }}
                  placeholder="Select a slot"
                  value={selectedSlotId || undefined}
                  onChange={setSelectedSlotId}
                  allowClear
                >
                  {slots.map(s => (
                    <Option key={s.id} value={s.id}>
                      {s.date ? dayjs(s.date).format("MMM D") : "Any"} | {s.startTime} - {s.endTime}
                    </Option>
                  ))}
                </Select>
              ) : (
                <div style={{ marginTop: 8 }}><Text type="secondary">No delivery slots available.</Text></div>
              )
            )}
          </div>

          {/* Step 4 */}
          <div>
            <Text strong>Step 4: Order Items</Text>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {orderItems.map((item, idx) => (
                <Card size="small" key={idx} bodyStyle={{ padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text strong>Item {idx + 1}</Text>
                    {orderItems.length > 1 && (
                      <Button type="text" danger size="small" icon={<CloseOutlined />} onClick={() => {
                        const newItems = [...orderItems];
                        newItems.splice(idx, 1);
                        setOrderItems(newItems);
                      }} />
                    )}
                  </div>
                  
                  <Select
                    showSearch
                    placeholder="Search product"
                    style={{ width: '100%', marginBottom: 8 }}
                    value={item.productId || undefined}
                    loading={loadingProducts}
                    filterOption={(input, option) =>
                      (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                    }
                    onChange={(val) => {
                      const newItems = [...orderItems];
                      const product = products.find(p => p.id === val);
                      newItems[idx] = { ...item, productId: val, priceAtPurchase: product ? product.price : 0 };
                      setOrderItems(newItems);
                    }}
                  >
                    {products.map(p => (
                      <Option key={p.id} value={p.id}>
                        {p.name} - ₹{p.price}
                      </Option>
                    ))}
                  </Select>
                  
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Qty</Text>
                      <Input 
                        type="number" 
                        min={1} 
                        value={item.quantity}
                        onChange={e => {
                          const newItems = [...orderItems];
                          newItems[idx].quantity = Number(e.target.value) || 1;
                          setOrderItems(newItems);
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Price (₹)</Text>
                      <Input 
                        type="number" 
                        value={item.priceAtPurchase}
                        onChange={e => {
                          const newItems = [...orderItems];
                          newItems[idx].priceAtPurchase = Number(e.target.value) || 0;
                          setOrderItems(newItems);
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Subtotal</Text>
                      <div style={{ padding: "4px 11px", background: "#f5f5f5", border: "1px solid #d9d9d9", borderRadius: 6 }}>
                        ₹{(Number(item.priceAtPurchase) * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              <Button type="dashed" onClick={() => setOrderItems([...orderItems, { productId: "", quantity: 1, priceAtPurchase: 0 }])}>
                + Add Another Item
              </Button>
            </div>
            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <Text style={{ fontSize: 16 }}>Grand Total: <Text strong>₹{drawerTotal.toFixed(2)}</Text></Text>
            </div>
          </div>

          {/* Step 5 */}
          <div>
            <Text strong>Step 5: Notes (Optional)</Text>
            <Input.TextArea
              rows={3}
              placeholder="Add delivery notes or special instructions"
              style={{ marginTop: 8 }}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>
      </Drawer>
    </div>
  );
}
