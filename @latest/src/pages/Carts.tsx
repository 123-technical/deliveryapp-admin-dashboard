import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Button,
  Input,
  Space,
  Table,
  Card,
  Typography,
  Tag,
  message,
  Modal,
  Form,
  InputNumber,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { cartService } from "../services/carts";
import { useAuth } from "../contexts/AuthContext";
import type {
  Cart,
  CartWithItems,
  CartItem,
  CartsQuery,
  CreateCartDto,
  AddCartItemDto,
  UpdateCartItemDto,
} from "../types/cart";

const { Title, Text } = Typography;

const Carts = () => {
  const [carts, setCarts] = useState<CartWithItems[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sorter, setSorter] = useState<{
    sortBy?: keyof Cart;
    sortOrder?: "ascend" | "descend";
  }>({});
  const [isCreateCartModalVisible, setIsCreateCartModalVisible] =
    useState(false);
  const [isAddItemModalVisible, setIsAddItemModalVisible] = useState(false);
  const [isEditItemModalVisible, setIsEditItemModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [selectedCart, setSelectedCart] = useState<CartWithItems | null>(null);
  const [createCartForm] = Form.useForm();
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const { user } = useAuth();

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  // Helper function to check if a string is a valid UUID
  const isValidUUID = (str: string): boolean => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str.trim());
  };

  const queryParams: CartsQuery = useMemo(
    () => ({
      page,
      pageSize,
      search: search || undefined,
      userId: userId || undefined,
      sortBy: sorter.sortBy,
      sortOrder: sorter.sortOrder,
    }),
    [page, pageSize, search, userId, sorter]
  );

  const fetchCarts = useCallback(async () => {
    setLoading(true);
    try {
      // If search is a valid UUID, fetch by ID instead
      if (search && isValidUUID(search)) {
        try {
          const cart = await cartService.getCartById(search.trim());
          setCarts([cart]);
          setTotal(1);
        } catch (error) {
          console.error("Failed to fetch cart by ID:", error);
          message.error("Cart not found");
          setCarts([]);
          setTotal(0);
        }
      } else if (userId && isValidUUID(userId)) {
        // If filtering by userId, fetch that specific cart
        try {
          const cart = await cartService.getCart(userId);
          setCarts([cart]);
          setTotal(1);
        } catch (error) {
          console.error("Failed to fetch cart by userId:", error);
          setCarts([]);
          setTotal(0);
        }
      } else {
        // Otherwise, try to use the general search
        // But handle 404 gracefully since this endpoint may not exist
        try {
          const response = await cartService.getCarts(queryParams);
          setCarts(response.data || []);
          setTotal(response.total || 0);
        } catch (error: unknown) {
          // If getCarts fails (404), don't show error on initial load
          // Only show error if user is actively searching
          if (search || userId) {
            // Only log error, don't show console.error to reduce noise
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            if (!errorMessage.includes("404")) {
              console.error("Failed to fetch carts:", error);
            }
            message.error(
              "Failed to fetch carts. Try searching by User ID instead."
            );
          } else {
            // On initial load, silently handle - don't log warnings
            // The endpoint doesn't exist, which is expected
          }
          setCarts([]);
          setTotal(0);
        }
      }
    } catch (error) {
      console.error("Failed to fetch carts:", error);
      if (search || userId) {
        message.error("Failed to fetch carts");
      }
      setCarts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [queryParams, search, userId]);

  useEffect(() => {
    fetchCarts();
  }, [fetchCarts]);

  const handleCreateCart = () => {
    createCartForm.resetFields();
    setIsCreateCartModalVisible(true);
  };

  const handleCreateCartModalOk = async () => {
    try {
      const values = await createCartForm.validateFields();
      const userId = values.userId;

      // Check if cart already exists for this user
      try {
        await cartService.getCart(userId);
        message.info("Cart already exists for this user");
        setIsCreateCartModalVisible(false);
        createCartForm.resetFields();
        // Refresh by fetching the specific cart instead of calling getCarts
        await refreshCartList(userId);
        return;
      } catch {
        // Cart doesn't exist, create it
        // Since POST /api/v1/carts returns 404, we'll use the add item endpoint
        // which creates the cart automatically when adding the first item
        if (values.productId && values.quantity) {
          // Add item to create cart (this endpoint works based on successful API test)
          // Ensure quantity is a number, not a string
          const itemData: AddCartItemDto = {
            productId: values.productId,
            quantity: Number(values.quantity),
          };

          await cartService.addItemToCart(userId, itemData);
          message.success(
            `Cart created successfully with ${itemData.quantity} item(s)`
          );
          setIsCreateCartModalVisible(false);
          createCartForm.resetFields();
          // Add a small delay to ensure backend has saved the data
          await new Promise((resolve) => setTimeout(resolve, 500));
          // Refresh by fetching the specific cart instead of calling getCarts
          await refreshCartList(userId);
        } else {
          // No product provided, try direct cart creation as fallback
          try {
            const cartData: CreateCartDto = { userId };
            await cartService.createCart(cartData);
            message.success("Cart created successfully");
            setIsCreateCartModalVisible(false);
            createCartForm.resetFields();
            // Refresh by fetching the specific cart instead of calling getCarts
            await refreshCartList(userId);
          } catch (createError) {
            console.error("Failed to create cart:", createError);
            message.error(
              "Failed to create empty cart. Please provide a Product ID and Quantity to create the cart with an initial item."
            );
          }
        }
      }
    } catch (error) {
      console.error("Failed to create cart:", error);
      message.error("Failed to create cart");
    }
  };

  // Helper function to refresh cart list after creation
  // Uses getCart instead of getCarts since getCarts endpoint may not exist
  const refreshCartList = async (userId: string) => {
    try {
      setLoading(true);
      // Fetch the specific cart we just created
      const newCart = await cartService.getCart(userId);
      // Use functional state update to avoid stale closure issues
      setCarts((prevCarts) => {
        const existingIndex = prevCarts.findIndex((c) => c.userId === userId);
        if (existingIndex >= 0) {
          // Update existing cart
          const updatedCarts = [...prevCarts];
          updatedCarts[existingIndex] = newCart;
          setTotal(updatedCarts.length);
          return updatedCarts;
        } else {
          // Add new cart to the list
          setTotal((prevTotal) => prevTotal + 1);
          return [newCart, ...prevCarts];
        }
      });
    } catch (error) {
      console.error("Failed to refresh cart list:", error);
      // Don't show error to user, just log it
      // The cart was created successfully, we just can't refresh the list
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCartModalCancel = () => {
    setIsCreateCartModalVisible(false);
    createCartForm.resetFields();
  };

  const handleAddItem = (cart: CartWithItems) => {
    setSelectedCart(cart);
    form.resetFields();
    setIsAddItemModalVisible(true);
  };

  const handleAddItemModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (selectedCart) {
        const itemData: AddCartItemDto = {
          productId: values.productId,
          quantity: values.quantity,
        };

        await cartService.addItemToCart(selectedCart.userId, itemData);
        message.success("Item added to cart successfully");
        setIsAddItemModalVisible(false);
        form.resetFields();
        const userId = selectedCart.userId;
        setSelectedCart(null);
        // Refresh the specific cart instead of calling fetchCarts
        await refreshCartList(userId);
      }
    } catch (error) {
      console.error("Failed to add item to cart:", error);
      message.error("Failed to add item to cart");
    }
  };

  const handleAddItemModalCancel = () => {
    setIsAddItemModalVisible(false);
    form.resetFields();
    setSelectedCart(null);
  };

  const handleEditItem = (item: CartItem, cart: CartWithItems) => {
    setEditingItem(item);
    setSelectedCart(cart);
    editForm.setFieldsValue({
      quantity: item.quantity,
    });
    setIsEditItemModalVisible(true);
  };

  const handleEditItemModalOk = async () => {
    try {
      const values = await editForm.validateFields();
      if (editingItem && selectedCart) {
        const itemData: UpdateCartItemDto = {
          quantity: values.quantity,
        };

        await cartService.updateCartItem(editingItem.id, itemData);
        message.success("Cart item updated successfully");
        setIsEditItemModalVisible(false);
        editForm.resetFields();
        const userId = selectedCart.userId;
        setEditingItem(null);
        setSelectedCart(null);
        // Refresh the specific cart instead of calling fetchCarts
        await refreshCartList(userId);
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
    setSelectedCart(null);
  };

  const handleRemoveItem = async (itemId: string, cart: CartWithItems) => {
    try {
      await cartService.removeCartItem(itemId);
      message.success("Item removed from cart successfully");
      // Refresh the specific cart instead of calling fetchCarts
      await refreshCartList(cart.userId);
    } catch (error) {
      console.error("Failed to remove item from cart:", error);
      message.error("Failed to remove item from cart");
    }
  };

  const handleClearCart = async (userId: string) => {
    try {
      await cartService.clearCart(userId);
      message.success("Cart cleared successfully");
      // After clearing, remove the cart from the list or refresh it
      setCarts((prevCarts) => {
        const filtered = prevCarts.filter((c) => c.userId !== userId);
        setTotal(filtered.length);
        return filtered;
      });
    } catch (error) {
      console.error("Failed to clear cart:", error);
      message.error("Failed to clear cart");
    }
  };

  const cartItemColumns = (cart: CartWithItems) => [
    {
      title: "Product ID",
      dataIndex: "productId",
      key: "productId",
      width: 200,
      render: (productId: string) => (
        <Typography.Text
          copyable={{ text: productId }}
          style={{ fontFamily: "monospace", fontSize: "12px" }}
          ellipsis={{ tooltip: productId }}
        >
          {productId.substring(0, 8)}...
        </Typography.Text>
      ),
    },
    {
      title: "Quantity",
      dataIndex: "quantity",
      key: "quantity",
      width: 100,
      render: (quantity: number) => <Tag color="blue">{quantity}</Tag>,
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 150,
      render: (date: string) => dayjs(date).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: "Updated At",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 150,
      render: (date: string) => dayjs(date).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: "Actions",
      key: "actions",
      width: 180,
      fixed: "right" as const,
      render: (_: unknown, record: CartItem) => (
        <Space size="small">
          {isAdmin && (
            <>
              <Button
                type="default"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEditItem(record, cart)}
                disabled={!!cart.deletedAt}
              >
                Edit
              </Button>
              <Popconfirm
                title="Remove Item"
                description="Are you sure you want to remove this item from the cart?"
                onConfirm={() => handleRemoveItem(record.id, cart)}
                okText="Yes"
                cancelText="No"
                okType="danger"
                disabled={!!cart.deletedAt}
              >
                <Button
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  disabled={!!cart.deletedAt}
                >
                  Remove
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

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
      title: "User ID",
      dataIndex: "userId",
      key: "userId",
      width: 150,
      fixed: "left" as const,
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
      sorter: (a: CartWithItems, b: CartWithItems) =>
        a.userId.localeCompare(b.userId),
    },
    {
      title: "Items",
      key: "items",
      width: 80,
      render: (_: unknown, record: CartWithItems) => (
        <Tag color="blue">{record.items?.length || 0}</Tag>
      ),
    },
    {
      title: "Total Quantity",
      key: "totalQuantity",
      width: 120,
      render: (_: unknown, record: CartWithItems) => {
        const total =
          record.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        return <Text strong>{total}</Text>;
      },
    },
    {
      title: "Cart Status",
      key: "cartStatus",
      width: 100,
      render: (_: unknown, record: CartWithItems) => (
        <Typography.Text
          type={record.deletedAt ? "danger" : "success"}
          style={{ fontWeight: 500 }}
        >
          {record.deletedAt ? "Deleted" : "Active"}
        </Typography.Text>
      ),
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 150,
      render: (date: string) => dayjs(date).format("YYYY-MM-DD HH:mm"),
      sorter: (a: CartWithItems, b: CartWithItems) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: "Updated At",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 150,
      render: (date: string) => dayjs(date).format("YYYY-MM-DD HH:mm"),
      sorter: (a: CartWithItems, b: CartWithItems) =>
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
    },
    {
      title: "Deleted At",
      dataIndex: "deletedAt",
      key: "deletedAt",
      width: 150,
      render: (date: string | null) =>
        date ? dayjs(date).format("YYYY-MM-DD HH:mm") : "-",
      sorter: (a: CartWithItems, b: CartWithItems) => {
        if (!a.deletedAt && !b.deletedAt) return 0;
        if (!a.deletedAt) return 1;
        if (!b.deletedAt) return -1;
        return (
          new Date(a.deletedAt).getTime() - new Date(b.deletedAt).getTime()
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 200,
      fixed: "right" as const,
      render: (_: unknown, record: CartWithItems) => (
        <Space size="small">
          {isAdmin && (
            <>
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => handleAddItem(record)}
                disabled={!!record.deletedAt}
              >
                Add Item
              </Button>
              <Popconfirm
                title="Clear Cart"
                description="Are you sure you want to clear this cart? This action cannot be undone."
                onConfirm={() => handleClearCart(record.userId)}
                okText="Yes, Clear"
                cancelText="Cancel"
                okType="danger"
                disabled={!!record.deletedAt}
              >
                <Button
                  danger
                  size="small"
                  icon={<ClearOutlined />}
                  disabled={!!record.deletedAt}
                >
                  Clear
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 8,
          }}
        >
          <Text type="secondary">
            Manage and track all shopping carts in the system
          </Text>
          {isAdmin && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateCart}
            >
              Create Cart
            </Button>
          )}
        </div>
      </div>

      <Card style={{ marginBottom: "24px" }}>
        <Space wrap>
          <Input.Search
            allowClear
            placeholder="Search by cart ID or user ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={() => {
              setPage(1);
              fetchCarts();
            }}
            onPressEnter={() => {
              setPage(1);
              fetchCarts();
            }}
            style={{ width: 320 }}
          />
          <Input
            placeholder="Filter by User ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            style={{ width: 200 }}
          />
          <Button
            onClick={() => {
              setSearch("");
              setUserId("");
              setPage(1);
              setSorter({});
            }}
          >
            Reset
          </Button>
        </Space>
      </Card>

      <Card>
        <Table<CartWithItems>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={carts}
          size="middle"
          scroll={{ x: 1400 }}
          expandable={{
            expandedRowRender: (record) => (
              <div style={{ margin: 0 }}>
                <Title level={5} style={{ marginBottom: 16 }}>
                  Cart Items ({record.items?.length || 0})
                </Title>
                <Table
                  columns={cartItemColumns(record)}
                  dataSource={record.items || []}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  scroll={{ x: 800 }}
                />
              </div>
            ),
            rowExpandable: (record) => (record.items?.length || 0) > 0,
          }}
          pagination={{
            current: page,
            pageSize,
            total: total,
            responsive: true,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} carts`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          onChange={(_pagination, _filters, sorter) => {
            if (!Array.isArray(sorter)) {
              setSorter({
                sortBy: (sorter.field as keyof Cart) || undefined,
                sortOrder: sorter.order || undefined,
              });
            }
          }}
        />
      </Card>

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

      {/* Create Cart Modal */}
      {isAdmin && (
        <Modal
          title="Create Cart"
          open={isCreateCartModalVisible}
          onOk={handleCreateCartModalOk}
          onCancel={handleCreateCartModalCancel}
          okText="Create"
          cancelText="Cancel"
          width={600}
        >
          <Form form={createCartForm} layout="vertical" name="createCartForm">
            <Form.Item
              name="userId"
              label="User ID"
              rules={[
                { required: true, message: "Please enter user ID!" },
                {
                  pattern:
                    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
                  message: "Please enter a valid UUID!",
                },
              ]}
            >
              <Input placeholder="Enter user UUID" />
            </Form.Item>
            <Form.Item
              name="productId"
              label="Product ID (Optional)"
              tooltip="If provided, this item will be added to the cart when it's created"
              rules={[
                {
                  pattern:
                    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
                  message: "Please enter a valid UUID!",
                },
              ]}
            >
              <Input placeholder="Enter product UUID (optional)" />
            </Form.Item>
            <Form.Item
              name="quantity"
              label="Quantity (Optional)"
              tooltip="Required if Product ID is provided"
              rules={[
                ({ getFieldValue }) => ({
                  validator: (_, value) => {
                    const productId = getFieldValue("productId");
                    if (productId && !value) {
                      return Promise.reject(
                        new Error(
                          "Quantity is required when Product ID is provided!"
                        )
                      );
                    }
                    if (value && value < 1) {
                      return Promise.reject(
                        new Error("Quantity must be at least 1!")
                      );
                    }
                    return Promise.resolve();
                  },
                }),
              ]}
            >
              <InputNumber
                placeholder="Enter quantity (optional)"
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
