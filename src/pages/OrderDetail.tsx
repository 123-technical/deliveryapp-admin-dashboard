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
  Input,
  Popconfirm,
} from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { orderService } from "../services/orders";
import { useAuth } from "../contexts/AuthContext";
import type { OrderWithItems, OrderItem, UpdateOrderDto } from "../types/order";

const { Title, Text } = Typography;

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editForm] = Form.useForm();

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const fetchOrderById = useCallback(
    async (orderId: string) => {
      setLoading(true);
      try {
        const orderData = await orderService.getOrderById(orderId);
        setOrder(orderData);
      } catch (error) {
        console.error("Failed to fetch order:", error);
        message.error("Failed to fetch order details");
        navigate("/orders");
      } finally {
        setLoading(false);
      }
    },
    [navigate]
  );

  useEffect(() => {
    if (id) {
      fetchOrderById(id);
    }
  }, [id, fetchOrderById]);

  const handleEdit = () => {
    if (order) {
      editForm.setFieldsValue({
        status: order.status,
        notes: order.notes,
        deliveryPersonnelId: order.deliveryPersonnelId,
      });
      setIsEditModalVisible(true);
    }
  };

  const handleEditModalOk = async () => {
    try {
      const values = await editForm.validateFields();
      if (order) {
        const updateData: UpdateOrderDto = {
          status: values.status,
          notes: values.notes,
          deliveryPersonnelId: values.deliveryPersonnelId,
        };

        const updatedOrder = await orderService.updateOrder(
          order.id,
          updateData
        );
        setOrder({ ...order, ...updatedOrder });
        message.success("Order updated successfully");
        setIsEditModalVisible(false);
        editForm.resetFields();
      }
    } catch (error) {
      console.error("Failed to update order:", error);
      message.error("Failed to update order");
    }
  };

  const handleEditModalCancel = () => {
    setIsEditModalVisible(false);
    editForm.resetFields();
  };

  const handleDelete = async () => {
    if (order) {
      try {
        await orderService.deleteOrder(order.id);
        message.success("Order deleted successfully");
        navigate("/orders");
      } catch (error) {
        console.error("Failed to delete order:", error);
        message.error("Failed to delete order");
      }
    }
  };

  const handleBack = () => {
    navigate("/orders");
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
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

  const orderItemColumns = [
    {
      title: "Product ID",
      dataIndex: "productId",
      key: "productId",
      render: (productId: string) => <Text code>{productId}</Text>,
    },
    {
      title: "Quantity",
      dataIndex: "quantity",
      key: "quantity",
      render: (quantity: number) => <Tag color="blue">{quantity}</Tag>,
    },
    {
      title: "Price at Purchase",
      dataIndex: "priceAtPurchase",
      key: "priceAtPurchase",
      render: (price: string) => `₹${parseFloat(price).toFixed(2)}`,
    },
  ];

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Title level={3}>Order not found</Title>
        <Button type="primary" onClick={handleBack}>
          Back to Orders
        </Button>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: "24px" }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={handleBack}
          style={{ marginBottom: "16px" }}
        >
          Back to Orders
        </Button>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Title level={2} style={{ margin: 0 }}>
            Order #{order.orderNumber}
          </Title>

          {isAdmin && (
            <Space>
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={handleEdit}
              >
                Edit Order
              </Button>
              <Popconfirm
                title="Delete Order"
                description="Are you sure you want to delete this order? This action cannot be undone."
                onConfirm={handleDelete}
                okText="Yes, Delete"
                cancelText="Cancel"
                okType="danger"
              >
                <Button danger icon={<DeleteOutlined />}>
                  Delete Order
                </Button>
              </Popconfirm>
            </Space>
          )}
        </div>
      </div>

      <Card style={{ marginBottom: "24px" }}>
        <Descriptions title="Order Details" bordered column={2}>
          <Descriptions.Item label="Order ID" span={1}>
            <Text code>{order.id}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Order Number" span={1}>
            <Text strong>{order.orderNumber}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="User ID" span={1}>
            <Text code>{order.userId}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Status" span={1}>
            <Tag color={getStatusColor(order.status)}>
              {order.status.replace("_", " ")}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Total Amount" span={1}>
            <Text strong>₹{parseFloat(order.totalAmount).toFixed(2)}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Discount Amount" span={1}>
            ₹{parseFloat(order.discountAmount).toFixed(2)}
          </Descriptions.Item>
          <Descriptions.Item label="Final Amount" span={2}>
            <Text strong style={{ fontSize: "16px", color: "#1890ff" }}>
              ₹{parseFloat(order.finalAmount).toFixed(2)}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Delivery Address ID" span={1}>
            <Text code>{order.deliveryAddressId}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Delivery Slot ID" span={1}>
            {order.deliverySlotId ? (
              <Text code>{order.deliverySlotId}</Text>
            ) : (
              "Not assigned"
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Delivery Personnel" span={1}>
            {order.deliveryPersonnelId ? (
              <Text code>{order.deliveryPersonnelId}</Text>
            ) : (
              "Not assigned"
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Notes" span={1}>
            {order.notes || "No notes"}
          </Descriptions.Item>
          <Descriptions.Item label="Created At" span={1}>
            {new Date(order.createdAt).toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label="Updated At" span={1}>
            {new Date(order.updatedAt).toLocaleString()}
          </Descriptions.Item>
          {order.deletedAt && (
            <Descriptions.Item label="Deleted At" span={2}>
              {new Date(order.deletedAt).toLocaleString()}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Card>
        <Title level={4} style={{ marginBottom: "16px" }}>
          Order Items ({order.items?.length || 0} items)
        </Title>
        <Table
          columns={orderItemColumns}
          dataSource={order.items || []}
          rowKey="id"
          pagination={false}
          size="small"
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

export default OrderDetail;
