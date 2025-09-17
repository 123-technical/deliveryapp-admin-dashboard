import { useEffect, useMemo, useState } from "react";
import {
  Button,
  DatePicker,
  Input,
  Select,
  Space,
  Table,
  Modal,
  message,
  type TableColumnsType,
} from "antd";
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

export default function Customers() {
  const [search, setSearch] = useState<string>();
  const [status, setStatus] = useState<CustomerStatus | "all">("all");
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sorter, setSorter] = useState<{
    sortBy?: keyof Customer;
    sortOrder?: "ascend" | "descend";
  }>({});
  const [tableHeight, setTableHeight] = useState<number>(520);
  const queryClient = useQueryClient();
  const [modal, modalContextHolder] = Modal.useModal();

  useEffect(() => {
    const calc = () => setTableHeight(Math.max(320, window.innerHeight - 300));
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const queryParams: CustomersQuery = useMemo(
    () => ({
      page,
      pageSize,
      search,
      status,
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
    modal.confirm({
      title: "Change customer status?",
      content: `Are you sure you want to change ${record.fullName}'s status to ${next}?`,
      okText: "Confirm",
      cancelText: "Cancel",
      zIndex: 2000,
      onOk: () => mutation.mutate({ id: record.id, newStatus: next }),
    });
  };

  const columns: TableColumnsType<Customer> = [
    {
      title: "Customer ID",
      dataIndex: "id",
      width: 140,
      sorter: true,
      fixed: "left",
    },
    {
      title: "Full Name",
      dataIndex: "fullName",
      sorter: true,
      width: 180,
      ellipsis: true,
    },
    { title: "Phone", dataIndex: "phone", width: 200, ellipsis: true },
    {
      title: "Location",
      dataIndex: "location",
      width: 200,
      ellipsis: true,
      responsive: ["md"],
    },
    {
      title: "Registration Date",
      dataIndex: "registrationDate",
      sorter: true,
      render: (v) => dayjs(v).format("YYYY-MM-DD"),
      width: 150,
    },
    {
      title: "Total Orders",
      dataIndex: "totalOrders",
      sorter: true,
      width: 130,
    },
    {
      title: "Total Spent",
      dataIndex: "totalSpent",
      sorter: true,
      render: (v) => `$${v.toFixed(2)}`,
      width: 130,
    },
    {
      title: "Last Order",
      dataIndex: "lastOrderAt",
      render: (v) => (v ? dayjs(v).format("YYYY-MM-DD") : "-"),
      width: 140,
      responsive: ["lg"],
    },
    {
      title: "Status",
      dataIndex: "status",
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
    },
  ];

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={16}>
      {modalContextHolder}
      <Space wrap>
        <Input.Search
          allowClear
          placeholder="Search id, name, email, phone, location"
          onSearch={(v) => {
            setSearch(v || undefined);
            setPage(1);
          }}
          style={{ width: 360 }}
        />
        <Select<CustomerStatus | "all">
          style={{ width: 160 }}
          value={status}
          onChange={(v) => {
            setStatus(v);
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
          onChange={(v) => {
            setRange(v as [Dayjs | null, Dayjs | null] | null);
            setPage(1);
          }}
          allowEmpty={[true, true]}
        />
        <Button
          onClick={() => {
            setSearch(undefined);
            setStatus("all");
            setRange(null);
            setPage(1);
            setSorter({});
          }}
        >
          Reset
        </Button>
      </Space>

      <Table<Customer>
        rowKey={(r) => r.id}
        loading={isFetching || mutation.isPending}
        columns={columns}
        dataSource={data?.data || []}
        size="middle"
        sticky
        scroll={{ x: "max-content", y: tableHeight }}
        pagination={{
          current: page,
          pageSize,
          total: data?.total || 0,
          responsive: true,
          showSizeChanger: true,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
        onChange={(pagination, _filters, sorter) => {
          if (!Array.isArray(sorter)) {
            setSorter({
              sortBy: sorter.field as keyof Customer,
              sortOrder: sorter.order || undefined,
            });
          }
        }}
      />
    </Space>
  );
}
