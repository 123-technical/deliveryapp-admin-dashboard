import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Button,
  Table,
  Input,
  Select,
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
  UserOutlined,
  TeamOutlined,
  UserSwitchOutlined,
} from "@ant-design/icons";
import type { User, UserRole } from "../types/user";

import {
  fetchUsers,
  updateUser,
  createUser,
  deleteUser,
  listAllRoles,
  getUserById,
} from "../services/users";

type SortOrder = "ascend" | "descend" | undefined;


const getRoleColor = (role: UserRole) => {
  switch (role) {
    case "ADMIN":
    case "SUPER_ADMIN":
      return "red";
    case "DELIVERY_PERSONNEL":
      return "blue";
    case "CUSTOMER":
      return "green";
    default:
      return "default";
  }
};


export default function Users() {
  const [data, setData] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [sortBy, setSortBy] = useState<keyof User | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>(undefined);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [globalStats, setGlobalStats] = useState({
    total: 0,
    admins: 0,
    supportStaff: 0,
    riders: 0
  });
  const [form] = Form.useForm();


  const roleOptions = useMemo(() => {
    const roles = listAllRoles();
    return [
      { label: "All Roles", value: "all" },
      ...roles.map((role) => ({
        label: role.charAt(0).toUpperCase() + role.slice(1),
        value: role,
      })),
    ];
  }, []);



  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchUsers({
          page,
          pageSize,
          search,
          role: roleFilter,
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
  }, [
    page,
    pageSize,
    search,
    roleFilter,
    sortBy,
    sortOrder,
  ]);

  // Fetch global stats for cards
  useEffect(() => {
    const fetchGlobalStats = async () => {
      try {
        // Fetch total admins (ADMIN + SUPER_ADMIN)
        const adminRes = await fetchUsers({ page: 1, pageSize: 1, role: 'ADMIN' });
        const superRes = await fetchUsers({ page: 1, pageSize: 1, role: 'SUPER_ADMIN' });
        const supportRes = await fetchUsers({ page: 1, pageSize: 1, role: 'SUPPORT_STAFF' });
        const riderRes = await fetchUsers({ page: 1, pageSize: 1, role: 'DELIVERY_PERSONNEL' });

        setGlobalStats({
          total: total, // Overall total from the main fetch (staff only)
          admins: (adminRes.metadata?.total || 0) + (superRes.metadata?.total || 0),
          supportStaff: supportRes.metadata?.total || 0,
          riders: riderRes.metadata?.total || 0,
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


  const handleRoleFilter = (value: UserRole | "all") => {
    setRoleFilter(value);
    setPage(1);
  };

  const handleTableChange = (
    _pagination: unknown,
    _filters: unknown,
    sorter: unknown
  ) => {
    const sorterObj = sorter as { field?: keyof User; order?: SortOrder };
    if (sorterObj && sorterObj.field) {
      setSortBy(sorterObj.field);
      setSortOrder(sorterObj.order);
    } else {
      setSortBy(undefined);
      setSortOrder(undefined);
    }
  };

  const handleAdd = () => {
    setEditingUser(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      ...user,
    });
    setModalVisible(true);
  };

  const handleViewDetails = async (id: string) => {
    setDetailLoading(true);
    setDetailVisible(true);
    try {
      const user = await getUserById(id);
      setViewingUser(user);
    } catch {
      message.error("Failed to load staff details");
      setDetailVisible(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteUser(id);
      message.success("Staff deleted successfully");
      setData(data.filter((item) => item.id !== id));
      setTotal(total - 1);
    } catch {
      message.error("Failed to delete Staff");
    }
  };

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields();
      const userData = {
        ...values,
      };

      if (editingUser) {
        await updateUser(editingUser.id, userData);
        message.success("Staff updated successfully");
      } else {
        await createUser(userData);
        message.success("Staff created successfully");
      }

      setModalVisible(false);
      form.resetFields();
      // Refresh data
      const res = await fetchUsers({
        page,
        pageSize,
        search,
        role: roleFilter,
        sortBy,
        sortOrder,
      });
      setData(res.data);
      setTotal(res.metadata?.total);
    } catch {
      message.error("Failed to save staff");
    }
  };

  const columns = [
    {
      title: "Staff",
      key: "user",
      width: 250,
      render: (_: unknown, record: User) => (
        <Space size="middle">
          <Avatar 
            style={{ 
              backgroundColor: getRoleColor(record.role),
              verticalAlign: 'middle',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
            size="large"
          >
            {(record.name || record.username || "?")[0].toUpperCase()}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600, fontSize: "15px", color: "#1a1a1a" }}>
              {record.name || "Unnamed Staff"}
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
      render: (_: unknown, record: User) => (
        <div>
          <div style={{ fontSize: "14px", color: "#434343" }}>{record.email || "No Email"}</div>
          <div style={{ fontSize: "12px", color: "#8c8c8c" }}>{record.mobile}</div>
        </div>
      ),
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      width: 160,
      render: (role: UserRole) => {
        const roleClass = role.toLowerCase() === "admin" || role.toLowerCase() === "super_admin"
          ? "cancelled"
          : role.toLowerCase() === "delivery_personnel"
          ? "confirmed"
          : "active";
        return (
          <span className={`ds-badge ${roleClass}`}>
            {role.toLowerCase().replace(/_/g, " ")}
          </span>
        );
      },
      filters: roleOptions
        .slice(1)
        .map((option) => ({ text: option.label, value: option.value })),
      onFilter: (value: boolean | React.Key, record: User) =>
        record.role === value,
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
      render: (_: unknown, record: User) => (
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
            title="Delete Staff"
            description="Are you sure you want to delete this staff member?"
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
        <h1 className="ds-page-title">Staff Management</h1>
      </div>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              borderRadius: "16px",
              boxShadow: "0 10px 20px rgba(0,0,0,0.1)",
            }}
          >
            <Statistic
              title={<span style={{ color: "rgba(255,255,255,0.8)" }}>Total Staff</span>}
              value={globalStats.total}
              prefix={<TeamOutlined style={{ color: "#fff" }} />}
              valueStyle={{ color: "#fff", fontWeight: "bold" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{
              background: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
              borderRadius: "16px",
              boxShadow: "0 10px 20px rgba(0,0,0,0.1)",
            }}
          >
            <Statistic
              title={<span style={{ color: "rgba(0,0,0,0.6)" }}>Admins</span>}
              value={globalStats.admins}
              prefix={<UserOutlined style={{ color: "rgba(0,0,0,0.7)" }} />}
              valueStyle={{ color: "rgba(0,0,0,0.8)", fontWeight: "bold" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{
              background: "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)",
              borderRadius: "16px",
              boxShadow: "0 10px 20px rgba(0,0,0,0.1)",
            }}
          >
            <Statistic
              title={<span style={{ color: "rgba(0,0,0,0.6)" }}>Support Staff</span>}
              value={globalStats.supportStaff}
              prefix={<TeamOutlined style={{ color: "rgba(0,0,0,0.7)" }} />}
              valueStyle={{ color: "rgba(0,0,0,0.8)", fontWeight: "bold" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{
              background: "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)",
              borderRadius: "16px",
              boxShadow: "0 10px 20px rgba(0,0,0,0.1)",
            }}
          >
            <Statistic
              title={<span style={{ color: "rgba(0,0,0,0.6)" }}>Riders</span>}
              value={globalStats.riders}
              prefix={<UserSwitchOutlined style={{ color: "rgba(0,0,0,0.7)" }} />}
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
            placeholder="Search staff..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={(e) =>
              handleSearch((e.target as HTMLInputElement).value)
            }
            style={{ width: 250 }}
          />
          <Select
            placeholder="Role"
            value={roleFilter}
            onChange={handleRoleFilter}
            options={roleOptions}
            style={{ width: 150 }}
          />
        </Space>

        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Add Staff
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
              `${range[0]}-${range[1]} of ${total} staff`,
            onChange: (page, pageSize) => {
              setPage(page);
              setPageSize(pageSize || 10);
            },
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
          locale={{
            emptyText: (
              <div className="ds-empty">
                <div className="ds-empty-icon">👤</div>
                <div className="ds-empty-text">No staff found</div>
              </div>
            ),
          }}
        />
      </div>

      {/* Add/Edit Modal */}
      <Modal
        title={editingUser ? "Edit Staff" : "Add New Staff"}
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

          {!editingUser && (
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

          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true, message: "Please select a role" }]}
          >
            <Select
              options={[
                { label: "Admin", value: "ADMIN" },
                { label: "Support Staff", value: "SUPPORT_STAFF" },
                { label: "Rider", value: "DELIVERY_PERSONNEL" },
              ]}
            />
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
        title="Staff Details"
        placement="right"
        width={500}
        onClose={() => setDetailVisible(false)}
        open={detailVisible}
        loading={detailLoading}
      >
        {viewingUser && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Avatar
                size={100}
                style={{ 
                  backgroundColor: getRoleColor(viewingUser.role),
                  fontSize: '40px',
                  marginBottom: '16px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              >
                {viewingUser.name?.[0]?.toUpperCase() || viewingUser.username[0].toUpperCase()}
              </Avatar>
              <Typography.Title level={3} style={{ margin: 0 }}>{viewingUser.name || 'N/A'}</Typography.Title>
              <Typography.Text type="secondary">@{viewingUser.username}</Typography.Text>
            </div>

            <Descriptions 
              title="Personal Information" 
              column={1} 
              bordered 
              size="small"
              items={[
                { label: 'Email', children: viewingUser.email || 'N/A' },
                { label: 'Mobile', children: viewingUser.mobile },
                { 
                  label: 'Role', 
                  children: <Tag color={getRoleColor(viewingUser.role)}>{viewingUser.role.replace('_', ' ')}</Tag> 
                },
              ]}
            />

            <Descriptions 
              title="Account Metadata" 
              column={1} 
              bordered 
              size="small"
              items={[
                { label: 'ID', children: viewingUser.id },
                { 
                  label: 'Created At', 
                  children: dayjs(viewingUser.createdAt).format("MMMM DD, YYYY HH:mm") 
                },
                { 
                  label: 'Last Updated', 
                  children: dayjs(viewingUser.updatedAt).format("MMMM DD, YYYY HH:mm") 
                },
                { 
                  label: 'Status', 
                  children: (
                    <Tag color={viewingUser.deletedAt ? 'error' : 'success'}>
                      {viewingUser.deletedAt ? 'Deleted' : 'Active'}
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
                  handleEdit(viewingUser);
                }}
              >
                Edit Staff
              </Button>
            </div>
          </Space>
        )}
      </Drawer>
    </div>
  );
}
