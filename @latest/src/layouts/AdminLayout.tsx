import {
  Layout,
  Menu,
  Typography,
  Button,
  Dropdown,
  Avatar,
  Space,
  type MenuProps,
} from "antd";
import { useMemo, useState } from "react";
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
} from "@ant-design/icons";
import { useAuth } from "../contexts/AuthContext";

const { Header, Sider, Content } = Layout;

type AdminLayoutProps = {
  children: React.ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const items = useMemo(
    () => [
      { key: "/overview", icon: <DashboardOutlined />, label: "Overview" },
      { key: "/orders", icon: <ShoppingCartOutlined />, label: "Orders" },
      { key: "/products", icon: <AppstoreOutlined />, label: "Products" },
      { key: "/categories", icon: <TagsOutlined />, label: "Categories" },
      { key: "/customers", icon: <TeamOutlined />, label: "Customers" },
      { key: "/riders", icon: <UserSwitchOutlined />, label: "Riders" },
      { key: "/staffs", icon: <UserOutlined />, label: "Staffs" },
      { key: "/reports", icon: <BarChartOutlined />, label: "Reports" },
      { key: "/notifications", icon: <BellOutlined />, label: "Notifications" },
      { key: "/settings", icon: <SettingOutlined />, label: "Settings" },
      { key: "/support", icon: <CustomerServiceOutlined />, label: "Support" },
    ],
    []
  );

  const handleMenuClick: MenuProps["onClick"] = (e) => {
    navigate(e.key);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const userMenuItems: MenuProps["items"] = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Profile",
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Logout",
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ height: "100dvh", overflow: "hidden" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
      >
        <div
          style={{
            height: 64,
            margin: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: 700,
          }}
        >
          123 Online Admin
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={items}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout style={{ minHeight: 0 }}>
        <Header
          style={{
            background: "#fff",
            padding: "0 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <Typography.Title level={4} style={{ margin: 0 }}>
            123 Online Admin
          </Typography.Title>

          <Dropdown
            menu={{ items: userMenuItems }}
            placement="bottomRight"
            arrow
          >
            <Button
              type="text"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                height: "auto",
                padding: "8px 12px",
              }}
            >
              <Avatar
                size="small"
                style={{
                  backgroundColor: "#1890ff",
                }}
              >
                {user?.username?.charAt(0).toUpperCase() || "A"}
              </Avatar>
              <Space size={4}>
                <span>{user?.username || "Admin"}</span>
                <DownOutlined style={{ fontSize: "12px" }} />
              </Space>
            </Button>
          </Dropdown>
        </Header>
        <Content style={{ margin: 16, overflow: "auto" }}>
          <div style={{ padding: 16, background: "#fff", minHeight: "100%" }}>
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
