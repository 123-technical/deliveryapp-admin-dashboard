import { useEffect, useMemo, useState } from "react";
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
  const [tableHeight, setTableHeight] = useState<number>(520);

  useEffect(() => {
    const calc = () => {
      // Heuristic: subtract header, content/card paddings, filters area
      const h = window.innerHeight - 300; // tune if needed
      setTableHeight(Math.max(320, h));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

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
    {
      title: "Order ID",
      dataIndex: "id",
      sorter: true,
      width: 140,
      fixed: "left",
    },
    {
      title: "Date & Time",
      dataIndex: "createdAt",
      sorter: true,
      render: (v) => dayjs(v).format("YYYY-MM-DD HH:mm"),
      width: 180,
      ellipsis: true,
      // fixed: "left",
    },
    {
      title: "Customer",
      dataIndex: "customerName",
      sorter: true,
      width: 180,
      ellipsis: true,
    },
    {
      title: "Contact",
      dataIndex: "contact",
      width: 160,
      ellipsis: true,
      responsive: ["md"],
    },
    // { title: "Items", dataIndex: "itemsCount", sorter: true, width: 80 },
    {
      title: "Total Amount (INR)",
      dataIndex: "totalPrice",
      sorter: true,
      render: (v) => `$${v.toFixed(2)}`,
      width: 160,
    },
    {
      title: "Payment Status",
      dataIndex: "paymentStatus",
      filters: [
        { text: "Paid", value: "paid" },
        { text: "Unpaid", value: "unpaid" },
        { text: "Refunded", value: "refunded" },
      ],
      render: (v) => v.charAt(0).toUpperCase() + v.slice(1),
      width: 150,
    },
    {
      title: " Order Status",
      dataIndex: "status",
      render: (v: OrderStatus) => <OrderStatusTag status={v} />,
      width: 160,
    },
    {
      title: "Rider",
      dataIndex: "riderName",
      width: 150,
      ellipsis: true,
      responsive: ["lg"],
    },
    {
      title: "ETA (min)",
      dataIndex: "etaMinutes",
      width: 110,
      responsive: ["lg"],
    },
    // Actions column can be re-enabled and fixed right if needed
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
              sortBy: (sorter.field as keyof Order) || undefined,
              sortOrder: sorter.order || undefined,
            });
          }
        }}
      />
    </Space>
  );
}
