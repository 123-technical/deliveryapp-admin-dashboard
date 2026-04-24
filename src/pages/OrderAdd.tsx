import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { CreateOrderDto } from "../types/order";
import { orderService } from "../services/orders";
import { productService } from "../services/products";
import { authService } from "../services/auth";
import { fetchCustomers } from "../services/customers";
import type { Product } from "../types/product";
import { message, Select } from "antd";

function inputStyle() {
  return {
    width: "100%",
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    outline: "none",
    background: "#fff",
    color: "#111827",
  } as const;
}

function buttonStyle() {
  return {
    borderWidth: 1,
    borderStyle: "solid" as const,
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: 14,
    fontWeight: 600,
    background: "#4f46e5",
    color: "#fff",
    borderColor: "#4f46e5",
    cursor: "pointer",
  } as const;
}

type OrderItem = {
  productId: string;
  quantity: number;
  priceAtPurchase: string;
};

type User = {
  id: string;
  name: string;
  email: string;
};

type DeliveryAddress = {
  id: string;
  street: string;
  city: string;
  state?: string;
  postalCode?: string;
};

export default function OrderAdd() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [deliveryAddresses, setDeliveryAddresses] = useState<DeliveryAddress[]>(
    []
  );
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [form, setForm] = useState<{
    userId: string;
    deliveryAddressId: string;
    deliverySlotId: string;
    notes: string;
    orderItems: OrderItem[];
  }>({
    userId: "",
    deliveryAddressId: "",
    deliverySlotId: "",
    notes: "",
    orderItems: [{ productId: "", quantity: 1, priceAtPurchase: "0" }],
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (form.userId) {
      fetchDeliveryAddresses(form.userId);
    } else {
      setDeliveryAddresses([]);
      setForm((prev) => ({ ...prev, deliveryAddressId: "" }));
    }
  }, [form.userId]);

  // Debounced search for customers
  const searchCustomers = useCallback(async (searchTerm: string) => {
    if (!searchTerm || searchTerm.trim().length < 1) {
      setUsers([]);
      return;
    }

    setLoadingUsers(true);
    try {
      const response = await fetchCustomers({
        page: 1,
        pageSize: 20, // Limit results to 20 for better performance
        search: searchTerm.trim(),
      });

      const customers = response.data || [];
      setUsers(
        customers.map((customer) => ({
          id: customer.id,
          name: customer.name || customer.username || customer.email || "",
          email: customer.email || "",
        }))
      );
    } catch (error) {
      console.error("Failed to search customers:", error);
      message.error("Failed to search customers");
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // Debounce search input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (customerSearchTerm) {
        searchCustomers(customerSearchTerm);
      } else {
        setUsers([]);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [customerSearchTerm, searchCustomers]);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const response = await productService.getProducts({
        page: 1,
        pageSize: 100,
        isAvailable: true,
      });
      setProducts(response.data || []);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      message.error("Failed to fetch products");
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchDeliveryAddresses = async (userId: string) => {
    if (!userId) {
      setDeliveryAddresses([]);
      return;
    }
    setLoadingAddresses(true);
    try {
      const token = authService.getToken();
      const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
      const response = await fetch(
        `${API_BASE_URL}/api/v1/users/${userId}/addresses`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const addresses = data.data || data;
        setDeliveryAddresses(
          Array.isArray(addresses)
            ? addresses.map(
                (addr: {
                  id: string;
                  street?: string;
                  city?: string;
                  state?: string;
                  postalCode?: string;
                }) => ({
                  id: addr.id,
                  street: addr.street || "",
                  city: addr.city || "",
                  state: addr.state,
                  postalCode: addr.postalCode,
                })
              )
            : []
        );
      } else if (response.status === 404) {
        // Endpoint doesn't exist, silently set empty addresses
        setDeliveryAddresses([]);
      } else {
        // Only show warning for other errors (not 404)
        console.warn("Could not fetch delivery addresses for this user.");
        setDeliveryAddresses([]);
      }
    } catch (error) {
      // Silently handle errors - endpoint may not exist
      console.warn("Address endpoint not available:", error);
      setDeliveryAddresses([]);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      const newOrderItems = [...form.orderItems];
      newOrderItems[index] = {
        ...newOrderItems[index],
        productId,
        priceAtPurchase: product.price,
      };
      setForm({ ...form, orderItems: newOrderItems });
    }
  };

  const addOrderItem = () => {
    setForm({
      ...form,
      orderItems: [
        ...form.orderItems,
        { productId: "", quantity: 1, priceAtPurchase: "0" },
      ],
    });
  };

  const removeOrderItem = (index: number) => {
    if (form.orderItems.length > 1) {
      const newOrderItems = form.orderItems.filter((_, i) => i !== index);
      setForm({ ...form, orderItems: newOrderItems });
    }
  };

  // Helper function to validate UUID
  const isValidUUID = (str: string): boolean => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str.trim());
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validation
    if (!form.userId) {
      message.error("Please select a customer");
      return;
    }
    if (!form.deliveryAddressId) {
      message.error("Please enter a delivery address ID");
      return;
    }
    if (!isValidUUID(form.deliveryAddressId)) {
      message.error("Delivery address ID must be a valid UUID");
      return;
    }
    if (
      form.orderItems.length === 0 ||
      form.orderItems.some((item) => !item.productId || item.quantity < 1)
    ) {
      message.error("Please add at least one valid order item");
      return;
    }

    setSaving(true);
    try {
      const orderData: CreateOrderDto = {
        userId: form.userId,
        deliveryAddressId: form.deliveryAddressId.trim(),
        deliverySlotId: form.deliverySlotId?.trim() || undefined,
        notes: form.notes || undefined,
        orderItems: form.orderItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          priceAtPurchase: parseFloat(item.priceAtPurchase),
        })),
      };

      await orderService.createOrder(orderData);
      message.success("Order created successfully");
      navigate("/orders");
    } catch (error) {
      console.error("Order creation failed:", error);
      // Show more detailed error message
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create order";
      message.error(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  const calculateTotal = () => {
    return form.orderItems.reduce((sum, item) => {
      return sum + parseFloat(item.priceAtPurchase) * item.quantity;
    }, 0);
  };

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ margin: 0, marginBottom: 16 }}>Create New Order</h2>
      <form onSubmit={onSubmit} style={{ maxWidth: 800 }}>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <label>
            <div>Customer *</div>
            <Select
              showSearch
              placeholder="Search and select a customer"
              value={form.userId || undefined}
              onChange={(value) => {
                setForm({
                  ...form,
                  userId: value,
                  deliveryAddressId: "",
                });
              }}
              onSearch={(value) => setCustomerSearchTerm(value)}
              filterOption={false} // We handle filtering on the backend
              loading={loadingUsers}
              notFoundContent={
                loadingUsers
                  ? "Searching..."
                  : customerSearchTerm.length < 1
                  ? "Type to search for customers"
                  : "No customers found"
              }
              style={{ width: "100%" }}
              size="large"
              allowClear
              onClear={() => {
                setForm({
                  ...form,
                  userId: "",
                  deliveryAddressId: "",
                });
              }}
            >
              {users.map((user) => (
                <Select.Option key={user.id} value={user.id}>
                  {user.name} {user.email ? `(${user.email})` : ""}
                </Select.Option>
              ))}
            </Select>
          </label>

          <label>
            <div>Delivery Address *</div>
            {deliveryAddresses.length > 0 && (
              <select
                value={form.deliveryAddressId}
                onChange={(e) =>
                  setForm({ ...form, deliveryAddressId: e.target.value })
                }
                style={{ ...inputStyle(), marginBottom: 8 }}
                disabled={loadingAddresses}
              >
                <option value="">
                  Select from existing addresses (optional)
                </option>
                {deliveryAddresses.map((addr) => (
                  <option key={addr.id} value={addr.id}>
                    {addr.street}, {addr.city}
                    {addr.state ? `, ${addr.state}` : ""}{" "}
                    {addr.postalCode || ""}
                  </option>
                ))}
              </select>
            )}
            <input
              type="text"
              value={form.deliveryAddressId}
              onChange={(e) =>
                setForm({ ...form, deliveryAddressId: e.target.value })
              }
              style={inputStyle()}
              placeholder={
                !form.userId
                  ? "Select customer first"
                  : "Enter delivery address ID (UUID)"
              }
              required
              disabled={loadingAddresses}
            />
            {form.userId && deliveryAddresses.length === 0 && (
              <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                No addresses found for this user. Please enter a delivery
                address ID manually.
              </div>
            )}
          </label>

          <label>
            <div>Delivery Slot ID (Optional)</div>
            <input
              value={form.deliverySlotId}
              onChange={(e) =>
                setForm({ ...form, deliverySlotId: e.target.value })
              }
              style={inputStyle()}
              placeholder="Enter delivery slot ID"
            />
          </label>
        </div>

        <div style={{ marginTop: 24, marginBottom: 16 }}>
          <h3 style={{ margin: 0, marginBottom: 12 }}>Order Items *</h3>
          {form.orderItems.map((item, index) => (
            <div
              key={index}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr auto",
                gap: 12,
                marginBottom: 12,
                padding: 12,
                border: "1px solid #e5e7eb",
                borderRadius: 8,
              }}
            >
              <div>
                <div style={{ marginBottom: 4, fontSize: 12, color: "#666" }}>
                  Product
                </div>
                <select
                  value={item.productId}
                  onChange={(e) => handleProductChange(index, e.target.value)}
                  style={inputStyle()}
                  required
                  disabled={loadingProducts}
                >
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - ₹{parseFloat(product.price).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div style={{ marginBottom: 4, fontSize: 12, color: "#666" }}>
                  Quantity
                </div>
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => {
                    const newOrderItems = [...form.orderItems];
                    newOrderItems[index].quantity =
                      parseInt(e.target.value) || 1;
                    setForm({ ...form, orderItems: newOrderItems });
                  }}
                  style={inputStyle()}
                  required
                />
              </div>
              <div>
                <div style={{ marginBottom: 4, fontSize: 12, color: "#666" }}>
                  Price (₹)
                </div>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={item.priceAtPurchase}
                  onChange={(e) => {
                    const newOrderItems = [...form.orderItems];
                    newOrderItems[index].priceAtPurchase =
                      e.target.value || "0";
                    setForm({ ...form, orderItems: newOrderItems });
                  }}
                  style={inputStyle()}
                  required
                />
              </div>
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                {form.orderItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeOrderItem(index)}
                    style={{
                      ...buttonStyle(),
                      background: "#ef4444",
                      borderColor: "#ef4444",
                      padding: "8px 12px",
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addOrderItem}
            style={{
              ...buttonStyle(),
              background: "#f3f4f6",
              color: "#111827",
              borderColor: "#e5e7eb",
              width: "100%",
            }}
          >
            + Add Product
          </button>
        </div>

        <div
          style={{
            padding: 16,
            background: "#f9fafb",
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>Total Amount:</strong>
            <strong>₹{calculateTotal().toFixed(2)}</strong>
          </div>
        </div>

        <label style={{ display: "block", marginTop: 12 }}>
          <div>Notes (Optional)</div>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            style={{ ...inputStyle(), minHeight: 80 }}
            placeholder="Enter order notes (e.g., phone order, special instructions)"
          />
        </label>

        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <button type="submit" style={buttonStyle()} disabled={saving}>
            {saving ? "Creating..." : "Create Order"}
          </button>
          <button
            type="button"
            style={{
              ...buttonStyle(),
              background: "#f3f4f6",
              color: "#111827",
              borderColor: "#e5e7eb",
            }}
            onClick={() => navigate("/orders")}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
