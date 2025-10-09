import { useState } from "react";
import { Form, Input, Button, Card, Typography, Space, App } from "antd";
import { UserOutlined, LockOutlined, LoginOutlined } from "@ant-design/icons";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { message } = App.useApp();

  const handleLogin = async (values: LoginFormValues) => {
    try {
      setLoading(true);
      await login(values);
      message.success("Login successful!");
      navigate("/overview");
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #1890ff 0%, #40a9ff 50%, #69c0ff 100%)",
        padding: "20px",
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: 400,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          borderRadius: "8px",
          backgroundColor: "#f2f2f2",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <Space direction="vertical" size="small">
            <div
              style={{
                width: "64px",
                height: "64px",
                background: "#1890ff",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <LoginOutlined style={{ fontSize: "24px", color: "white" }} />
            </div>
            <Title level={2} style={{ margin: 0, color: "#262626" }}>
              123 Online Admin
            </Title>
            <Text type="secondary">Sign in to access the admin dashboard</Text>
          </Space>
        </div>

        <Form
          name="login"
          onFinish={handleLogin}
          autoComplete="off"
          size="large"
        >
          {/* <Form.Item
            name="mobile"
            rules={[
              { required: true, message: "Please enter your Mobile Nummber!" },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Mobile Number"
              style={{ borderRadius: "6px" }}
            />
          </Form.Item> */}

          <Form.Item
            name="username"
            rules={[{ required: true, message: "Please enter your username!" }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Username"
              style={{ borderRadius: "6px" }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: "Please input your password!" }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              style={{ borderRadius: "6px" }}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{
                height: "48px",
                borderRadius: "6px",
                fontSize: "16px",
                fontWeight: "600",
              }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </Form.Item>
        </Form>

        {/* <div style={{ textAlign: "center", marginTop: "24px" }}>
          <Text type="secondary" style={{ fontSize: "12px" }}>
            Super Admin Access Only
          </Text>
        </div> */}
      </Card>
    </div>
  );
}
