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
  InputNumber,
  DatePicker,
  Row,
  Col,
  Card,
  Statistic,
  Tooltip,
  Dropdown,
  type MenuProps,
  Checkbox,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  MoreOutlined,
  DownloadOutlined,
  UserOutlined,
  TeamOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  StopOutlined,
  MinusCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import type { Staff, StaffStatus, StaffRole, Department } from "../types/staff";
import {
  fetchStaffs,
  updateStaff,
  createStaff,
  deleteStaff,
  bulkUpdateStatus,
  bulkAssignRole,
  bulkAssignDepartment,
  bulkDelete,
  exportStaffsToCsv,
  listAllRoles,
  listAllDepartments,
  listAllPermissions,
} from "../services/staffs";

type SortOrder = "ascend" | "descend" | undefined;

const getStatusColor = (status: StaffStatus) => {
  switch (status) {
    case "active":
      return "green";
    case "inactive":
      return "default";
    case "suspended":
      return "red";
    case "terminated":
      return "red";
    default:
      return "default";
  }
};

const getStatusIcon = (status: StaffStatus) => {
  switch (status) {
    case "active":
      return <CheckCircleOutlined />;
    case "inactive":
      return <MinusCircleOutlined />;
    case "suspended":
      return <StopOutlined />;
    case "terminated":
      return <ExclamationCircleOutlined />;
    default:
      return null;
  }
};

const getRoleColor = (role: StaffRole) => {
  switch (role) {
    case "admin":
      return "red";
    case "manager":
      return "blue";
    case "supervisor":
      return "purple";
    case "staff":
      return "green";
    case "support":
      return "orange";
    default:
      return "default";
  }
};

const getDepartmentColor = (department: Department) => {
  switch (department) {
    case "operations":
      return "blue";
    case "customer_service":
      return "green";
    case "logistics":
      return "orange";
    case "sales":
      return "purple";
    case "hr":
      return "pink";
    case "finance":
      return "red";
    case "tech":
      return "cyan";
    default:
      return "default";
  }
};

