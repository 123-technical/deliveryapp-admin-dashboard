import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Button,
  Table,
  Input,
  Select,
  Space,
  Tag,
  Popconfirm,
  message,
  Modal,
  Form,
  Row,
  Col,
  Card,
  Statistic,
  Tooltip,
  Checkbox,
  Typography,
  Avatar,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  DownloadOutlined,
  UserOutlined,
  TeamOutlined,
  UserSwitchOutlined,
} from "@ant-design/icons";
import type { User, UserRole,  } from "../types/user";
import {
  fetchStaffs,
  updateStaff,
  createStaff,
  deleteStaff,
  bulkDelete,
  exportStaffsToCsv,
  listAllRoles,
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
  const { Title } = Typography;
  const [data, setData] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [sortBy, setSortBy] = useState<keyof User | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>(undefined);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [globalStats, setGlobalStats] = useState({
    total: 0,
    admins: 0,
    customers: 0,
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
        const res = await fetchStaffs({
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
        const adminRes = await fetchStaffs({ page: 1, pageSize: 1, role: 'ADMIN' });
        const superRes = await fetchStaffs({ page: 1, pageSize: 1, role: 'SUPER_ADMIN' });
        const customerRes = await fetchStaffs({ page: 1, pageSize: 1, role: 'CUSTOMER' });
        const riderRes = await fetchStaffs({ page: 1, pageSize: 1, role: 'DELIVERY_PERSONNEL' });

        setGlobalStats({
          total: total, // Overall total from the main fetch
          admins: (adminRes.metadata?.total || 0) + (superRes.metadata?.total || 0),
          customers: customerRes.metadata?.total || 0,
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

  const handleDelete = async (id: string) => {
    try {
      await deleteStaff(id);
      message.success("Staff deleted successfully");
      setData(data.filter((item) => item.id !== id));
      setTotal(total - 1);
    } catch {
      message.error("Failed to delete staff");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      message.warning("Please select users first");
      return;
    }
    try {
      const count = await bulkDelete(selectedIds);
      message.success(`${count} users deleted successfully`);
      setSelectedIds([]);
      setTotal(total - count);
      // Refresh data
      const res = await fetchStaffs({
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
      message.error("Failed to delete users");
    }
  };

  const handleExport = () => {
    const ids =
      selectedIds.length > 0 ? selectedIds : data.map((item) => item.id);
    const csv = exportStaffsToCsv(ids);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-${dayjs().format("YYYY-MM-DD")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    message.success("Export completed");
  };

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields();
      const userData = {
        ...values,
      };

      if (editingUser) {
        await updateStaff(editingUser.id, userData);
        message.success("User updated successfully");
      } else {
        await createStaff(userData);
        message.success("User created successfully");
      }

      setModalVisible(false);
      form.resetFields();
      // Refresh data
      const res = await fetchStaffs({
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
      message.error("Failed to save user");
    }
  };

  const rowSelection = {
    selectedRowKeys: selectedIds,
    onChange: (selectedRowKeys: React.Key[]) => {
      setSelectedIds(selectedRowKeys as string[]);
    },
  };

  const columns = [
    {
      title: "User",
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
              {record.name || "Unnamed User"}
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
      render: (role: UserRole) => (
        <Tag 
          color={getRoleColor(role)} 
          style={{ 
            borderRadius: "6px", 
            padding: "2px 10px",
            fontWeight: 500,
            textTransform: "capitalize"
          }}
        >
          {role.toLowerCase().replace("_", " ")}
        </Tag>
      ),
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
      render: (_: unknown, record: User) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() =>
                message.info("View details functionality coming soon")
              }
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete User"
            description="Are you sure you want to delete this user?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button type="text" icon={<DeleteOutlined />} danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];



  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <Title level={2} style={{ margin: 0 }}>
          User Management
        </Title>
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
              title={<span style={{ color: "rgba(255,255,255,0.8)" }}>Total Users</span>}
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
              title={<span style={{ color: "rgba(0,0,0,0.6)" }}>Customers</span>}
              value={globalStats.customers}
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
            placeholder="Search users..."
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
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            Export
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Add User
          </Button>
        </Space>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey="id"
        rowSelection={rowSelection}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} of ${total} users`,
          onChange: (page, pageSize) => {
            setPage(page);
            setPageSize(pageSize || 10);
          },
        }}
        onChange={handleTableChange}
        scroll={{ x: 1200 }}
      />

      {/* Add/Edit Modal */}
      <Modal
        title={editingUser ? "Edit User" : "Add New User"}
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
    </div>
  );
}
