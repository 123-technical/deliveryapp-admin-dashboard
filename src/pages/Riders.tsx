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
  CarOutlined,
  StarOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  MinusCircleOutlined,
} from "@ant-design/icons";
import type { Rider, RiderStatus, VehicleType } from "../types/rider";
import {
  fetchRiders,
  updateRider,
  createRider,
  deleteRider,
  bulkUpdateStatus,
  bulkDelete,
  exportRidersToCsv,
  listAllStatuses,
  listAllVehicleTypes,
  listAllLicenseTypes,
} from "../services/riders";

type SortOrder = "ascend" | "descend" | undefined;

const getStatusColor = (status: RiderStatus) => {
  switch (status) {
    case "active":
      return "green";
    case "inactive":
      return "default";
    case "suspended":
      return "red";
    case "offline":
      return "orange";
    case "busy":
      return "blue";
    default:
      return "default";
  }
};

const getStatusIcon = (status: RiderStatus) => {
  switch (status) {
    case "active":
      return <CheckCircleOutlined />;
    case "inactive":
      return <MinusCircleOutlined />;
    case "suspended":
      return <StopOutlined />;
    case "offline":
      return <ClockCircleOutlined />;
    case "busy":
      return <ClockCircleOutlined />;
    default:
      return null;
  }
};

const getVehicleIcon = () => {
  return <CarOutlined />;
};

