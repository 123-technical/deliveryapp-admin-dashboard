import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Popconfirm,
  Typography,
  Tag,
  Divider,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ShoppingCartOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import { cartService } from "../services/carts";
import { useAuth } from "../contexts/AuthContext";
import type {
  CartWithItems,
  CartItem,
  AddCartItemDto,
  UpdateCartItemDto,
} from "../types/cart";

const { Title, Text } = Typography;

const Carts = () => {
  const navigate = useNavigate();
  const [carts, setCarts] = useState<CartWithItems[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddItemModalVisible, setIsAddItemModalVisible] = useState(false);
  const [isEditItemModalVisible, setIsEditItemModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const { user } = useAuth();

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  useEffect(() => {
    // For now, we'll show a message to enter a user ID
    // In a real app, you might want to fetch all carts or show a user selection
  }, []);

  const handleViewCart = async (userId: string) => {
    setLoading(true);
    try {
      const cart = await cartService.getCart(userId);
      setCarts([cart]);
      setSelectedUserId(userId);
    } catch (error) {
      console.error("Failed to fetch cart:", error);
      message.error("Failed to fetch cart");
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    if (!selectedUserId) {
      message.warning("Please select a user first");
      return;
    }
    form.resetFields();
    setIsAddItemModalVisible(true);
  };

  const handleAddItemModalOk = async () => {
    try {
      const values = await form.validateFields();
      const itemData: AddCartItemDto = {
        productId: values.productId,
        quantity: values.quantity,
      };

      await cartService.addItemToCart(selectedUserId, itemData);
      message.success("Item added to cart successfully");
      setIsAddItemModalVisible(false);
      form.resetFields();
      // Refresh the cart
      handleViewCart(selectedUserId);
    } catch (error) {
      console.error("Failed to add item to cart:", error);
      message.error("Failed to add item to cart");
    }
  };

  const handleAddItemModalCancel = () => {
    setIsAddItemModalVisible(false);
    form.resetFields();
  };

  const handleEditItem = (item: CartItem) => {
    setEditingItem(item);
    editForm.setFieldsValue({
      quantity: item.quantity,
    });
    setIsEditItemModalVisible(true);
  };

  const handleEditItemModalOk = async () => {
    try {
      const values = await editForm.validateFields();
      if (editingItem) {
        const itemData: UpdateCartItemDto = {
          quantity: values.quantity,
        };

        await cartService.updateCartItem(editingItem.id, itemData);
        message.success("Cart item updated successfully");
        setIsEditItemModalVisible(false);
        editForm.resetFields();
        setEditingItem(null);
        // Refresh the cart
        handleViewCart(selectedUserId);
      }
    } catch (error) {
      console.error("Failed to update cart item:", error);
      message.error("Failed to update cart item");
    }
  };

  const handleEditItemModalCancel = () => {
    setIsEditItemModalVisible(false);
    editForm.resetFields();
    setEditingItem(null);
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await cartService.removeCartItem(itemId);
      message.success("Item removed from cart successfully");
      // Refresh the cart
      handleViewCart(selectedUserId);
    } catch (error) {
      console.error("Failed to remove item from cart:", error);
      message.error("Failed to remove item from cart");
    }
  };

  const handleClearCart = async () => {
    try {
      await cartService.clearCart(selectedUserId);
      message.success("Cart cleared successfully");
      setCarts([]);
      setSelectedUserId("");
    } catch (error) {
      console.error("Failed to clear cart:", error);
      message.error("Failed to clear cart");
    }
  };

  const cartItemColumns = [
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
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Actions",
      key: "actions",
      width: 150,
      render: (_: any, record: CartItem) => (
        <Space size="small">
          {isAdmin && (
            <>
              <Button
                type="primary"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEditItem(record)}
              >
                Edit
              </Button>
              <Popconfirm
                title="Remove Item"
                description="Are you sure you want to remove this item from the cart?"
                onConfirm={() => handleRemoveItem(record.id)}
                okText="Yes"
                cancelText="No"
                okType="danger"
              >
                <Button danger size="small" icon={<DeleteOutlined />}>
                  Remove
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
          Carts Management
        </Title>
        <Text type="secondary">Enter a User ID to view their cart</Text>
      </div>

      <Card style={{ marginBottom: "24px" }}>
        <Space>
          <Input
            placeholder="Enter User ID"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            style={{ width: 300 }}
          />
          <Button
            type="primary"
            icon={<ShoppingCartOutlined />}
            onClick={() => handleViewCart(selectedUserId)}
            disabled={!selectedUserId}
          >
            View Cart
          </Button>
        </Space>
      </Card>

      {carts.length > 0 && (
        <>
          <Card>
            <div
              style={{
                marginBottom: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Title level={4} style={{ margin: 0 }}>
                Cart Items for User: {selectedUserId}
              </Title>
              {isAdmin && (
                <Space>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAddItem}
                  >
                    Add Item
                  </Button>
                  <Popconfirm
                    title="Clear Cart"
                    description="Are you sure you want to clear this cart? This action cannot be undone."
                    onConfirm={handleClearCart}
                    okText="Yes, Clear"
                    cancelText="Cancel"
                    okType="danger"
                  >
                    <Button danger icon={<ClearOutlined />}>
                      Clear Cart
                    </Button>
                  </Popconfirm>
                </Space>
              )}
            </div>

            <Table
              columns={cartItemColumns}
              dataSource={carts[0]?.items || []}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} of ${total} items`,
              }}
            />
          </Card>
        </>
      )}

      {/* Add Item Modal */}
      {isAdmin && (
        <Modal
          title="Add Item to Cart"
          open={isAddItemModalVisible}
          onOk={handleAddItemModalOk}
          onCancel={handleAddItemModalCancel}
          okText="Add"
          cancelText="Cancel"
        >
          <Form form={form} layout="vertical" name="addItemForm">
            <Form.Item
              name="productId"
              label="Product ID"
              rules={[
                { required: true, message: "Please enter product ID!" },
                {
                  pattern:
                    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
                  message: "Please enter a valid UUID!",
                },
              ]}
            >
              <Input placeholder="Enter product UUID" />
            </Form.Item>
            <Form.Item
              name="quantity"
              label="Quantity"
              rules={[
                { required: true, message: "Please enter quantity!" },
                {
                  type: "number",
                  min: 1,
                  message: "Quantity must be at least 1!",
                },
              ]}
            >
              <InputNumber
                placeholder="Enter quantity"
                min={1}
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Form>
        </Modal>
      )}

      {/* Edit Item Modal */}
      {isAdmin && (
        <Modal
          title="Edit Cart Item"
          open={isEditItemModalVisible}
          onOk={handleEditItemModalOk}
          onCancel={handleEditItemModalCancel}
          okText="Update"
          cancelText="Cancel"
        >
          <Form form={editForm} layout="vertical" name="editItemForm">
            <Form.Item
              name="quantity"
              label="Quantity"
              rules={[
                { required: true, message: "Please enter quantity!" },
                {
                  type: "number",
                  min: 1,
                  message: "Quantity must be at least 1!",
                },
              ]}
            >
              <InputNumber
                placeholder="Enter quantity"
                min={1}
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Form>
        </Modal>
      )}
    </div>
  );
};

export default Carts;
