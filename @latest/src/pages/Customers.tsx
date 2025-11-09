import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  DatePicker,
  Input,
  Select,
  Space,
  Table,
  Card,
  Typography,
  Tag,
  Modal,
  message,
  type TableColumnsType,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import type {
  Customer,
  CustomerStatus,
  CustomersQuery,
  CustomersResponse,
} from "../types/customer";
import { fetchCustomers, updateCustomerStatus } from "../services/customers";

const { RangePicker } = DatePicker;
const { Text } = Typography;

export default function Customers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState<string>("");
  const [status, setStatus] = useState<CustomerStatus | "all">("all");
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sorter, setSorter] = useState<{
    sortBy?: keyof Customer;
    sortOrder?: "ascend" | "descend";
  }>({});

  const queryClient = useQueryClient();
  const [modal, modalContextHolder] = Modal.useModal();

  const queryParams: CustomersQuery = useMemo(
    () => ({
      page,
      pageSize,
      search: search || undefined,
      status: status === "all" ? undefined : status,
      startDate: range?.[0]?.toISOString(),
      endDate: range?.[1]?.toISOString(),
      sortBy: sorter.sortBy,
      sortOrder: sorter.sortOrder,
    }),
    [page, pageSize, search, status, range, sorter]
  );

  const { data, isFetching } = useQuery<CustomersResponse>({
    queryKey: ["customers", queryParams],
    queryFn: () => fetchCustomers(queryParams),
    placeholderData: (prev) => prev,
    staleTime: 5_000,
  });

  const mutation = useMutation({
    mutationFn: ({
      id,
      newStatus,
    }: {
      id: string;
      newStatus: CustomerStatus;
    }) => updateCustomerStatus(id, newStatus),
    onMutate: async ({ id, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: ["customers"] });
      const previous = queryClient.getQueriesData<CustomersResponse>({
        queryKey: ["customers"],
      }) as [QueryKey, CustomersResponse | undefined][];
      // Optimistically update cached pages
      previous.forEach(([key, value]) => {
        if (!value) return;
        const updated: CustomersResponse = {
          ...value,
          data: value.data.map((c) =>
            c.id === id ? { ...c, status: newStatus } : c
          ),
        };
        queryClient.setQueryData<CustomersResponse>(key, updated);
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      (ctx?.previous as [QueryKey, CustomersResponse | undefined][])?.forEach(
        ([key, value]) => queryClient.setQueryData(key, value)
      );
      message.error("Failed to update status");
    },
    onSuccess: () => {
      message.success("Status updated");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  const confirmChange = (record: Customer, next: CustomerStatus) => {
    const displayName =
      record.name || record.username || record.email || "Customer";
    modal.confirm({
      title: "Change customer status?",
      content: `Are you sure you want to change ${displayName}'s status to ${next}?`,
      okText: "Confirm",
      cancelText: "Cancel",
      zIndex: 2000,
      onOk: () => mutation.mutate({ id: record.id, newStatus: next }),
    });
  };

  const columns: TableColumnsType<Customer> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 100,
      fixed: "left",
      render: (id: string) => (
        <Text
          copyable={{ text: id }}
          style={{ fontFamily: "monospace", fontSize: "12px" }}
        >
          {id.substring(0, 8)}...
        </Text>
      ),
      sorter: true,
    },
    {
      title: "Username",
      dataIndex: "username",
      key: "username",
      width: 150,
      ellipsis: true,
      sorter: true,
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      width: 180,
      ellipsis: true,
      render: (name: string | null, record: Customer) => (
        <Text>{name || record.username || "-"}</Text>
      ),
      sorter: true,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 200,
      ellipsis: true,
      render: (email: string | null) =>
        email || <Text type="secondary">-</Text>,
      sorter: true,
    },
    {
      title: "Mobile",
      dataIndex: "mobile",
      key: "mobile",
      width: 150,
      ellipsis: true,
      render: (mobile: string) => (
        <Text copyable={{ text: mobile }}>{mobile}</Text>
      ),
      sorter: true,
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      width: 120,
      render: (role: string) => <Tag color="blue">{role}</Tag>,
      sorter: true,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 160,
      render: (value: CustomerStatus, record) => (
        <Select<CustomerStatus>
          size="small"
          value={value}
          onChange={(v) => confirmChange(record, v)}
          options={[
            { label: "Active", value: "active" },
            { label: "Blocked", value: "blocked" },
            { label: "Inactive", value: "inactive" },
          ]}
          style={{ minWidth: 140 }}
        />
      ),
      filters: [
        { text: "Active", value: "active" },
        { text: "Blocked", value: "blocked" },
        { text: "Inactive", value: "inactive" },
      ],
      onFilter: (value: boolean | React.Key, record: Customer) =>
        record.status === value,
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 150,
      render: (date: string) => dayjs(date).format("YYYY-MM-DD HH:mm"),
      sorter: true,
    },
    {
      title: "Updated At",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 150,
      render: (date: string) => dayjs(date).format("YYYY-MM-DD HH:mm"),
      sorter: true,
    },
    {
      title: "Deleted At",
      dataIndex: "deletedAt",
      key: "deletedAt",
      width: 150,
      render: (date: string | null) =>
        date ? (
          dayjs(date).format("YYYY-MM-DD HH:mm")
        ) : (
          <Text type="success">Active</Text>
        ),
      sorter: true,
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      {modalContextHolder}
      <div style={{ marginBottom: "24px" }}>
        <Typography.Title level={2} style={{ margin: 0 }}>
          Customers Management
        </Typography.Title>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 8,
          }}
        >
          <Text type="secondary">
            Manage and track all customers in the system
          </Text>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate("/customers/add")}
          >
            Create User
          </Button>
        </div>
      </div>

      <Card style={{ marginBottom: "24px" }}>
        <Space wrap>
          <Input.Search
            allowClear
            placeholder="Search by ID, username, name, email, or mobile"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={() => {
              setPage(1);
            }}
            onPressEnter={() => {
              setPage(1);
            }}
            style={{ width: 360 }}
          />
          <Select<CustomerStatus | "all">
            style={{ width: 160 }}
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            options={[
              { label: "All Status", value: "all" },
              { label: "Active", value: "active" },
              { label: "Blocked", value: "blocked" },
              { label: "Inactive", value: "inactive" },
            ]}
          />
          <RangePicker
            onChange={(value) => {
              setRange(value as [Dayjs | null, Dayjs | null] | null);
              setPage(1);
            }}
            allowEmpty={[true, true]}
          />
          <Button
            onClick={() => {
              setSearch("");
              setStatus("all");
              setRange(null);
              setPage(1);
              setSorter({});
            }}
          >
            Reset
          </Button>
        </Space>
      </Card>

      <Card>
        <Table<Customer>
          rowKey={(r) => r.id}
          loading={isFetching || mutation.isPending}
          columns={columns}
          dataSource={data?.data || []}
          size="middle"
          scroll={{ x: 1400 }}
          pagination={{
            current: page,
            pageSize,
            total: data?.total || 0,
            responsive: true,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} customers`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          onChange={(_pagination, _filters, sorter) => {
            if (!Array.isArray(sorter)) {
              setSorter({
                sortBy: (sorter.field as keyof Customer) || undefined,
                sortOrder: sorter.order || undefined,
              });
            }
          }}
        />
      </Card>
    </div>
  );
}
