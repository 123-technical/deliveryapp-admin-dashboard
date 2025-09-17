import { useMemo, useState } from "react";
import {
  Button,
  DatePicker,
  Input,
  Select,
  Space,
  Table,
  type TableColumnsType,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useQuery } from "@tanstack/react-query";
import type {
  Order,
  OrderStatus,
  OrdersQuery,
  PaymentStatus,
  OrdersResponse,
} from "../types/order";
import { fetchOrders } from "../services/orders";
import OrderStatusTag from "../components/OrderStatusTag";

const { RangePicker } = DatePicker;

export default function Orders() {
  const [search, setSearch] = useState<string>();
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [payment, setPayment] = useState<PaymentStatus | "all">("all");
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sorter, setSorter] = useState<{
    sortBy?: keyof Order;
    sortOrder?: "ascend" | "descend";
  }>({});

  const queryParams: OrdersQuery = useMemo(
    () => ({
      page,
      pageSize,
      search,
      status,
      payment,
      startDate: range?.[0]?.toISOString(),
      endDate: range?.[1]?.toISOString(),
      sortBy: sorter.sortBy,
      sortOrder: sorter.sortOrder,
    }),
    [page, pageSize, search, status, payment, range, sorter]
  );

  const { data, isFetching } = useQuery<OrdersResponse>({
    queryKey: ["orders", queryParams],
    queryFn: () => fetchOrders(queryParams),
    placeholderData: (prev) => prev,
    staleTime: 5_000,
  });

  const columns: TableColumnsType<Order> = [
    { title: "Order ID", dataIndex: "id", sorter: true, width: 120 },
    {
      title: "Date & Time",
      dataIndex: "createdAt",
      sorter: true,
      render: (v) => dayjs(v).format("YYYY-MM-DD HH:mm"),
    },
    { title: "Customer", dataIndex: "customerName", sorter: true },
    { title: "Contact", dataIndex: "contact" },
    { title: "Items", dataIndex: "itemsCount", sorter: true, width: 80 },
    {
      title: "Total",
      dataIndex: "totalPrice",
      sorter: true,
      render: (v) => `$${v.toFixed(2)}`,
      width: 100,
    },
    {
      title: "Payment",
      dataIndex: "paymentStatus",
      filters: [
        { text: "Paid", value: "paid" },
        { text: "Unpaid", value: "unpaid" },
        { text: "Refunded", value: "refunded" },
      ],
      render: (v) => v.charAt(0).toUpperCase() + v.slice(1),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (v: OrderStatus) => <OrderStatusTag status={v} />,
    },
    { title: "Rider", dataIndex: "riderName" },
    { title: "ETA (min)", dataIndex: "etaMinutes", width: 100 },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 180,
      render: () => (
        <Space>
          <Button size="small">View</Button>
          <Button size="small" type="text">
            Print
          </Button>
          <Button size="small" danger type="text">
            Cancel
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={16}>
      <Space wrap>
        <Input.Search
          allowClear
          placeholder="Search id, customer, phone"
          onSearch={(v) => {
            setSearch(v || undefined);
            setPage(1);
          }}
          style={{ width: 280 }}
        />
        <Select<OrderStatus | "all">
          style={{ width: 160 }}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={[
            { label: "All Status", value: "all" },
            { label: "Placed", value: "placed" },
            { label: "Packed", value: "packed" },
            { label: "Assigned", value: "assigned" },
            { label: "Picking", value: "picking" },
            { label: "Delivering", value: "delivering" },
            { label: "Delivered", value: "delivered" },
            { label: "Cancelled", value: "cancelled" },
            { label: "Refunded", value: "refunded" },
          ]}
        />
        <Select<PaymentStatus | "all">
          style={{ width: 160 }}
          value={payment}
          onChange={(v) => {
            setPayment(v);
            setPage(1);
          }}
          options={[
            { label: "All Payments", value: "all" },
            { label: "Paid", value: "paid" },
            { label: "Unpaid", value: "unpaid" },
            { label: "Refunded", value: "refunded" },
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
            setPayment("all");
            setRange(null);
            setPage(1);
            setSorter({});
          }}
        >
          Reset
        </Button>
      </Space>

      <Table<Order>
        rowKey={(r) => r.id}
        loading={isFetching}
        columns={columns}
        dataSource={data?.data || []}
        scroll={{ x: 1100 }}
        pagination={{
          current: page,
          pageSize,
          total: data?.total || 0,
          showSizeChanger: true,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
        onChange={(pagination, _filters, sorter) => {
          if (!Array.isArray(sorter)) {
            setSorter({
              sortBy: (sorter.field as keyof Order) || undefined,
              sortOrder: sorter.order || undefined,
            });
          }
        }}
      />
    </Space>
  );
}
