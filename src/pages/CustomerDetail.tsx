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
  Row,
  Col,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { getCustomerById } from "../services/customers";
import StatusBadge from "../components/StatusBadge";
import CopyableId from "../components/CopyableId";
import OrderStatusTag from "../components/OrderStatusTag";
import type { Customer, Address, AddressType } from "../types/customer";
import type { Order } from "../types/order";

const { Title, Text } = Typography;

const addressTypeColor: Record<AddressType, string> = {
  HOME: "blue",
  WORK: "purple",
  OTHER: "default",
};

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCustomer = useCallback(async (customerId: string) => {
    setLoading(true);
    try {
      const data = await getCustomerById(customerId);
      setCustomer(data);
    } catch {
      message.error("Failed to fetch customer details");
      navigate("/customers");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (id) fetchCustomer(id);
  }, [id, fetchCustomer]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Title level={3}>Failed to load customer</Title>
        <Button type="primary" onClick={() => navigate("/customers")}>
          Back to Customers
        </Button>
      </div>
    );
  }

  const addresses = customer.addresses || [];
  const orders = customer.orders || [];

  const orderColumns = [
    {
      title: "Order Number",
      dataIndex: "orderNumber",
      key: "orderNumber",
      render: (orderNumber: string | undefined, record: Order) => (
        <Text strong>{orderNumber ? orderNumber.substring(0, 8) : record.id.substring(0, 8)}</Text>
      ),
    },
    {
      title: "Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => dayjs(date).format("DD MMM YYYY, HH:mm"),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: Order["status"]) => <OrderStatusTag status={status} />,
    },
    {
      title: "Items",
      key: "itemCount",
      render: (_: unknown, record: Order) => (record.orderItems || record.items || []).length,
    },
    {
      title: "Total",
      dataIndex: "finalAmount",
      key: "finalAmount",
      render: (finalAmount: string | undefined) =>
        finalAmount ? `₹${parseFloat(finalAmount).toFixed(2)}` : "—",
    },
  ];

  return (
    <div style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Space align="center" size="large">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/customers")}>
            Back
          </Button>
          <Title level={3} style={{ margin: 0 }}>
            {customer.name || customer.username}
          </Title>
        </Space>
        <StatusBadge status={customer.status} />
      </div>

      <Row gutter={[24, 24]}>
        {/* Sidebar: Profile & Addresses */}
        <Col xs={24} md={8}>
          <Card title="Profile" style={{ marginBottom: 24 }}>
            <Descriptions column={1}>
              <Descriptions.Item label="ID">
                <CopyableId id={customer.id} />
              </Descriptions.Item>
              <Descriptions.Item label="Name">{customer.name || <Text type="secondary">—</Text>}</Descriptions.Item>
              <Descriptions.Item label="Username">{customer.username}</Descriptions.Item>
              <Descriptions.Item label="Email">{customer.email || <Text type="secondary">—</Text>}</Descriptions.Item>
              <Descriptions.Item label="Mobile">{customer.mobile}</Descriptions.Item>
              <Descriptions.Item label="Role">{customer.role}</Descriptions.Item>
              <Descriptions.Item label="Joined">{dayjs(customer.createdAt).format("DD MMM YYYY")}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <StatusBadge status={customer.status} />
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title={`Addresses (${addresses.length})`}>
            {addresses.length === 0 ? (
              <Text type="secondary">No saved addresses yet</Text>
            ) : (
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                {addresses.map((address: Address) => (
                  <div
                    key={address.id}
                    style={{
                      border: "1px solid #E2E8F0",
                      borderRadius: 8,
                      padding: 12,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <Tag color={addressTypeColor[address.addressType]}>{address.addressType}</Tag>
                      {address.isDefault && <Tag color="green">Default</Tag>}
                    </div>
                    <div>{address.street}</div>
                    <div>
                      {address.city}, {address.state} {address.postalCode}
                    </div>
                    <div>{address.country}</div>
                  </div>
                ))}
              </Space>
            )}
          </Card>
        </Col>

        {/* Main: Orders */}
        <Col xs={24} md={16}>
          <Card title={`Orders (${orders.length})`}>
            <Table<Order>
              columns={orderColumns}
              dataSource={orders}
              rowKey={(record) => record.id}
              pagination={false}
              size="middle"
              onRow={(record) => ({
                onClick: () => navigate(`/orders/${record.id}`),
                style: { cursor: "pointer" },
              })}
              locale={{
                emptyText: (
                  <div className="ds-empty">
                    <div className="ds-empty-icon">📦</div>
                    <div className="ds-empty-text">No orders yet</div>
                  </div>
                ),
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
