import { useState, useEffect } from "react";
import {
  Button,
  Table,
  Popconfirm,
  message,
  Space,
  Form,
  Modal,
  Input,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { categoryService } from "../services/categories";
import { useAuth } from "../contexts/AuthContext";
import type { Category } from "../types/category";

const Categories = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Check if user has admin privileges
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await categoryService.getEnabledCategories();
      console.log("Categories data:", data);
      console.log("First category:", data[0]);
      console.log("First category keys:", Object.keys(data[0]));
      console.log("First category description:", data[0]?.description);
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

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Slug",
      dataIndex: "slug",
      key: "slug",
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (description: string) => description || "-",
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_: unknown, record: Category) => (
        <Space size="small">
          {isAdmin && (
            <>
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => message.info("Edit functionality coming soon")}
              />
              <Popconfirm
                title="Delete Category"
                description="Are you sure you want to delete this category?"
                onConfirm={() => handleDelete(record.id)}
                okText="Yes"
                cancelText="No"
              >
                <Button type="text" icon={<DeleteOutlined />} danger />
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0 }}>Categories</h2>
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

      <Table
        columns={columns}
        dataSource={categories}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} of ${total} categories`,
        }}
      />

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
    </div>
  );
};

export default Categories;
