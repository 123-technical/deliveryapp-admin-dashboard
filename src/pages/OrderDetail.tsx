import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  Descriptions,
  Button,
  Spin,
  message,
  Space,
  Typography,
  Table,
  Tag,
  Modal,
  Form,
  Select,
  Popconfirm,
  Row,
  Col,
  Dropdown,
  MenuProps,
} from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  DownOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { orderService } from "../services/orders";
import { useAuth } from "../contexts/AuthContext";
import type { Order, UpdateOrderDto } from "../types/order";

const { Title, Text } = Typography;
const { Option } = Select;

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

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const fetchOrderById = useCallback(async (orderId: string) => {
    setLoading(true);
    try {
      const orderData = await orderService.getOrderById(orderId);
      setOrder(orderData);
    } catch (error) {
      message.error("Failed to fetch order details");
      navigate("/orders");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (id) fetchOrderById(id);
  }, [id, fetchOrderById]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!order) return;
    try {
      const updatedOrder = await orderService.updateOrder(order.id, { status: newStatus as any });
      setOrder({ ...order, ...updatedOrder });
      message.success("Order status updated successfully");
    } catch (error) {
      message.error("Failed to update order status");
    }
  };

  const handleDelete = async () => {
    if (!order) return;
    try {
      await orderService.deleteOrder(order.id);
      message.success("Order deleted successfully");
      navigate("/orders");
    } catch (error) {
      message.error("Failed to delete order");
    }
  };

  const handleCopyId = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success("Copied to clipboard");
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Title level={3}>Failed to load order</Title>
        <Button type="primary" onClick={() => navigate("/orders")}>
          Back to Orders
        </Button>
      </div>
    );
  }

  const itemsList = order.orderItems || order.items || [];
  const grandTotal = itemsList.reduce((acc, item) => acc + (Number(item.priceAtPurchase) * item.quantity), 0);

  const statusMenuItems: MenuProps['items'] = [
    { key: "PENDING", label: "Pending" },
    { key: "CONFIRMED", label: "Confirmed" },
    { key: "PROCESSING", label: "Processing" },
    { key: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
    { key: "DELIVERED", label: "Delivered" },
    { key: "CANCELLED", label: "Cancelled" },
  ];

  const orderItemColumns = [
    {
      title: "Product Image",
      key: "image",
      width: 80,
      render: (_: any, record: any) => (
        record.productImageUrl ? (
          <img src={record.productImageUrl} alt={record.productName} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
        ) : (
          <div style={{ width: 40, height: 40, background: '#f0f0f0', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Text type="secondary" style={{ fontSize: 10 }}>No Img</Text>
          </div>
        )
      )
    },
    {
      title: "Product Name",
      key: "name",
      render: (_: any, record: any) => <Text strong>{record.productName || record.productId}</Text>,
    },
    {
      title: "Quantity",
      dataIndex: "quantity",
      key: "quantity",
      render: (qty: number) => <Tag color="blue">{qty}</Tag>,
    },
    {
      title: "Price at Purchase",
      dataIndex: "priceAtPurchase",
      key: "priceAtPurchase",
      render: (price: string) => `₹${parseFloat(price || "0").toFixed(2)}`,
    },
    {
      title: "Subtotal",
      key: "subtotal",
      render: (_: any, record: any) => <Text strong>₹{(parseFloat(record.priceAtPurchase || "0") * record.quantity).toFixed(2)}</Text>,
    },
  ];

  return (
    <div style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space align="center" size="large">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/orders")}>
            Back
          </Button>
          <Title level={3} style={{ margin: 0 }}>
            Order #{order.id.substring(0, 8)}
          </Title>
        </Space>
        <Space>
          <Tag color={getStatusColor(order.status)} style={{ padding: '4px 12px', fontSize: 14 }}>
            {order.status.replace(/_/g, " ")}
          </Tag>
          {isAdmin && (
            <Dropdown menu={{ items: statusMenuItems, onClick: (e) => handleUpdateStatus(e.key) }} trigger={['click']}>
              <Button type="primary">
                Update Status <DownOutlined />
              </Button>
            </Dropdown>
          )}
        </Space>
      </div>

      <Row gutter={[24, 24]}>
        {/* Section 1: Order Summary & Section 2: Customer Info */}
        <Col xs={24} md={16}>
          <Card title="Order Summary" style={{ marginBottom: 24 }}>
            <Descriptions column={2}>
              <Descriptions.Item label="Order ID">
                <Space>
                  <Text code>{order.id}</Text>
                  <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => handleCopyId(order.id)} />
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Created At">
                {dayjs(order.createdAt).format("DD MMM YYYY, HH:mm")}
              </Descriptions.Item>
              <Descriptions.Item label="Grand Total" span={2}>
                <Text strong style={{ fontSize: 18, color: '#1890ff' }}>
                  ₹{(order.finalAmount ? parseFloat(order.finalAmount) : grandTotal).toFixed(2)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Notes" span={2}>
                {order.notes || <Text type="secondary">No notes provided</Text>}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title={`Order Items (${itemsList.length})`}>
            <Table
              columns={orderItemColumns}
              dataSource={itemsList}
              rowKey={(record, idx) => record.id || idx?.toString() || ""}
              pagination={false}
              size="middle"
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={4}>
                    <Text strong style={{ float: 'right' }}>Total</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>
                    <Text strong style={{ fontSize: 16 }}>₹{grandTotal.toFixed(2)}</Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
          </Card>
        </Col>

        {/* Section 3: Delivery Info & Customer Info */}
        <Col xs={24} md={8}>
          <Card title="Customer Info" style={{ marginBottom: 24 }}>
            {order.user ? (
              <Descriptions column={1}>
                <Descriptions.Item label="Name"><Text strong>{order.user.name}</Text></Descriptions.Item>
                <Descriptions.Item label="Email">{order.user.email}</Descriptions.Item>
                {order.user.phone && <Descriptions.Item label="Phone">{order.user.phone}</Descriptions.Item>}
              </Descriptions>
            ) : (
              <Text type="secondary">Customer details not available</Text>
            )}
          </Card>

          <Card title="Delivery Info" style={{ marginBottom: 24 }}>
            <Descriptions column={1} layout="vertical">
              <Descriptions.Item label="Delivery Address">
                {order.deliveryAddress ? (
                  <div>
                    <div>{order.deliveryAddress.street}</div>
                    <div>{order.deliveryAddress.city}{order.deliveryAddress.state ? `, ${order.deliveryAddress.state}` : ""} {order.deliveryAddress.postalCode}</div>
                  </div>
                ) : (
                  <Text code>{order.deliveryAddressId}</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Delivery Slot">
                {order.deliverySlot ? (
                  <Text strong>
                    {order.deliverySlot.date ? dayjs(order.deliverySlot.date).format("DD MMM YYYY") : "Any Date"} 
                    {' | '} 
                    {order.deliverySlot.startTime} - {order.deliverySlot.endTime}
                  </Text>
                ) : (
                  order.deliverySlotId ? <Text code>{order.deliverySlotId}</Text> : <Text type="secondary">Not assigned</Text>
                )}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Section 5: Actions */}
          {isAdmin && (
            <Card title="Actions">
              <Popconfirm
                title="Delete Order"
                description="Are you sure you want to delete this order? This action cannot be undone."
                onConfirm={handleDelete}
                okText="Yes, Delete"
                cancelText="Cancel"
                okType="danger"
              >
                <Button danger block icon={<DeleteOutlined />}>
                  Delete Order
                </Button>
              </Popconfirm>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