export default function Riders() {
  const [data, setData] = useState<Rider[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RiderStatus | "all">("all");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<
    VehicleType | "all"
  >("all");
  const [sortBy, setSortBy] = useState<keyof Rider | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>(undefined);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRider, setEditingRider] = useState<Rider | null>(null);
  const [form] = Form.useForm();

  const statusOptions = useMemo(() => {
    const statuses = listAllStatuses();
    return [
      { label: "All Statuses", value: "all" },
      ...statuses.map((status) => ({
        label: status.charAt(0).toUpperCase() + status.slice(1),
        value: status,
      })),
    ];
  }, []);

  const vehicleTypeOptions = useMemo(() => {
    const types = listAllVehicleTypes();
    return [
      { label: "All Vehicles", value: "all" },
      ...types.map((type) => ({
        label: type.charAt(0).toUpperCase() + type.slice(1),
        value: type,
      })),
    ];
  }, []);

  const licenseTypeOptions = useMemo(() => {
    const types = listAllLicenseTypes();
    return types.map((type) => ({
      label: `License ${type}`,
      value: type,
    }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchRiders({
          page,
          pageSize,
          search,
          status: statusFilter,
          vehicleType: vehicleTypeFilter,
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
    vehicleTypeFilter,
    sortBy,
    sortOrder,
  ]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusFilter = (value: RiderStatus | "all") => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleVehicleTypeFilter = (value: VehicleType | "all") => {
    setVehicleTypeFilter(value);
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
      licenseExpiry: rider.licenseExpiry ? dayjs(rider.licenseExpiry) : null,
      joinDate: dayjs(rider.joinDate),
    });
    setModalVisible(true);
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

  const handleBulkStatusUpdate = async (status: RiderStatus) => {
    if (selectedIds.length === 0) {
      message.warning("Please select riders first");
      return;
    }
    try {
      const count = await bulkUpdateStatus(selectedIds, status);
      message.success(`${count} riders updated successfully`);
      setSelectedIds([]);
      // Refresh data
      const res = await fetchRiders({
        page,
        pageSize,
        search,
        status: statusFilter,
        vehicleType: vehicleTypeFilter,
        sortBy,
        sortOrder,
      });
      setData(res.data);
      setTotal(res.total);
    } catch {
      message.error("Failed to update riders");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      message.warning("Please select riders first");
      return;
    }
    try {
      const count = await bulkDelete(selectedIds);
      message.success(`${count} riders deleted successfully`);
      setSelectedIds([]);
      setTotal(total - count);
      // Refresh data
      const res = await fetchRiders({
        page,
        pageSize,
        search,
        status: statusFilter,
        vehicleType: vehicleTypeFilter,
        sortBy,
        sortOrder,
      });
      setData(res.data);
      setTotal(res.total);
    } catch {
      message.error("Failed to delete riders");
    }
  };

  const handleExport = () => {
    const ids =
      selectedIds.length > 0 ? selectedIds : data.map((item) => item.id);
    const csv = exportRidersToCsv(ids);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `riders-${dayjs().format("YYYY-MM-DD")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    message.success("Export completed");
  };

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields();
      const riderData = {
        ...values,
        licenseExpiry: values.licenseExpiry?.toISOString(),
        joinDate: values.joinDate?.toISOString(),
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
        status: statusFilter,
        vehicleType: vehicleTypeFilter,
        sortBy,
        sortOrder,
      });
      setData(res.data);
      setTotal(res.total);
    } catch {
      message.error("Failed to save rider");
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
      title: "Rider ID",
      dataIndex: "riderId",
      key: "riderId",
      width: 120,
      sorter: true,
    },
    {
      title: "Name",
      key: "name",
      width: 200,
      render: (_: unknown, record: Rider) => (
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
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: RiderStatus) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Tag>
      ),
      filters: statusOptions
        .slice(1)
        .map((option) => ({ text: option.label, value: option.value })),
      onFilter: (value: boolean | React.Key, record: Rider) =>
        record.status === value,
    },
    {
      title: "Vehicle",
      key: "vehicle",
      width: 150,
      render: (_: unknown, record: Rider) => (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {getVehicleIcon()}
            <span>
              {record.vehicleType.charAt(0).toUpperCase() +
                record.vehicleType.slice(1)}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#666" }}>
            {record.vehicleModel}
          </div>
        </div>
      ),
      filters: vehicleTypeOptions
        .slice(1)
        .map((option) => ({ text: option.label, value: option.value })),
      onFilter: (value: boolean | React.Key, record: Rider) =>
        record.vehicleType === value,
    },
    {
      title: "License",
      key: "license",
      width: 120,
      render: (_: unknown, record: Rider) => (
        <div>
          <div>{record.licenseNumber}</div>
          <div style={{ fontSize: 12, color: "#666" }}>
            Type {record.licenseType}
          </div>
        </div>
      ),
    },
    {
      title: "Rating",
      dataIndex: "rating",
      key: "rating",
      width: 100,
      render: (rating: number) => (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <StarOutlined style={{ color: "#faad14" }} />
          <span>{rating.toFixed(1)}</span>
        </div>
      ),
      sorter: true,
    },
    {
      title: "Deliveries",
      dataIndex: "totalDeliveries",
      key: "totalDeliveries",
      width: 100,
      sorter: true,
    },
    {
      title: "Earnings",
      dataIndex: "totalEarnings",
      key: "totalEarnings",
      width: 120,
      render: (amount: number) => `$${amount.toFixed(2)}`,
      sorter: true,
    },
    {
      title: "Join Date",
      dataIndex: "joinDate",
      key: "joinDate",
      width: 120,
      render: (date: string) => dayjs(date).format("MMM DD, YYYY"),
      sorter: true,
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_: unknown, record: Rider) => (
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
            title="Delete Rider"
            description="Are you sure you want to delete this rider?"
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
      key: "active",
      label: "Mark as Active",
      icon: <CheckCircleOutlined />,
      onClick: () => handleBulkStatusUpdate("active"),
    },
    {
      key: "inactive",
      label: "Mark as Inactive",
      icon: <MinusCircleOutlined />,
      onClick: () => handleBulkStatusUpdate("inactive"),
    },
    {
      key: "suspended",
      label: "Suspend",
      icon: <StopOutlined />,
      onClick: () => handleBulkStatusUpdate("suspended"),
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
    const active = data.filter((r) => r.status === "active").length;
    const totalEarnings = data.reduce((sum, r) => sum + r.totalEarnings, 0);
    const avgRating =
      data.length > 0
        ? data.reduce((sum, r) => sum + r.rating, 0) / data.length
        : 0;
    const totalDeliveries = data.reduce((sum, r) => sum + r.totalDeliveries, 0);

    return { active, totalEarnings, avgRating, totalDeliveries };
  }, [data]);

  return (
    <div>
      {/* Stats Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Riders"
              value={stats.active}
              prefix={<UserOutlined />}
              valueStyle={{ color: "#3f8600" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Earnings"
              value={stats.totalEarnings}
              prefix={<DollarOutlined />}
              precision={2}
              valueStyle={{ color: "#cf1322" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Average Rating"
              value={stats.avgRating}
              prefix={<StarOutlined />}
              precision={1}
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Deliveries"
              value={stats.totalDeliveries}
              prefix={<CarOutlined />}
              valueStyle={{ color: "#1890ff" }}
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
          <Select
            placeholder="Status"
            value={statusFilter}
            onChange={handleStatusFilter}
            options={statusOptions}
            style={{ width: 150 }}
          />
          <Select
            placeholder="Vehicle Type"
            value={vehicleTypeFilter}
            onChange={handleVehicleTypeFilter}
            options={vehicleTypeOptions}
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
            Add Rider
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
            `${range[0]}-${range[1]} of ${total} riders`,
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
        title={editingRider ? "Edit Rider" : "Add New Rider"}
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
            vehicleType: "motorcycle",
            licenseType: "A",
            rating: 5.0,
            totalDeliveries: 0,
            totalEarnings: 0,
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
                name="status"
                label="Status"
                rules={[{ required: true, message: "Please select status" }]}
              >
                <Select options={statusOptions.slice(1)} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="vehicleType"
                label="Vehicle Type"
                rules={[
                  { required: true, message: "Please select vehicle type" },
                ]}
              >
                <Select options={vehicleTypeOptions.slice(1)} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="licenseType"
                label="License Type"
                rules={[
                  { required: true, message: "Please select license type" },
                ]}
              >
                <Select options={licenseTypeOptions} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="licenseNumber"
                label="License Number"
                rules={[
                  { required: true, message: "Please enter license number" },
                ]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="licenseExpiry"
                label="License Expiry"
                rules={[
                  {
                    required: true,
                    message: "Please select license expiry date",
                  },
                ]}
              >
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="vehicleRegistration"
                label="Vehicle Registration"
                rules={[
                  {
                    required: true,
                    message: "Please enter vehicle registration",
                  },
                ]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="vehicleModel"
                label="Vehicle Model"
                rules={[
                  { required: true, message: "Please enter vehicle model" },
                ]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="vehicleYear"
                label="Vehicle Year"
                rules={[
                  { required: true, message: "Please enter vehicle year" },
                ]}
              >
                <InputNumber min={1990} max={2024} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="rating"
                label="Rating"
                rules={[{ required: true, message: "Please enter rating" }]}
              >
                <InputNumber
                  min={1}
                  max={5}
                  step={0.1}
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="joinDate"
                label="Join Date"
                rules={[{ required: true, message: "Please select join date" }]}
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

          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
