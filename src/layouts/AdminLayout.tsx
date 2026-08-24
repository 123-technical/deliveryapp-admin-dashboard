import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  DashboardOutlined,
  TeamOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  BellOutlined,
  SettingOutlined,
  CustomerServiceOutlined,
  UserSwitchOutlined,
  TagsOutlined,
  LogoutOutlined,
  DownOutlined,
  CrownOutlined,
  ShoppingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  EnvironmentOutlined,
  ShopOutlined,
} from "@ant-design/icons";
import { Button, Avatar, Space, Dropdown, Layout, type MenuProps } from "antd";
import { useAuth } from "../contexts/AuthContext";

const { Header, Sider, Content } = Layout;

type AdminLayoutProps = {
  children: React.ReactNode;
};

const NAV_ITEMS = [
  { key: "/overview", icon: <DashboardOutlined />, label: "Overview" },
  { key: "/orders", icon: <ShoppingCartOutlined />, label: "Orders" },
  { key: "/carts", icon: <ShoppingOutlined />, label: "Carts" },
  { key: "/products", icon: <AppstoreOutlined />, label: "Products" },
  { key: "/categories", icon: <TagsOutlined />, label: "Categories" },
  { key: "/brands", icon: <CrownOutlined />, label: "Brands" },
  { key: "/customers", icon: <TeamOutlined />, label: "Customers" },
  { key: "/riders", icon: <UserSwitchOutlined />, label: "Riders" },
  { key: "/users", icon: <UserOutlined />, label: "Staffs", superAdminOnly: true },
  { key: "/warehouses", icon: <ShopOutlined />, label: "Warehouses" },
  { key: "/delivery-zones", icon: <EnvironmentOutlined />, label: "Delivery Zones", superAdminOnly: true },
  { key: "/reports", icon: <BarChartOutlined />, label: "Reports" },
  { key: "/notifications", icon: <BellOutlined />, label: "Notifications" },
  { key: "/settings", icon: <SettingOutlined />, label: "Settings" },
  { key: "/support", icon: <CustomerServiceOutlined />, label: "Support" },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  const userMenuItems: MenuProps["items"] = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Profile",
      onClick: () => navigate("/profile"),
    },
    { type: "divider" },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Logout",
      onClick: handleLogout,
      danger: true,
    },
  ];

  return (
    <Layout style={{ height: "100dvh", overflow: "hidden" }}>
      {/* ── Custom Sidebar ── */}
      <Sider
        collapsed={collapsed}
        collapsible
        trigger={null}
        width={220}
        collapsedWidth={64}
        style={{
          background: "#0F172A",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          {/* Logo */}
          <div
            style={{
              padding: collapsed ? "20px 0" : "20px 16px",
              fontSize: 14,
              fontWeight: 700,
              color: "#fff",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              flexShrink: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textAlign: collapsed ? "center" : "left",
              display: "flex",
              alignItems: "center",
              gap: 10,
              minHeight: 64,
            }}
          >
            <span
              style={{
                width: 32,
                height: 32,
                background: "#10B981",
                borderRadius: 8,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              🛒
            </span>
            {!collapsed && <span>Beeyo Admin</span>}
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "8px 0" }}>
            {NAV_ITEMS.filter((item) => !item.superAdminOnly || user?.role === "SUPER_ADMIN").map((item) => {
              const isActive = location.pathname === item.key || location.pathname.startsWith(item.key + "/");
              return (
                <div
                  key={item.key}
                  onClick={() => navigate(item.key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: collapsed ? "10px 0" : "10px 16px",
                    justifyContent: collapsed ? "center" : "flex-start",
                    color: isActive ? "#fff" : "#94A3B8",
                    background: isActive ? "#1E293B" : "transparent",
                    borderLeft: `3px solid ${isActive ? "#10B981" : "transparent"}`,
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: isActive ? 600 : 400,
                    transition: "background 150ms ease, color 150ms ease",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    userSelect: "none",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLDivElement).style.background = "rgba(30,41,59,0.6)";
                      (e.currentTarget as HTMLDivElement).style.color = "#fff";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLDivElement).style.background = "transparent";
                      (e.currentTarget as HTMLDivElement).style.color = "#94A3B8";
                    }
                  }}
                >
                  <span style={{ fontSize: 16, display: "flex", alignItems: "center", flexShrink: 0 }}>
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                      {item.label}
                    </span>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </Sider>

      {/* ── Main Area ── */}
      <Layout style={{ minHeight: 0 }}>
        {/* Header */}
        <Header
          style={{
            background: "#fff",
            padding: "0 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 0 #E2E8F0",
            height: 56,
            flexShrink: 0,
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 18, color: "#64748B", padding: "4px 8px" }}
          />

          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
            <Button
              type="text"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                height: "auto",
                padding: "6px 10px",
                borderRadius: 8,
              }}
            >
              <Avatar
                size={30}
                style={{ background: "#0F172A", fontSize: 12 }}
              >
                {user?.username?.charAt(0).toUpperCase() || "A"}
              </Avatar>
              <Space size={4}>
                <span style={{ fontSize: 14, fontWeight: 500, color: "#0F172A" }}>
                  {user?.username || "Admin"}
                </span>
                <DownOutlined style={{ fontSize: 11, color: "#64748B" }} />
              </Space>
            </Button>
          </Dropdown>
        </Header>

        {/* Content */}
        <Content style={{ overflow: "auto", background: "#F8FAFC" }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
