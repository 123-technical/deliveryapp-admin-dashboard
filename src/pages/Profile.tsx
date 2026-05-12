import { useEffect, useState } from "react";
import {
  Card,
  Row,
  Col,
  Typography,
  Avatar,
  Descriptions,
  Tag,
  Divider,
  Space,
  Button,
  message,
  Spin,
  Modal,
  Form,
  Input,
} from "antd";
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  EditOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import type { User } from "../types/user";
import { getProfile, updateUser } from "../services/users";

const { Title, Text } = Typography;

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchProfile = async () => {
    try {
      const data = await getProfile();
      setUser(data);
    } catch (error) {
      message.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleEdit = () => {
    if (user) {
      form.setFieldsValue({
        username: user.username,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
      });
      setModalVisible(true);
    }
  };

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      
      // Sanitizing data to avoid backend 400 errors for empty optional fields
      const sanitizedValues = Object.fromEntries(
        Object.entries(values).map(([key, value]) => [key, value === '' ? null : value])
      );

      if (user) {
        await updateUser(user.id, sanitizedValues);
        message.success("Profile updated successfully");
        setModalVisible(false);
        fetchProfile();
      }
    } catch (error) {
      console.error("Submission error:", error);
      message.error("Failed to update profile");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return <div>User not found</div>;
  }


  return (
    <div style={{ padding: "0", background: "#f0f2f5", minHeight: '100%' }}>
      {/* Cinematic Full-Width Header */}
      <div style={{ position: 'relative', marginBottom: '40px' }}>
        <div 
          style={{ 
            height: '180px', 
            background: 'linear-gradient(135deg, #001529 0%, #003a8c 100%)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 40px'
          }} 
        />
        <div style={{ padding: "0 40px", marginTop: "-60px", display: 'flex', alignItems: 'flex-end', gap: '32px' }}>
          <Avatar
            size={160}
            icon={<UserOutlined />}
            style={{
              border: "8px solid #fff",
              backgroundColor: "#f5f5f5",
              color: "#001529",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
            }}
          >
            {user.name?.[0]?.toUpperCase() || user.username[0].toUpperCase()}
          </Avatar>
          <div style={{ flex: 1, paddingBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Title level={1} style={{ margin: 0, fontSize: '42px', fontWeight: 800, color: '#001529' }}>
                {user.name || "Administrator"}
              </Title>
              <Tag 
                style={{ 
                  backgroundColor: '#1677ff', 
                  color: '#fff', 
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 16px',
                  fontWeight: 700,
                  fontSize: '14px',
                  textTransform: 'uppercase'
                }}
              >
                {user.role.replace("_", " ")}
              </Tag>
            </div>
            <Text style={{ fontSize: '20px', color: '#595959', fontWeight: 500 }}>@{user.username}</Text>
          </div>
          <div style={{ paddingBottom: '20px' }}>
            <Space size="middle">
              <Button 
                type="primary" 
                size="large" 
                icon={<EditOutlined />} 
                style={{ borderRadius: '8px', fontWeight: 600, background: '#1677ff' }}
                onClick={handleEdit}
              >
                Edit Profile
              </Button>
            </Space>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 40px 40px 40px" }}>
        <Row gutter={[32, 32]}>
          {/* Column 1: Personal Details */}
          <Col xs={24} xl={8}>
            <Card
              bordered={false}
              title={<Title level={4} style={{ margin: 0, fontWeight: 700 }}>Personal Profile</Title>}
              style={{ borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
            >
              <Space direction="vertical" size={24} style={{ width: '100%' }}>
                <div>
                  <Text type="secondary" style={{ display: 'block', marginBottom: '4px' }}>Full Name</Text>
                  <Text strong style={{ fontSize: '16px', color: '#262626' }}>{user.name || "—"}</Text>
                </div>
                <div>
                  <Text type="secondary" style={{ display: 'block', marginBottom: '4px' }}>Email Address</Text>
                  <Text strong style={{ fontSize: '16px', color: '#262626' }}>{user.email || "—"}</Text>
                </div>
                <div>
                  <Text type="secondary" style={{ display: 'block', marginBottom: '4px' }}>Phone Number</Text>
                  <Text strong style={{ fontSize: '16px', color: '#262626' }}>{user.mobile}</Text>
                </div>
                <div>
                  <Text type="secondary" style={{ display: 'block', marginBottom: '4px' }}>Member Since</Text>
                  <Text strong style={{ fontSize: '16px', color: '#262626' }}>{dayjs(user.createdAt).format("MMMM D, YYYY")}</Text>
                </div>
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text type="secondary">Verification Status</Text>
                  <Tag color="success" style={{ borderRadius: '4px', fontWeight: 600 }}>VERIFIED</Tag>
                </div>
              </Space>
            </Card>
          </Col>

          {/* Column 2: Account Security & Activity */}
          <Col xs={24} xl={8}>
            <Card
              bordered={false}
              title={<Title level={4} style={{ margin: 0, fontWeight: 700 }}>Security & Privacy</Title>}
              style={{ borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
            >
              <Space direction="vertical" size={24} style={{ width: '100%' }}>
                <div style={{ padding: '20px', background: '#fafafa', borderRadius: '12px', border: '1px solid #f0f0f0' }}>
                  <Title level={5} style={{ marginTop: 0 }}>Password Control</Title>
                  <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>Update your password regularly to maintain high account security.</Text>
                  <Button block style={{ borderRadius: '6px', fontWeight: 600 }}>Update Password</Button>
                </div>
                <div style={{ padding: '20px', background: '#f0f5ff', borderRadius: '12px', border: '1px solid #adc6ff' }}>
                  <Title level={5} style={{ marginTop: 0 }}>2FA Authentication</Title>
                  <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>Add an extra layer of security to your account with two-factor authentication.</Text>
                  <Button type="primary" block style={{ borderRadius: '6px', fontWeight: 600, background: '#1677ff' }}>Enable 2FA</Button>
                </div>
              </Space>
            </Card>
          </Col>

          {/* Column 3: System Context & Permissions */}
          <Col xs={24} xl={8}>
            <Space direction="vertical" size={32} style={{ width: '100%' }}>
              <Card
                bordered={false}
                style={{ 
                  borderRadius: "12px", 
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  background: '#001529',
                  color: '#fff'
                }}
              >
                <Title level={4} style={{ color: '#fff', marginBottom: '24px', fontWeight: 700 }}>System Context</Title>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.65)' }}>Session Start</Text>
                    <Text strong style={{ color: '#fff' }}>{dayjs().format("HH:mm:ss")}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.65)' }}>Client IP</Text>
                    <Text strong style={{ color: '#1677ff' }}>144.24.146.130</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.65)' }}>Environment</Text>
                    <Tag color="blue" style={{ margin: 0, fontWeight: 700 }}>PRODUCTION</Tag>
                  </div>
                </div>
              </Card>

              <Card
                bordered={false}
                title={<Title level={4} style={{ margin: 0, fontWeight: 700 }}>Access Permissions</Title>}
                style={{ borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
              >
                <Space wrap size={[12, 12]}>
                  {['Root Access', 'User Audit', 'API Write', 'System Logs', 'Billing Admin', 'Deployment Lead'].map(perm => (
                    <Tag key={perm} style={{ border: 'none', background: '#f5f5f5', color: '#595959', borderRadius: '4px', padding: '6px 14px', fontWeight: 600, fontSize: '13px' }}>
                      {perm}
                    </Tag>
                  ))}
                </Space>
              </Card>
            </Space>
          </Col>
        </Row>
      </div>

      <Modal
        title="Edit Profile"
        open={modalVisible}
        onOk={handleModalSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: "Please enter username" }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Username" disabled />
          </Form.Item>
          <Form.Item
            name="name"
            label="Full Name"
            rules={[{ required: true, message: "Please enter name" }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Full Name" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { type: "email", message: "Please enter a valid email" },
              { required: true, message: "Please enter email" },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="Email" />
          </Form.Item>
          <Form.Item
            name="mobile"
            label="Mobile"
            rules={[{ required: true, message: "Please enter mobile number" }]}
          >
            <Input prefix={<PhoneOutlined />} placeholder="Mobile Number" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
