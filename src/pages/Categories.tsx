import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Table,
  Popconfirm,
  message,
  Space,
  Form,
  Modal,
  Input,
  Card,
  Image,
  Typography,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { categoryService } from "../services/categories";
import { useAuth } from "../contexts/AuthContext";
import type { Category } from "../types/category";

const { Title } = Typography;

const Categories = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  // Check if user has admin privileges
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await categoryService.getEnabledCategories();
      setCategories(data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      message.error("Failed to fetch categories");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = () => {
    setIsModalVisible(true);
    form.resetFields();
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      await categoryService.createCategory(values);
      message.success("Category created successfully");
      setIsModalVisible(false);
      form.resetFields();
      fetchCategories();
    } catch (error) {
      console.error("Failed to create category:", error);
      message.error("Failed to create category");
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleDelete = async (id: string) => {
    try {
      await categoryService.deleteCategory(id);
      message.success("Category deleted successfully");
      fetchCategories();
    } catch (error) {
      console.error("Failed to delete category:", error);
      message.error("Failed to delete category");
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    editForm.setFieldsValue({
      name: category.name,
      slug: category.slug,
      description: category.description,
      imageUrl: category.imageUrl,
      parentId: category.parentId,
    });
    setIsEditModalVisible(true);
  };

  const handleEditModalOk = async () => {
    try {
      const values = await editForm.validateFields();
      if (editingCategory) {
        await categoryService.updateCategory(editingCategory.id, values);
        message.success("Category updated successfully");
        setIsEditModalVisible(false);
        setEditingCategory(null);
        editForm.resetFields();
        fetchCategories();
      }
    } catch (error) {
      console.error("Failed to update category:", error);
      message.error("Failed to update category");
    }
  };

  const handleEditModalCancel = () => {
    setIsEditModalVisible(false);
    setEditingCategory(null);
    editForm.resetFields();
  };

  const handleViewDetails = (category: Category) => {
    navigate(`/category/${category.slug}`);
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 100,
      render: (id: string) => (
        <Typography.Text
          copyable={{ text: id }}
          style={{ fontFamily: "monospace", fontSize: "12px" }}
        >
          {id.substring(0, 8)}...
        </Typography.Text>
      ),
    },
    {
      title: "Image",
      dataIndex: "imageUrl",
      key: "imageUrl",
      width: 80,
      render: (imageUrl: string | undefined) =>
        imageUrl ? (
          <Image
            width={40}
            height={40}
            src={imageUrl}
            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYxN"
            style={{ borderRadius: 4 }}
          />
        ) : (
          "-"
        ),
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      sorter: (a: Category, b: Category) => a.name.localeCompare(b.name),
      render: (name: string, record: Category) => (
        <Button
          type="link"
          onClick={() => handleViewDetails(record)}
          style={{ padding: 0, height: "auto" }}
        >
          {name}
        </Button>
      ),
    },
    {
      title: "Slug",
      dataIndex: "slug",
      key: "slug",
      sorter: (a: Category, b: Category) => a.slug.localeCompare(b.slug),
      render: (slug: string) => (
        <Typography.Text code style={{ fontSize: "12px" }}>
          {slug}
        </Typography.Text>
      ),
    },
    {
      title: "Parent ID",
      dataIndex: "parentId",
      key: "parentId",
      width: 100,
      render: (parentId: string | undefined) =>
        parentId ? (
          <Typography.Text
            copyable={{ text: parentId }}
            style={{ fontFamily: "monospace", fontSize: "12px" }}
          >
            {parentId.substring(0, 8)}...
          </Typography.Text>
        ) : (
          <Typography.Text type="secondary">-</Typography.Text>
        ),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (description: string | undefined) => description || "-",
    },
    {
      title: "Status",
      key: "status",
      width: 100,
      render: (_: unknown, record: Category) => (
        <Typography.Text
          type={record.deletedAt ? "danger" : "success"}
          style={{ fontWeight: 500 }}
        >
          {record.deletedAt ? "Deleted" : "Active"}
        </Typography.Text>
      ),
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 150,
      render: (date: string) => new Date(date).toLocaleString(),
      sorter: (a: Category, b: Category) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: "Updated At",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 150,
      render: (date: string) => new Date(date).toLocaleString(),
      sorter: (a: Category, b: Category) =>
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
    },
    {
      title: "Deleted At",
      dataIndex: "deletedAt",
      key: "deletedAt",
      width: 150,
      render: (date: string | undefined) =>
        date ? new Date(date).toLocaleString() : "-",
      sorter: (a: Category, b: Category) => {
        if (!a.deletedAt && !b.deletedAt) return 0;
        if (!a.deletedAt) return 1;
        if (!b.deletedAt) return -1;
        return (
          new Date(a.deletedAt).getTime() - new Date(b.deletedAt).getTime()
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 150,
      fixed: "right" as const,
      render: (_: unknown, record: Category) => (
        <Space size="small">
          {isAdmin && (
            <>
              <Button
                type="primary"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
                disabled={!!record.deletedAt}
              >
                Edit
              </Button>
              <Popconfirm
                title="Delete Category"
                description="Are you sure you want to delete this category?"
                onConfirm={() => handleDelete(record.id)}
                okText="Yes"
                cancelText="No"
                okType="danger"
                disabled={!!record.deletedAt}
              >
                <Button
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  disabled={!!record.deletedAt}
                >
                  Delete
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <div
        style={{
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Title level={2} style={{ margin: 0 }}>
          Categories Management
        </Title>
        {isAdmin && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddCategory}
          >
            Add Category
          </Button>
        )}
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={categories}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1400 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} categories`,
          }}
        />
      </Card>

      {isAdmin && (
        <Modal
          title="Add New Category"
          open={isModalVisible}
          onOk={handleModalOk}
          onCancel={handleModalCancel}
          okText="Create"
          cancelText="Cancel"
        >
          <Form form={form} layout="vertical" name="categoryForm">
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

export default Categories;
