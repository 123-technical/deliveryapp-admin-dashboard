import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  Descriptions,
  Button,
  Spin,
  message,
  Space,
  Typography,
  Image,
  Form,
  Modal,
  Input,
  Popconfirm,
} from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { brandService } from "../services/brands";
import { useAuth } from "../contexts/AuthContext";
import type { Brand } from "../types/brand";

const { Title } = Typography;

const BrandDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editForm] = Form.useForm();

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const fetchBrandById = useCallback(
    async (brandId: string) => {
      setLoading(true);
      try {
        const brandData = await brandService.getBrandById(brandId);
        setBrand(brandData);
      } catch (error) {
        console.error("Failed to fetch brand:", error);
        message.error("Failed to fetch brand details");
        navigate("/brands");
      } finally {
        setLoading(false);
      }
    },
    [navigate]
  );

  useEffect(() => {
    if (id) {
      fetchBrandById(id);
    }
  }, [id, fetchBrandById]);

  const handleEdit = () => {
    if (brand) {
      editForm.setFieldsValue({
        name: brand.name,
        description: brand.description,
        logoUrl: brand.logoUrl,
      });
      setIsEditModalVisible(true);
    }
  };

  const handleEditModalOk = async () => {
    try {
      const values = await editForm.validateFields();
      if (brand) {
        const updatedBrand = await brandService.updateBrand(brand.id, values);
        setBrand(updatedBrand);
        message.success("Brand updated successfully");
        setIsEditModalVisible(false);
        editForm.resetFields();
      }
    } catch (error) {
      console.error("Failed to update brand:", error);
      message.error("Failed to update brand");
    }
  };

  const handleEditModalCancel = () => {
    setIsEditModalVisible(false);
    editForm.resetFields();
  };

  const handleDelete = async () => {
    if (brand) {
      try {
        await brandService.deleteBrand(brand.id);
        message.success("Brand deleted successfully");
        navigate("/brands");
      } catch (error) {
        console.error("Failed to delete brand:", error);
        message.error("Failed to delete brand");
      }
    }
  };

  const handleBack = () => {
    navigate("/brands");
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (!brand) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Title level={3}>Brand not found</Title>
        <Button type="primary" onClick={handleBack}>
          Back to Brands
        </Button>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: "24px" }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={handleBack}
          style={{ marginBottom: "16px" }}
        >
          Back to Brands
        </Button>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Title level={2} style={{ margin: 0 }}>
            {brand.name}
          </Title>

          {isAdmin && (
            <Space>
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={handleEdit}
              >
                Edit Brand
              </Button>
              <Popconfirm
                title="Delete Brand"
                description="Are you sure you want to delete this brand? This action cannot be undone."
                onConfirm={handleDelete}
                okText="Yes, Delete"
                cancelText="Cancel"
                okType="danger"
              >
                <Button danger icon={<DeleteOutlined />}>
                  Delete Brand
                </Button>
              </Popconfirm>
            </Space>
          )}
        </div>
      </div>

      <Card>
        <Descriptions title="Brand Details" bordered column={2}>
          <Descriptions.Item label="ID" span={1}>
            {brand.id}
          </Descriptions.Item>
          <Descriptions.Item label="Name" span={1}>
            {brand.name}
          </Descriptions.Item>
          <Descriptions.Item label="Description" span={2}>
            {brand.description || "No description provided"}
          </Descriptions.Item>
          <Descriptions.Item label="Logo" span={2}>
            {brand.logoUrl ? (
              <Image
                src={brand.logoUrl}
                alt={brand.name}
                style={{ maxWidth: "200px", maxHeight: "200px" }}
                fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYxN"
              />
            ) : (
              "No logo provided"
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Created At" span={1}>
            {new Date(brand.createdAt).toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label="Updated At" span={1}>
            {new Date(brand.updatedAt).toLocaleString()}
          </Descriptions.Item>
          {brand.deletedAt && (
            <Descriptions.Item label="Deleted At" span={2}>
              {new Date(brand.deletedAt).toLocaleString()}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {isAdmin && (
        <Modal
          title="Edit Brand"
          open={isEditModalVisible}
          onOk={handleEditModalOk}
          onCancel={handleEditModalCancel}
          okText="Update"
          cancelText="Cancel"
        >
          <Form form={editForm} layout="vertical" name="editBrandForm">
            <Form.Item
              name="name"
              label="Brand Name"
              rules={[
                { required: true, message: "Please enter brand name!" },
                {
                  min: 2,
                  message: "Brand name must be at least 2 characters!",
                },
              ]}
            >
              <Input placeholder="Enter brand name" />
            </Form.Item>
            <Form.Item
              name="description"
              label="Description"
              rules={[
                {
                  max: 500,
                  message: "Description must be less than 500 characters!",
                },
              ]}
            >
              <Input.TextArea placeholder="Enter brand description" rows={3} />
            </Form.Item>
            <Form.Item
              name="logoUrl"
              label="Logo URL"
              rules={[
                { type: "url", message: "Please enter a valid logo URL!" },
              ]}
            >
              <Input placeholder="Enter logo URL (optional)" />
            </Form.Item>
          </Form>
        </Modal>
      )}
    </div>
  );
};

export default BrandDetail;
