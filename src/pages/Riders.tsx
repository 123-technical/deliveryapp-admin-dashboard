import { useEffect, useState } from "react";
import dayjs from "dayjs";
import {
  Button,
  Table,
  Input,
  Space,
  Popconfirm,
  message,
  Modal,
  Form,
  Row,
  Col,
  Card,
  Statistic,
  Avatar,
  Drawer,
  Descriptions,
  Typography,
  Tag,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CarOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import type { Rider } from "../types/rider";

import {
  fetchRiders,
  updateRider,
  createRider,
  deleteRider,
  getRiderById,
} from "../services/riders";

type SortOrder = "ascend" | "descend" | undefined;

export default function Riders() {
  const [data, setData] = useState<Rider[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<keyof Rider | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>(undefined);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRider, setEditingRider] = useState<Rider | null>(null);
  const [viewingRider, setViewingRider] = useState<Rider | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [globalStats, setGlobalStats] = useState({
    total: 0,
    newThisWeek: 0,
    newThisMonth: 0,
  });
  const [form] = Form.useForm();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchRiders({
          page,
          pageSize,
          search,
          sortBy,
          sortOrder,
        });
        if (!cancelled) {
          setData(res.data);
          setTotal(res.metadata?.total);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, search, sortBy, sortOrder]);

  // Fetch global stats for cards
  useEffect(() => {
    const fetchGlobalStats = async () => {
      try {
        const weekRes = await fetchRiders({
          page: 1,
          pageSize: 1,
          createdAfter: dayjs().startOf("week").toISOString(),
        });
        const monthRes = await fetchRiders({
          page: 1,
          pageSize: 1,
          createdAfter: dayjs().startOf("month").toISOString(),
        });

        setGlobalStats({
          total, // Overall total from the main fetch
          newThisWeek: weekRes.metadata?.total || 0,
          newThisMonth: monthRes.metadata?.total || 0,
        });
      } catch (error) {
        console.error("Failed to fetch global stats", error);
      }
    };
    fetchGlobalStats();
  }, [total]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleTableChange = (
    _pagination: unknown,
    _filters: unknown,
    sorter: unknown
  ) => {
    const sorterObj = sorter as { field?: keyof Rider; order?: SortOrder };
    if (sorterObj && sorterObj.field) {
      setSortBy(sorterObj.field);
      setSortOrder(sorterObj.order);
    } else {
      setSortBy(undefined);
      setSortOrder(undefined);
    }
  };

  const handleAdd = () => {
    setEditingRider(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (rider: Rider) => {
    setEditingRider(rider);
    form.setFieldsValue({
      ...rider,
    });
    setModalVisible(true);
  };

  const handleViewDetails = async (id: string) => {
    setDetailLoading(true);
    setDetailVisible(true);
    try {
      const rider = await getRiderById(id);
      setViewingRider(rider);
    } catch {
      message.error("Failed to load rider details");
      setDetailVisible(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRider(id);
      message.success("Rider deleted successfully");
      setData(data.filter((item) => item.id !== id));
      setTotal(total - 1);
    } catch {
      message.error("Failed to delete rider");
    }
  };

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields();
      const riderData = {
        ...values,
      };

      if (editingRider) {
        await updateRider(editingRider.id, riderData);
        message.success("Rider updated successfully");
      } else {
        await createRider(riderData);
        message.success("Rider created successfully");
      }

      setModalVisible(false);
      form.resetFields();
      // Refresh data
      const res = await fetchRiders({
        page,
        pageSize,
        search,
        sortBy,
        sortOrder,
      });
      setData(res.data);
      setTotal(res.metadata?.total);
    } catch {
      message.error("Failed to save rider");
    }
  };

  const columns = [
    {
      title: "Rider",
      key: "rider",
      width: 250,
      render: (_: unknown, record: Rider) => (
        <Space size="middle">
          <Avatar
            style={{
              backgroundColor: "#1890ff",
              verticalAlign: "middle",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
            size="large"
          >
            {(record.name || record.username || "?")[0].toUpperCase()}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600, fontSize: "15px", color: "#1a1a1a" }}>
              {record.name || "Unnamed Rider"}
            </div>
            <div style={{ fontSize: "13px", color: "#8c8c8c" }}>
              @{record.username}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: "Contact",
      key: "contact",
      width: 200,
      render: (_: unknown, record: Rider) => (
        <div>
          <div style={{ fontSize: "14px", color: "#434343" }}>{record.email || "No Email"}</div>
          <div style={{ fontSize: "12px", color: "#8c8c8c" }}>{record.mobile}</div>
        </div>
      ),
    },
    {
      title: "Joined Date",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 150,
      render: (date: string) => (
        <span style={{ color: "#595959" }}>
          {dayjs(date).format("MMM DD, YYYY")}
        </span>
      ),
      sorter: true,
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      fixed: "right" as const,
      render: (_: unknown, record: Rider) => (
        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
          <Button
            className="ds-action-btn edit"
            icon={<EyeOutlined style={{ fontSize: 14 }} />}
            onClick={() => handleViewDetails(record.id)}
            title="View Details"
          />
          <Button
            className="ds-action-btn edit"
            icon={<EditOutlined style={{ fontSize: 14 }} />}
            onClick={() => handleEdit(record)}
            title="Edit"
          />
          <Popconfirm
            title="Delete Rider"
            description="Are you sure you want to delete this rider?"
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            cancelText="Cancel"
            okType="danger"
          >
            <Button
              className="ds-action-btn delete"
              icon={<DeleteOutlined style={{ fontSize: 14 }} />}
              title="Delete"
            />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, background: "#F8FAFC", minHeight: "100vh" }}>
      <div className="ds-page-header" style={{ marginBottom: 24 }}>
        <h1 className="ds-page-title">Riders</h1>
      </div>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={8}>
          <Card
            bordered={false}
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              borderRadius: "16px",
              boxShadow: "0 10px 20px rgba(0,0,0,0.1)",
            }}
          >
            <Statistic
              title={<span style={{ color: "rgba(255,255,255,0.8)" }}>Total Riders</span>}
              value={globalStats.total}
              prefix={<CarOutlined style={{ color: "#fff" }} />}
              valueStyle={{ color: "#fff", fontWeight: "bold" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card
            bordered={false}
            style={{
              background: "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)",
              borderRadius: "16px",
              boxShadow: "0 10px 20px rgba(0,0,0,0.1)",
            }}
          >
            <Statistic
              title={<span style={{ color: "rgba(0,0,0,0.6)" }}>New This Week</span>}
              value={globalStats.newThisWeek}
              prefix={<CalendarOutlined style={{ color: "rgba(0,0,0,0.7)" }} />}
              valueStyle={{ color: "rgba(0,0,0,0.8)", fontWeight: "bold" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card
            bordered={false}
            style={{
              background: "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)",
              borderRadius: "16px",
              boxShadow: "0 10px 20px rgba(0,0,0,0.1)",
            }}
          >
            <Statistic
              title={<span style={{ color: "rgba(0,0,0,0.6)" }}>New This Month</span>}
              value={globalStats.newThisMonth}
              prefix={<CalendarOutlined style={{ color: "rgba(0,0,0,0.7)" }} />}
              valueStyle={{ color: "rgba(0,0,0,0.8)", fontWeight: "bold" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters and Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <Space wrap>
          <Input
            placeholder="Search riders..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={(e) =>
              handleSearch((e.target as HTMLInputElement).value)
            }
            style={{ width: 250 }}
          />
        </Space>

        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Add Rider
          </Button>
        </Space>
      </div>

      {/* Table */}
      <div className="ds-table-wrapper">
        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="id"
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} riders`,
            onChange: (page, pageSize) => {
              setPage(page);
              setPageSize(pageSize || 10);
            },
          }}
          onChange={handleTableChange}
          scroll={{ x: 1000 }}
          locale={{
            emptyText: (
              <div className="ds-empty">
                <div className="ds-empty-icon">🏍️</div>
                <div className="ds-empty-text">No riders found</div>
              </div>
            ),
          }}
        />
      </div>

      {/* Add/Edit Modal */}
      <Modal
        title={editingRider ? "Edit Rider" : "Add New Rider"}
        open={modalVisible}
        onOk={handleModalSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        width={600}
        okText="Save"
        cancelText="Cancel"
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: "Please enter username" }]}
          >
            <Input />
          </Form.Item>

          {!editingRider && (
            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: "Please enter password" }]}
            >
              <Input.Password />
            </Form.Item>
          )}

          <Form.Item
            name="name"
            label="Full Name"
          >
            <Input />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { type: "email", message: "Please enter valid email" },
                ]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="mobile"
                label="Mobile"
                rules={[
                  { required: true, message: "Please enter mobile number" },
                ]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Drawer
        title="Rider Details"
        placement="right"
        width={500}
        onClose={() => setDetailVisible(false)}
        open={detailVisible}
        loading={detailLoading}
      >
        {viewingRider && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Avatar
                size={100}
                style={{
                  backgroundColor: "#1890ff",
                  fontSize: '40px',
                  marginBottom: '16px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              >
                {viewingRider.name?.[0]?.toUpperCase() || viewingRider.username[0].toUpperCase()}
              </Avatar>
              <Typography.Title level={3} style={{ margin: 0 }}>{viewingRider.name || 'N/A'}</Typography.Title>
              <Typography.Text type="secondary">@{viewingRider.username}</Typography.Text>
            </div>

            <Descriptions
              title="Personal Information"
              column={1}
              bordered
              size="small"
              items={[
                { label: 'Email', children: viewingRider.email || 'N/A' },
                { label: 'Mobile', children: viewingRider.mobile },
              ]}
            />

            <Descriptions
              title="Account Metadata"
              column={1}
              bordered
              size="small"
              items={[
                { label: 'ID', children: viewingRider.id },
                {
                  label: 'Created At',
                  children: dayjs(viewingRider.createdAt).format("MMMM DD, YYYY HH:mm")
                },
                {
                  label: 'Last Updated',
                  children: dayjs(viewingRider.updatedAt).format("MMMM DD, YYYY HH:mm")
                },
                {
                  label: 'Status',
                  children: (
                    <Tag color={viewingRider.deletedAt ? 'error' : 'success'}>
                      {viewingRider.deletedAt ? 'Deleted' : 'Active'}
                    </Tag>
                  )
                },
              ]}
            />

            <div style={{ marginTop: '20px' }}>
              <Button
                type="primary"
                block
                icon={<EditOutlined />}
                onClick={() => {
                  setDetailVisible(false);
                  handleEdit(viewingRider);
                }}
              >
                Edit Rider
              </Button>
            </div>
          </Space>
        )}
      </Drawer>
    </div>
  );
}
