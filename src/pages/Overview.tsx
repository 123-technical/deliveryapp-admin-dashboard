import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Typography,
  Skeleton,
  Tag,
  Table,
  Button,
  Tooltip,
  message,
} from "antd";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ShoppingOutlined,
  AppstoreOutlined,
  TagsOutlined,
  TeamOutlined,
  ReloadOutlined,
  RiseOutlined,
  FallOutlined,
  CopyOutlined,
  TrophyOutlined,
  AlertOutlined,
  CarOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { orderService } from "../services/orders";
import { productService } from "../services/products";
import { categoryService } from "../services/categories";
import { fetchCustomers } from "../services/customers";
import type { Order } from "../types/order";

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

// ─── Design Tokens ────────────────────────────────────────────────────────────
const ACCENT = {
  blue:   { solid: "#3B82F6", bg: "#EFF6FF" },
  purple: { solid: "#8B5CF6", bg: "#F5F3FF" },
  green:  { solid: "#10B981", bg: "#ECFDF5" },
  orange: { solid: "#F59E0B", bg: "#FFFBEB" },
  red:    { solid: "#EF4444", bg: "#FEF2F2" },
};

const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const getStatusColor = (status: string) => {
  const map: Record<string, string> = {
    PENDING: "orange", CONFIRMED: "blue", PROCESSING: "cyan",
    OUT_FOR_DELIVERY: "orange", SHIPPED: "purple",
    DELIVERED: "green", CANCELLED: "red", REFUNDED: "volcano",
  };
  return map[status] || "default";
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getWeekRange() {
  const now = dayjs();
  const dow = now.day(); // 0=Sun … 6=Sat
  // ISO week: Mon=0 … Sun=6
  const daysSinceMon = dow === 0 ? 6 : dow - 1;
  const weekStart = now.subtract(daysSinceMon, "day").startOf("day");
  const weekEnd   = weekStart.add(6, "day").endOf("day");
  return { weekStart, weekEnd };
}

function getTodayRange() {
  const start = dayjs().startOf("day");
  const end   = dayjs().endOf("day");
  return { start, end };
}

function getYesterdayRange() {
  const start = dayjs().subtract(1, "day").startOf("day");
  const end   = dayjs().subtract(1, "day").endOf("day");
  return { start, end };
}

function buildWeeklyData(orders: Order[]) {
  const base = DAYS_SHORT.map((day) => ({ day, orders: 0, revenue: 0 }));
  const { weekStart } = getWeekRange();

  orders.forEach((order) => {
    const d = dayjs(order.createdAt);
    const idx = d.diff(weekStart, "day");
    if (idx >= 0 && idx < 7) {
      base[idx].orders += 1;
      const items = order.orderItems || order.items || [];
      const rev = items.reduce(
        (sum, item) => sum + Number(item.priceAtPurchase) * item.quantity,
        0
      );
      base[idx].revenue += rev;
    }
  });
  return base;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accent: { solid: string; bg: string };
  trend?: { value: number; label: string } | null;
  loading: boolean;
  error: boolean;
}

function StatCard({ icon, label, value, accent, trend, loading, error }: StatCardProps) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        border: "1px solid #E5E7EB",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        padding: "20px 24px",
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
        borderLeft: `4px solid ${accent.solid}`,
        flex: 1,
        minWidth: 0,
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          background: accent.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: accent.solid,
        }}
      >
        {icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 13, color: "#6B7280", display: "block", marginBottom: 4 }}>
          {label}
        </Text>
        {loading ? (
          <Skeleton.Input active style={{ height: 32, width: 80, borderRadius: 6 }} />
        ) : error ? (
          <Text style={{ fontSize: 28, fontWeight: 700, color: "#9CA3AF" }}>—</Text>
        ) : (
          <Text style={{ fontSize: 32, fontWeight: 700, color: "#111827", lineHeight: 1.1 }}>
            {value}
          </Text>
        )}
        {trend && !loading && !error && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
            {trend.value >= 0 ? (
              <RiseOutlined style={{ fontSize: 14, color: "#10B981" }} />
            ) : (
              <FallOutlined style={{ fontSize: 14, color: "#EF4444" }} />
            )}
            <Text
              style={{
                fontSize: 12,
                color: trend.value >= 0 ? "#10B981" : "#EF4444",
                fontWeight: 500,
              }}
            >
              {trend.value >= 0 ? "+" : ""}{trend.value} {trend.label}
            </Text>
          </div>
        )}
      </div>
    </div>
  );
}

interface QuickStatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  sub?: string;
  accent: { solid: string; bg: string };
  loading: boolean;
}

