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
import { categoryService } from "../services/categories";
import { useAuth } from "../contexts/AuthContext";
import type { Category } from "../types/category";

const { Title } = Typography;

const CategoryDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editForm] = Form.useForm();

  // Check if user has admin privileges
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const fetchCategoryBySlug = useCallback(
    async (categorySlug: string) => {
      setLoading(true);
      try {
        // First get all categories to find the one with matching slug
        const categories = await categoryService.getEnabledCategories();
        const foundCategory = categories.find(
          (cat) => cat.slug === categorySlug
        );

        if (!foundCategory) {
          message.error("Category not found");
          navigate("/categories");
          return;
        }

        // Then get full details using the ID
        const fullCategory = await categoryService.getCategoryById(
          foundCategory.id
        );
        setCategory(fullCategory);
      } catch (error) {
        console.error("Failed to fetch category:", error);
        message.error("Failed to fetch category details");
        navigate("/categories");
      } finally {
        setLoading(false);
      }
    },
    [navigate]
  );

  useEffect(() => {
    if (slug) {
      fetchCategoryBySlug(slug);
    }
  }, [slug, fetchCategoryBySlug]);

  const handleEdit = () => {
    if (category) {
      editForm.setFieldsValue({
        name: category.name,
        slug: category.slug,
        description: category.description,
        imageUrl: category.imageUrl,
        parentId: category.parentId,
      });
      setIsEditModalVisible(true);
    }
  };

  const handleEditModalOk = async () => {
    try {
      const values = await editForm.validateFields();
      if (category) {
        const updatedCategory = await categoryService.updateCategory(
          category.id,
          values
        );
        setCategory(updatedCategory);
        message.success("Category updated successfully");
        setIsEditModalVisible(false);
        editForm.resetFields();
      }
    } catch (error) {
      console.error("Failed to update category:", error);
      message.error("Failed to update category");
    }
  };

  const handleEditModalCancel = () => {
    setIsEditModalVisible(false);
    editForm.resetFields();
  };

  const handleDelete = async () => {
    if (category) {
      try {
        await categoryService.deleteCategory(category.id);
        message.success("Category deleted successfully");
        navigate("/categories");
      } catch (error) {
        console.error("Failed to delete category:", error);
        message.error("Failed to delete category");
      }
    }
  };

  const handleBack = () => {
    navigate("/categories");
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

  if (!category) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Title level={3}>Category not found</Title>
        <Button type="primary" onClick={handleBack}>
          Back to Categories
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
          Back to Categories
        </Button>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Title level={2} style={{ margin: 0 }}>
            {category.name}
          </Title>

          {isAdmin && (
            <Space>
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={handleEdit}
              >
                Edit Category
              </Button>
              <Popconfirm
                title="Delete Category"
                description="Are you sure you want to delete this category? This action cannot be undone."
                onConfirm={handleDelete}
                okText="Yes, Delete"
                cancelText="Cancel"
                okType="danger"
              >
                <Button danger icon={<DeleteOutlined />}>
                  Delete Category
                </Button>
              </Popconfirm>
            </Space>
          )}
        </div>
      </div>

      <Card>
        <Descriptions title="Category Details" bordered column={2}>
          <Descriptions.Item label="ID" span={1}>
            {category.id}
          </Descriptions.Item>
          <Descriptions.Item label="Name" span={1}>
            {category.name}
          </Descriptions.Item>
          <Descriptions.Item label="Slug" span={1}>
            {category.slug}
          </Descriptions.Item>
          <Descriptions.Item label="Parent Category" span={1}>
            {category.parentId || "Root Category"}
          </Descriptions.Item>
          <Descriptions.Item label="Description" span={2}>
            {category.description || "No description provided"}
          </Descriptions.Item>
          <Descriptions.Item label="Image" span={2}>
            {category.imageUrl ? (
              <Image
                src={category.imageUrl}
                alt={category.name}
                style={{ maxWidth: "200px", maxHeight: "200px" }}
                fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYxN"
              />
            ) : (
              "No image provided"
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Created At" span={1}>
            {new Date(category.createdAt).toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label="Updated At" span={1}>
            {new Date(category.updatedAt).toLocaleString()}
          </Descriptions.Item>
          {category.deletedAt && (
            <Descriptions.Item label="Deleted At" span={2}>
              {new Date(category.deletedAt).toLocaleString()}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {isAdmin && (
        <Modal
          title="Edit Category"
          open={isEditModalVisible}
          onOk={handleEditModalOk}
          onCancel={handleEditModalCancel}
          okText="Update"
          cancelText="Cancel"
        >
          <Form form={editForm} layout="vertical" name="editCategoryForm">
            <Form.Item
              name="name"
              label="Category Name"
              rules={[
                { required: true, message: "Please enter category name!" },
                {
                  min: 2,
                  message: "Category name must be at least 2 characters!",
                },
              ]}
            >
              <Input placeholder="Enter category name" />
            </Form.Item>
            <Form.Item
              name="slug"
              label="Slug"
              rules={[
                { required: true, message: "Please enter slug!" },
                {
                  pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                  message:
                    "Slug can only contain lowercase letters, numbers, and hyphens!",
                },
              ]}
            >
              <Input placeholder="Enter slug (e.g., electronics)" />
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
              <Input.TextArea
                placeholder="Enter category description"
                rows={3}
              />
            </Form.Item>

            <Form.Item
              name="imageUrl"
              label="Image URL"
              rules={[
                { type: "url", message: "Please enter a valid image URL!" },
              ]}
            >
              <Input placeholder="Enter image URL (optional)" />
            </Form.Item>
          </Form>
        </Modal>
      )}
    </div>
  );
};

export default CategoryDetail;
