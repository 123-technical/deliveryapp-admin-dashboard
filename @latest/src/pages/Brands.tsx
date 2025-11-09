import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Image,
  Typography,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { brandService } from "../services/brands";
import { useAuth } from "../contexts/AuthContext";
import type { Brand, CreateBrandDto, UpdateBrandDto } from "../types/brand";

const { Title } = Typography;

const Brands = () => {
  const navigate = useNavigate();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const { user } = useAuth();

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const response = await brandService.getBrands({
        page: 1,
        pageSize: 100,
      });
      setBrands(response.data);
    } catch (error) {
      console.error("Failed to fetch brands:", error);
      message.error("Failed to fetch brands");
    } finally {
      setLoading(false);
    }
  };

  const handleAddBrand = () => {
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const brandData: CreateBrandDto = {
        name: values.name,
        logoUrl: values.logoUrl || undefined,
        description: values.description || undefined,
      };

      await brandService.createBrand(brandData);
      message.success("Brand created successfully");
      setIsModalVisible(false);
      form.resetFields();
      fetchBrands();
    } catch (error) {
      console.error("Failed to create brand:", error);
      message.error("Failed to create brand");
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    editForm.setFieldsValue({
      name: brand.name,
      logoUrl: brand.logoUrl,
      description: brand.description,
    });
    setIsEditModalVisible(true);
  };

  const handleEditModalOk = async () => {
    try {
      const values = await editForm.validateFields();
      if (editingBrand) {
        const brandData: UpdateBrandDto = {
          name: values.name,
          logoUrl: values.logoUrl || undefined,
          description: values.description || undefined,
        };

        await brandService.updateBrand(editingBrand.id, brandData);
        message.success("Brand updated successfully");
        setIsEditModalVisible(false);
        editForm.resetFields();
        setEditingBrand(null);
        fetchBrands();
      }
    } catch (error) {
      console.error("Failed to update brand:", error);
      message.error("Failed to update brand");
    }
  };

  const handleEditModalCancel = () => {
    setIsEditModalVisible(false);
    editForm.resetFields();
    setEditingBrand(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await brandService.deleteBrand(id);
      message.success("Brand deleted successfully");
      fetchBrands();
    } catch (error) {
      console.error("Failed to delete brand:", error);
      message.error("Failed to delete brand");
    }
  };

  const handleViewDetails = (brand: Brand) => {
    navigate(`/brand/${brand.id}`);
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
      title: "Logo",
      dataIndex: "logoUrl",
      key: "logoUrl",
      width: 80,
      render: (logoUrl: string | null) => (
        <Image
          width={40}
          height={40}
          src={logoUrl || ""}
          fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYxN"
          style={{ borderRadius: 4 }}
        />
      ),
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      sorter: (a: Brand, b: Brand) => a.name.localeCompare(b.name),
      render: (name: string, record: Brand) => (
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
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (description: string | null) => description || "-",
    },
    {
      title: "Status",
      key: "status",
      width: 100,
      render: (_: unknown, record: Brand) => (
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
      sorter: (a: Brand, b: Brand) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: "Updated At",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 150,
      render: (date: string) => new Date(date).toLocaleString(),
      sorter: (a: Brand, b: Brand) =>
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
    },
    {
      title: "Deleted At",
      dataIndex: "deletedAt",
      key: "deletedAt",
      width: 150,
      render: (date: string | null) =>
        date ? new Date(date).toLocaleString() : "-",
      sorter: (a: Brand, b: Brand) => {
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
      render: (_: unknown, record: Brand) => (
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
                title="Delete Brand"
                description="Are you sure you want to delete this brand?"
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
          Brands Management
        </Title>
        {isAdmin && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddBrand}
          >
            Add Brand
          </Button>
        )}
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={brands}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} brands`,
          }}
        />
      </Card>

      {/* Add Brand Modal */}
      {isAdmin && (
        <Modal
          title="Add New Brand"
          open={isModalVisible}
          onOk={handleModalOk}
          onCancel={handleModalCancel}
          okText="Create"
          cancelText="Cancel"
        >
          <Form form={form} layout="vertical" name="addBrandForm">
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

      {/* Edit Brand Modal */}
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

export default Brands;