function QuickStatCard({ icon, title, value, sub, accent, loading }: QuickStatCardProps) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        border: "1px solid #E5E7EB",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        padding: "20px 24px",
        flex: 1,
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: accent.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: accent.solid,
          }}
        >
          {icon}
        </div>
        <Text style={{ fontSize: 13, color: "#6B7280" }}>{title}</Text>
      </div>
      {loading ? (
        <Skeleton.Input active style={{ height: 28, width: 100, borderRadius: 6 }} />
      ) : (
        <>
          <Text style={{ fontSize: 24, fontWeight: 700, color: "#111827" }}>{value}</Text>
          {sub && (
            <Text style={{ fontSize: 12, color: "#9CA3AF", display: "block", marginTop: 2 }}>
              {sub}
            </Text>
          )}
        </>
      )}
    </div>
  );
}

const CustomOrdersTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, padding: "8px 14px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
        <Text style={{ fontSize: 12, color: "#6B7280", display: "block" }}>{label}</Text>
        <Text style={{ fontSize: 14, fontWeight: 600, color: "#3B82F6" }}>{payload[0].value} orders</Text>
      </div>
    );
  }
  return null;
};

const CustomRevenueTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, padding: "8px 14px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
        <Text style={{ fontSize: 12, color: "#6B7280", display: "block" }}>{label}</Text>
        <Text style={{ fontSize: 14, fontWeight: 600, color: "#10B981" }}>₹{payload[0].value.toFixed(2)}</Text>
      </div>
    );
  }
  return null;
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Overview() {
  const navigate = useNavigate();

  // Stat card states
  const [todayOrders, setTodayOrders]       = useState(0);
  const [yesterdayOrders, setYesterdayOrders] = useState<number | null>(null);
  const [totalProducts, setTotalProducts]   = useState(0);
  const [totalCategories, setTotalCategories] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);

  // Chart states
  const [weeklyData, setWeeklyData] = useState(
    DAYS_SHORT.map((day) => ({ day, orders: 0, revenue: 0 }))
  );

  // Recent orders
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  // Quick stats
  const [outOfStock, setOutOfStock]     = useState(0);
  const [activeRiders, setActiveRiders] = useState<number | null>(null);
  const [topCategory, setTopCategory]   = useState<{ name: string; count: number } | null>(null);

  // Loading / error flags
  const [loadingStats, setLoadingStats]   = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [loadingQuick, setLoadingQuick]   = useState(true);
  const [errorStats, setErrorStats]       = useState<Partial<Record<"orders"|"products"|"categories"|"customers", boolean>>>({});

  const [lastUpdated, setLastUpdated] = useState(dayjs());

  // ── Data Fetching ──────────────────────────────────────────────────────────
  const fetchStatCards = useCallback(async () => {
    setLoadingStats(true);
    const errs: typeof errorStats = {};

    const { weekStart, weekEnd } = getWeekRange();
    const { start: todayStart, end: todayEnd } = getTodayRange();
    const { start: ystStart, end: ystEnd } = getYesterdayRange();

    // 1. Orders (fetch this week to cover today + yesterday + chart)
    const ordersResult = await Promise.allSettled([
      orderService.getOrders({ page: 1, pageSize: 500, startDate: weekStart.toISOString(), endDate: weekEnd.toISOString() }),
    ]);

    let weekOrders: Order[] = [];
    if (ordersResult[0].status === "fulfilled") {
      weekOrders = ordersResult[0].value.data || [];
      const today = weekOrders.filter((o) => {
        const d = dayjs(o.createdAt);
        return d.isAfter(todayStart) && d.isBefore(todayEnd);
      });
      const yesterday = weekOrders.filter((o) => {
        const d = dayjs(o.createdAt);
        return d.isAfter(ystStart) && d.isBefore(ystEnd);
      });
      setTodayOrders(today.length);
      setYesterdayOrders(yesterday.length);
      setWeeklyData(buildWeeklyData(weekOrders));
    } else {
      errs.orders = true;
    }

    // 2. Products total
    const productsResult = await Promise.allSettled([
      productService.getProducts({ page: 1, pageSize: 1 }),
    ]);
    if (productsResult[0].status === "fulfilled") {
      setTotalProducts(productsResult[0].value.total || 0);
    } else {
      errs.products = true;
    }

    // 3. Categories
    const categoriesResult = await Promise.allSettled([
      categoryService.getEnabledCategories(),
    ]);
    if (categoriesResult[0].status === "fulfilled") {
      setTotalCategories(categoriesResult[0].value.length);
    } else {
      errs.categories = true;
    }

    // 4. Customers
    const customersResult = await Promise.allSettled([
      fetchCustomers({ page: 1, pageSize: 1 }),
    ]);
    if (customersResult[0].status === "fulfilled") {
      setTotalCustomers(customersResult[0].value.total || 0);
    } else {
      errs.customers = true;
    }

    setErrorStats(errs);
    setLoadingStats(false);
    setLoadingCharts(false);
  }, []);

  const fetchRecentOrders = useCallback(async () => {
    setLoadingRecent(true);
    try {
      const res = await orderService.getOrders({ page: 1, pageSize: 5 });
      setRecentOrders(res.data || []);
    } catch {
      setRecentOrders([]);
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  const fetchQuickStats = useCallback(async () => {
    setLoadingQuick(true);

    const [oos, riders] = await Promise.allSettled([
      productService.getProducts({ page: 1, pageSize: 1, isAvailable: false }),
      // Riders uses mock data service
      (async () => {
        const { fetchRiders } = await import("../services/riders");
        return fetchRiders({ page: 1, pageSize: 500 });
      })(),
    ]);

    if (oos.status === "fulfilled") setOutOfStock(oos.value.total || 0);
    if (riders.status === "fulfilled") {
      const active = (riders.value.data || []).filter(
        (r: any) => r.status === "active"
      ).length;
      setActiveRiders(active);
    }

    // Top category: use categories list and rough product count guess
    try {
      const cats = await categoryService.getEnabledCategories();
      if (cats.length > 0) {
        // Fetch products per category (first 3 categories to avoid N+1 overload)
        const topCats = cats.slice(0, 5);
        const results = await Promise.allSettled(
          topCats.map((c) =>
            productService.getProducts({ page: 1, pageSize: 1, categoryId: c.id })
          )
        );
        let best = { name: cats[0].name, count: 0 };
        results.forEach((r, i) => {
          if (r.status === "fulfilled") {
            const count = r.value.total || 0;
            if (count > best.count) best = { name: topCats[i].name, count };
          }
        });
        setTopCategory(best);
      }
    } catch {
      // silent
    }

    setLoadingQuick(false);
  }, []);

  const refresh = useCallback(async () => {
    setLastUpdated(dayjs());
    await Promise.allSettled([fetchStatCards(), fetchRecentOrders(), fetchQuickStats()]);
    message.success("Dashboard refreshed");
  }, [fetchStatCards, fetchRecentOrders, fetchQuickStats]);

  useEffect(() => {
    fetchStatCards();
    fetchRecentOrders();
    fetchQuickStats();
  }, [fetchStatCards, fetchRecentOrders, fetchQuickStats]);

  // ── Trend computation ──────────────────────────────────────────────────────
  const todayTrend =
    yesterdayOrders !== null
      ? { value: todayOrders - yesterdayOrders, label: "vs yesterday" }
      : null;

  // ── Recent orders columns ──────────────────────────────────────────────────
  const recentColumns = [
    {
      title: "Order ID",
      dataIndex: "id",
      key: "id",
      render: (id: string) => (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Text code style={{ fontSize: 12 }}>{id.substring(0, 8)}</Text>
          <Tooltip title="Copy ID">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined style={{ fontSize: 12 }} />}
              onClick={() => {
                navigator.clipboard.writeText(id);
                message.success("Copied");
              }}
              style={{ padding: 0, height: "auto", lineHeight: 1 }}
            />
          </Tooltip>
        </div>
      ),
    },
    {
      title: "Customer",
      key: "customer",
      render: (_: any, record: Order) => {
        const name  = record.user?.name  || "Unknown";
        const email = record.user?.email || "";
        return (
          <div>
            <Text strong style={{ fontSize: 13 }}>{name}</Text>
            {email && <Text type="secondary" style={{ fontSize: 11, display: "block" }}>{email}</Text>}
          </div>
        );
      },
    },
    {
      title: "Items",
      key: "items",
      render: (_: any, record: Order) => {
        const c = (record.orderItems || record.items || []).length;
        return <Text style={{ fontSize: 13 }}>{c} {c === 1 ? "item" : "items"}</Text>;
      },
    },
    {
      title: "Total",
      key: "total",
      render: (_: any, record: Order) => {
        const items = record.orderItems || record.items || [];
        const sum = record.finalAmount
          ? parseFloat(record.finalAmount)
          : items.reduce((s, i) => s + Number(i.priceAtPurchase) * i.quantity, 0);
        return <Text strong style={{ color: "#3B82F6" }}>₹{sum.toFixed(2)}</Text>;
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={getStatusColor(status)} style={{ fontSize: 11 }}>
          {status.replace(/_/g, " ")}
        </Tag>
      ),
    },
    {
      title: "Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {dayjs(date).fromNow()}
        </Text>
      ),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "24px", background: "#F8F9FA", minHeight: "100vh" }}>
      {/* ── Page Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: "#111827", fontWeight: 700 }}>
            Dashboard
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Welcome back — here's what's happening today.
          </Text>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Last updated {lastUpdated.fromNow()}
          </Text>
          <Tooltip title="Refresh dashboard">
            <Button
              icon={<ReloadOutlined />}
              size="small"
              onClick={refresh}
              style={{ display: "flex", alignItems: "center" }}
            >
              Refresh
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* ── Section 1: Stat Cards ── */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <StatCard
          icon={<ShoppingOutlined style={{ fontSize: 20 }} />}
          label="Today's Orders"
          value={todayOrders}
          accent={ACCENT.blue}
          trend={todayTrend}
          loading={loadingStats}
          error={!!errorStats.orders}
        />
        <StatCard
          icon={<AppstoreOutlined style={{ fontSize: 20 }} />}
          label="Total Products"
          value={totalProducts.toLocaleString()}
          accent={ACCENT.purple}
          trend={null}
          loading={loadingStats}
          error={!!errorStats.products}
        />
        <StatCard
          icon={<TagsOutlined style={{ fontSize: 20 }} />}
          label="Total Categories"
          value={totalCategories}
          accent={ACCENT.green}
          trend={null}
          loading={loadingStats}
          error={!!errorStats.categories}
        />
        <StatCard
          icon={<TeamOutlined style={{ fontSize: 20 }} />}
          label="Total Customers"
          value={totalCustomers.toLocaleString()}
          accent={ACCENT.orange}
          trend={null}
          loading={loadingStats}
          error={!!errorStats.customers}
        />
      </div>

      {/* ── Section 2: Charts ── */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        {/* Chart A — Orders */}
        <div
          style={{
            flex: "3 1 400px",
            background: "#fff",
            borderRadius: 12,
            border: "1px solid #E5E7EB",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            padding: "20px 24px",
          }}
        >
          <Text strong style={{ fontSize: 15, color: "#111827" }}>Orders This Week</Text>
          <div style={{ height: 240, marginTop: 16 }}>
            {loadingCharts ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <RechartsTooltip content={<CustomOrdersTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="orders"
                    stroke="#3B82F6"
                    strokeWidth={2.5}
                    fill="url(#gradOrders)"
                    dot={{ fill: "#3B82F6", r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: "#3B82F6", strokeWidth: 2, stroke: "#fff" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart B — Revenue */}
        <div
          style={{
            flex: "2 1 280px",
            background: "#fff",
            borderRadius: 12,
            border: "1px solid #E5E7EB",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            padding: "20px 24px",
          }}
        >
          <Text strong style={{ fontSize: 15, color: "#111827" }}>Revenue This Week</Text>
          <div style={{ height: 240, marginTop: 16 }}>
            {loadingCharts ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                  <RechartsTooltip content={<CustomRevenueTooltip />} />
                  <Bar dataKey="revenue" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── Section 3: Recent Orders ── */}
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #E5E7EB",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          marginBottom: 24,
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Text strong style={{ fontSize: 15, color: "#111827" }}>Recent Orders</Text>
          <Button
            type="link"
            onClick={() => navigate("/orders")}
            style={{ padding: 0, fontSize: 13, color: "#3B82F6" }}
          >
            View All →
          </Button>
        </div>
        <Table
          rowKey="id"
          loading={loadingRecent}
          columns={recentColumns}
          dataSource={recentOrders}
          pagination={false}
          size="middle"
          locale={{ emptyText: <div style={{ padding: "32px 0", color: "#9CA3AF" }}>No orders yet</div> }}
          style={{ borderRadius: 0 }}
        />
      </div>

      {/* ── Section 4: Quick Stats ── */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <QuickStatCard
          icon={<TrophyOutlined style={{ fontSize: 18 }} />}
          title="Top Category"
          value={topCategory ? topCategory.name : "—"}
          sub={topCategory ? `${topCategory.count} products` : "No data yet"}
          accent={ACCENT.orange}
          loading={loadingQuick}
        />
        <QuickStatCard
          icon={<AlertOutlined style={{ fontSize: 18 }} />}
          title="Out of Stock"
          value={outOfStock}
          sub={outOfStock === 0 ? "All products available" : `${outOfStock} products unavailable`}
          accent={ACCENT.red}
          loading={loadingQuick}
        />
        <QuickStatCard
          icon={<CarOutlined style={{ fontSize: 18 }} />}
          title="Active Riders"
          value={activeRiders !== null ? activeRiders : "—"}
          sub="Currently online"
          accent={ACCENT.blue}
          loading={loadingQuick}
        />
      </div>
    </div>
  );
}
