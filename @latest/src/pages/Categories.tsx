import { useState, useEffect } from "react";
import { Button, Table, Popconfirm, message, Space } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";

interface Category {
  id: number;
  name: string;
  description: string;
  createdAt: string;
  productCount: number;
}

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  // Mock data for demonstration
  const mockCategories: Category[] = [
    {
      id: 1,
      name: "Electronics",
      description: "Electronic devices and accessories",
      createdAt: "2024-01-15",
      productCount: 25,
    },
    {
      id: 2,
      name: "Clothing",
      description: "Apparel and fashion items",
      createdAt: "2024-01-10",
      productCount: 18,
    },
    {
      id: 3,
      name: "Books",
      description: "Books and educational materials",
      createdAt: "2024-01-05",
      productCount: 32,
    },
    {
      id: 4,
      name: "Home & Garden",
      description: "Home improvement and garden supplies",
      createdAt: "2024-01-12",
      productCount: 14,
    },
    {
      id: 5,
      name: "Sports",
      description: "Sports equipment and accessories",
      createdAt: "2024-01-08",
      productCount: 21,
    },
  ];

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      // Simulate API call
      setTimeout(() => {
        setCategories(mockCategories);
        setLoading(false);
      }, 500);
    } catch (error) {
      message.error("Failed to fetch categories");
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      // Simulate API call
      setTimeout(() => {
        setCategories(categories.filter((cat) => cat.id !== id));
        message.success("Category deleted successfully");
      }, 200);
    } catch (error) {
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
      title: "Description",
      dataIndex: "description",
      key: "description",
    },
    {
      title: "Products",
      dataIndex: "productCount",
      key: "productCount",
      width: 100,
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_: any, record: Category) => (
        <Space size="small">
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
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => message.info("Add category functionality coming soon")}
        >
          Add Category
        </Button>
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
    </div>
  );
};

export default Categories;
