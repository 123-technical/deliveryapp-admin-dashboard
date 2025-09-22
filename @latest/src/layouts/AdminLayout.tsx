import { Layout, Menu, Typography, type MenuProps } from "antd";
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
} from "@ant-design/icons";

const { Header, Sider, Content } = Layout;

type AdminLayoutProps = {
  children: React.ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const items = useMemo(
    () => [
      { key: "/overview", icon: <DashboardOutlined />, label: "Overview" },
      { key: "/orders", icon: <ShoppingCartOutlined />, label: "Orders" },
      { key: "/products", icon: <AppstoreOutlined />, label: "Products" },
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
          }}
        >
          <Typography.Title level={4} style={{ margin: 0 }}>
            123 Online Admin
          </Typography.Title>
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