export default function Staffs() {
  const [data, setData] = useState<Staff[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StaffStatus | "all">("all");
  const [roleFilter, setRoleFilter] = useState<StaffRole | "all">("all");
  const [departmentFilter, setDepartmentFilter] = useState<Department | "all">(
    "all"
  );
  const [sortBy, setSortBy] = useState<keyof Staff | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>(undefined);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [form] = Form.useForm();

  const statusOptions = useMemo(() => {
    const statuses: StaffStatus[] = [
      "active",
      "inactive",
      "suspended",
      "terminated",
    ];
    return [
      { label: "All Statuses", value: "all" },
      ...statuses.map((status) => ({
        label: status.charAt(0).toUpperCase() + status.slice(1),
        value: status,
      })),
    ];
  }, []);

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

  const departmentOptions = useMemo(() => {
    const departments = listAllDepartments();
    return [
      { label: "All Departments", value: "all" },
      ...departments.map((dept) => ({
        label: dept.charAt(0).toUpperCase() + dept.slice(1).replace("_", " "),
        value: dept,
      })),
    ];
  }, []);

  const permissionOptions = useMemo(() => {
    const permissions = listAllPermissions();
    return permissions.map((permission) => ({
      label: permission
        .replace("_", " ")
        .replace(/\b\w/g, (l) => l.toUpperCase()),
      value: permission,
    }));
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
          status: statusFilter,
          role: roleFilter,
          department: departmentFilter,
          sortBy,
          sortOrder,
        });
        if (!cancelled) {
          setData(res.data);
          setTotal(res.total);
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
    statusFilter,
    roleFilter,
    departmentFilter,
    sortBy,
    sortOrder,
  ]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusFilter = (value: StaffStatus | "all") => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleRoleFilter = (value: StaffRole | "all") => {
    setRoleFilter(value);
    setPage(1);
  };

  const handleDepartmentFilter = (value: Department | "all") => {
    setDepartmentFilter(value);
    setPage(1);
  };

  const handleTableChange = (
    _pagination: unknown,
    _filters: unknown,
    sorter: unknown
  ) => {
    const sorterObj = sorter as { field?: keyof Staff; order?: SortOrder };
    if (sorterObj && sorterObj.field) {
      setSortBy(sorterObj.field);
      setSortOrder(sorterObj.order);
    } else {
      setSortBy(undefined);
      setSortOrder(undefined);
    }
  };

  const handleAdd = () => {
    setEditingStaff(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (staff: Staff) => {
    setEditingStaff(staff);
    form.setFieldsValue({
      ...staff,
      hireDate: dayjs(staff.hireDate),
      lastLoginAt: staff.lastLoginAt ? dayjs(staff.lastLoginAt) : null,
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

  const handleBulkStatusUpdate = async (status: StaffStatus) => {
    if (selectedIds.length === 0) {
      message.warning("Please select staff first");
      return;
    }
    try {
      const count = await bulkUpdateStatus(selectedIds, status);
      message.success(`${count} staff updated successfully`);
      setSelectedIds([]);
      // Refresh data
      const res = await fetchStaffs({
        page,
        pageSize,
        search,
        status: statusFilter,
        role: roleFilter,
        department: departmentFilter,
        sortBy,
        sortOrder,
      });
      setData(res.data);
      setTotal(res.total);
    } catch {
      message.error("Failed to update staff");
    }
  };

  const handleBulkRoleUpdate = async (role: StaffRole) => {
    if (selectedIds.length === 0) {
      message.warning("Please select staff first");
      return;
    }
    try {
      const count = await bulkAssignRole(selectedIds, role);
      message.success(`${count} staff roles updated successfully`);
      setSelectedIds([]);
      // Refresh data
      const res = await fetchStaffs({
        page,
        pageSize,
        search,
        status: statusFilter,
        role: roleFilter,
        department: departmentFilter,
        sortBy,
        sortOrder,
      });
      setData(res.data);
      setTotal(res.total);
    } catch {
      message.error("Failed to update staff roles");
    }
  };

  const handleBulkDepartmentUpdate = async (department: Department) => {
    if (selectedIds.length === 0) {
      message.warning("Please select staff first");
      return;
    }
    try {
      const count = await bulkAssignDepartment(selectedIds, department);
      message.success(`${count} staff departments updated successfully`);
      setSelectedIds([]);
      // Refresh data
      const res = await fetchStaffs({
        page,
        pageSize,
        search,
        status: statusFilter,
        role: roleFilter,
        department: departmentFilter,
        sortBy,
        sortOrder,
      });
      setData(res.data);
      setTotal(res.total);
    } catch {
      message.error("Failed to update staff departments");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      message.warning("Please select staff first");
      return;
    }
    try {
      const count = await bulkDelete(selectedIds);
      message.success(`${count} staff deleted successfully`);
      setSelectedIds([]);
      setTotal(total - count);
      // Refresh data
      const res = await fetchStaffs({
        page,
        pageSize,
        search,
        status: statusFilter,
        role: roleFilter,
        department: departmentFilter,
        sortBy,
        sortOrder,
      });
      setData(res.data);
      setTotal(res.total);
    } catch {
      message.error("Failed to delete staff");
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
    a.download = `staff-${dayjs().format("YYYY-MM-DD")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    message.success("Export completed");
  };

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields();
      const staffData = {
        ...values,
        hireDate: values.hireDate?.toISOString(),
        lastLoginAt: values.lastLoginAt?.toISOString(),
      };

      if (editingStaff) {
        await updateStaff(editingStaff.id, staffData);
        message.success("Staff updated successfully");
      } else {
        await createStaff(staffData);
        message.success("Staff created successfully");
      }

      setModalVisible(false);
      form.resetFields();
      // Refresh data
      const res = await fetchStaffs({
        page,
        pageSize,
        search,
        status: statusFilter,
        role: roleFilter,
        department: departmentFilter,
        sortBy,
        sortOrder,
      });
      setData(res.data);
      setTotal(res.total);
    } catch {
      message.error("Failed to save staff");
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
      title: "Employee ID",
      dataIndex: "employeeId",
      key: "employeeId",
      width: 120,
      sorter: true,
    },
    {
      title: "Name",
      key: "name",
      width: 200,
      render: (_: unknown, record: Staff) => (
        <div>
          <div style={{ fontWeight: 600 }}>
            {record.firstName} {record.lastName}
          </div>
          <div style={{ fontSize: 12, color: "#666" }}>{record.email}</div>
        </div>
      ),
    },
    {
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
      width: 130,
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      width: 120,
      render: (role: StaffRole) => (
        <Tag color={getRoleColor(role)}>
          {role.charAt(0).toUpperCase() + role.slice(1)}
        </Tag>
      ),
      filters: roleOptions
        .slice(1)
        .map((option) => ({ text: option.label, value: option.value })),
      onFilter: (value: boolean | React.Key, record: Staff) =>
        record.role === value,
    },
    {
      title: "Department",
      dataIndex: "department",
      key: "department",
      width: 140,
      render: (department: Department) => (
        <Tag color={getDepartmentColor(department)}>
          {department.charAt(0).toUpperCase() +
            department.slice(1).replace("_", " ")}
        </Tag>
      ),
      filters: departmentOptions
        .slice(1)
        .map((option) => ({ text: option.label, value: option.value })),
      onFilter: (value: boolean | React.Key, record: Staff) =>
        record.department === value,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: StaffStatus) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Tag>
      ),
      filters: statusOptions
        .slice(1)
        .map((option) => ({ text: option.label, value: option.value })),
      onFilter: (value: boolean | React.Key, record: Staff) =>
        record.status === value,
    },
    {
      title: "Salary",
      dataIndex: "salary",
      key: "salary",
      width: 120,
      render: (salary: number | undefined) =>
        salary ? `$${salary.toLocaleString()}` : "N/A",
      sorter: true,
    },
    {
      title: "Hire Date",
      dataIndex: "hireDate",
      key: "hireDate",
      width: 120,
      render: (date: string) => dayjs(date).format("MMM DD, YYYY"),
      sorter: true,
    },
    {
      title: "Last Login",
      dataIndex: "lastLoginAt",
      key: "lastLoginAt",
      width: 130,
      render: (date: string | undefined) =>
        date ? dayjs(date).format("MMM DD, YYYY") : "Never",
      sorter: true,
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_: unknown, record: Staff) => (
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
            title="Delete Staff"
            description="Are you sure you want to delete this staff member?"
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

  const bulkActions: MenuProps["items"] = [
    {
      key: "status",
      label: "Update Status",
      icon: <CheckCircleOutlined />,
      children: statusOptions.slice(1).map((option) => ({
        key: `status-${option.value}`,
        label: option.label,
        onClick: () => handleBulkStatusUpdate(option.value as StaffStatus),
      })),
    },
    {
      key: "role",
      label: "Assign Role",
      icon: <UserOutlined />,
      children: roleOptions.slice(1).map((option) => ({
        key: `role-${option.value}`,
        label: option.label,
        onClick: () => handleBulkRoleUpdate(option.value as StaffRole),
      })),
    },
    {
      key: "department",
      label: "Assign Department",
      icon: <TeamOutlined />,
      children: departmentOptions.slice(1).map((option) => ({
        key: `dept-${option.value}`,
        label: option.label,
        onClick: () => handleBulkDepartmentUpdate(option.value as Department),
      })),
    },
    {
      type: "divider",
    },
    {
      key: "delete",
      label: "Delete Selected",
      icon: <DeleteOutlined />,
      danger: true,
      onClick: handleBulkDelete,
    },
  ];

  const stats = useMemo(() => {
    const active = data.filter((s) => s.status === "active").length;
    const totalSalary = data.reduce((sum, s) => sum + (s.salary || 0), 0);
    const avgSalary = data.length > 0 ? totalSalary / data.length : 0;
    const departments = new Set(data.map((s) => s.department)).size;

    return { active, totalSalary, avgSalary, departments };
  }, [data]);

  return (
    <div>
      {/* Stats Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Staff"
              value={stats.active}
              prefix={<UserOutlined />}
              valueStyle={{ color: "#3f8600" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Salary Budget"
              value={stats.totalSalary}
              prefix={<DollarOutlined />}
              precision={0}
              valueStyle={{ color: "#cf1322" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Average Salary"
              value={stats.avgSalary}
              prefix={<DollarOutlined />}
              precision={0}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Departments"
              value={stats.departments}
              prefix={<TeamOutlined />}
              valueStyle={{ color: "#722ed1" }}
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
            placeholder="Status"
            value={statusFilter}
            onChange={handleStatusFilter}
            options={statusOptions}
            style={{ width: 150 }}
          />
          <Select
            placeholder="Role"
            value={roleFilter}
            onChange={handleRoleFilter}
            options={roleOptions}
            style={{ width: 150 }}
          />
          <Select
            placeholder="Department"
            value={departmentFilter}
            onChange={handleDepartmentFilter}
            options={departmentOptions}
            style={{ width: 150 }}
          />
        </Space>

        <Space>
          {selectedIds.length > 0 && (
            <Dropdown menu={{ items: bulkActions }} trigger={["click"]}>
              <Button icon={<MoreOutlined />}>
                Bulk Actions ({selectedIds.length})
              </Button>
            </Dropdown>
          )}
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            Export
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Add Staff
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
            `${range[0]}-${range[1]} of ${total} staff`,
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
        title={editingStaff ? "Edit Staff" : "Add New Staff"}
        open={modalVisible}
        onOk={handleModalSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        width={800}
        okText="Save"
        cancelText="Cancel"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            status: "active",
            role: "staff",
            department: "operations",
            permissions: [],
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="firstName"
                label="First Name"
                rules={[{ required: true, message: "Please enter first name" }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="lastName"
                label="Last Name"
                rules={[{ required: true, message: "Please enter last name" }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: "Please enter email" },
                  { type: "email", message: "Please enter valid email" },
                ]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="Phone"
                rules={[
                  { required: true, message: "Please enter phone number" },
                ]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="role"
                label="Role"
                rules={[{ required: true, message: "Please select role" }]}
              >
                <Select options={roleOptions.slice(1)} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="department"
                label="Department"
                rules={[
                  { required: true, message: "Please select department" },
                ]}
              >
                <Select options={departmentOptions.slice(1)} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="status"
                label="Status"
                rules={[{ required: true, message: "Please select status" }]}
              >
                <Select options={statusOptions.slice(1)} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="salary"
                label="Salary"
                rules={[{ required: true, message: "Please enter salary" }]}
              >
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="hireDate"
                label="Hire Date"
                rules={[{ required: true, message: "Please select hire date" }]}
              >
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="address"
            label="Address"
            rules={[{ required: true, message: "Please enter address" }]}
          >
            <Input.TextArea rows={2} />
          </Form.Item>

          <Form.Item
            name="permissions"
            label="Permissions"
            rules={[
              {
                required: true,
                message: "Please select at least one permission",
              },
            ]}
          >
            <Checkbox.Group options={permissionOptions} />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
