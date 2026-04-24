import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Form, Input, Button, Space, Typography, message } from "antd";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import { createUser } from "../services/customers";
import type { CreateUserDto } from "../types/customer";

const { Title } = Typography;

export default function CustomerAdd() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: CreateUserDto) => {
    setLoading(true);
    try {
      await createUser(values);
      message.success("User created successfully");
      navigate("/customers");
    } catch (error: any) {
      console.error("Failed to create user:", error);
      message.error(error.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: "24px" }}>
        <Space style={{ marginBottom: 16 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/customers")}
          >
            Back
          </Button>
        </Space>
        <Title level={2} style={{ margin: 0 }}>
          Create New User
        </Title>
      </div>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Form.Item
            name="username"
            label="Username"
            rules={[
              { required: true, message: "Please enter username!" },
              { min: 3, message: "Username must be at least 3 characters!" },
            ]}
          >
            <Input placeholder="Enter username" />
          </Form.Item>

          <Form.Item
            name="mobile"
            label="Mobile"
            rules={[
              { required: true, message: "Please enter mobile number!" },
              {
                pattern: /^[0-9]+$/,
                message: "Mobile must contain only numbers!",
              },
              { min: 10, message: "Mobile must be at least 10 digits!" },
            ]}
          >
            <Input placeholder="Enter mobile number" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: "Please enter password!" },
              { min: 6, message: "Password must be at least 6 characters!" },
            ]}
          >
            <Input.Password placeholder="Enter password" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[{ type: "email", message: "Please enter a valid email!" }]}
          >
            <Input placeholder="Enter email (optional)" />
          </Form.Item>

          <Form.Item
            name="name"
            label="Name"
            rules={[{ min: 2, message: "Name must be at least 2 characters!" }]}
          >
            <Input placeholder="Enter name (optional)" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={loading}
              >
                Create User
              </Button>
              <Button onClick={() => navigate("/customers")}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
