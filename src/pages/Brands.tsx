import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Popconfirm,
  App,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { brandService } from "../services/brands";
import { uploadService } from "../services/upload";
import { useAuth } from "../contexts/AuthContext";
import type { Brand, CreateBrandDto, UpdateBrandDto } from "../types/brand";
import AntdImageUpload from "../components/AntdImageUpload";
import StatusBadge from "../components/StatusBadge";
import CopyableId from "../components/CopyableId";
import TableImage from "../components/TableImage";

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
  const { message } = App.useApp();

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  useEffect(() => { fetchBrands(); }, []);

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const response = await brandService.getBrands({ page: 1, pageSize: 100 });
      setBrands(response.data);
    } catch {
      message.error("Failed to fetch brands");
    } finally {
      setLoading(false);
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      let finalLogoUrl = values.logoUrl;
      if (finalLogoUrl instanceof File) finalLogoUrl = await uploadService.uploadFile(finalLogoUrl);
      const brandData: CreateBrandDto = {
        name: values.name,
        logoUrl: finalLogoUrl || undefined,
        description: values.description || undefined,
      };
      await brandService.createBrand(brandData);
      message.success("Brand created successfully");
      setIsModalVisible(false);
      form.resetFields();
      fetchBrands();
    } catch {
      message.error("Failed to create brand");
    }
  };

  const handleEditModalOk = async () => {
    try {
      const values = await editForm.validateFields();
      if (editingBrand) {
        let finalLogoUrl = values.logoUrl;
        if (finalLogoUrl instanceof File) finalLogoUrl = await uploadService.uploadFile(finalLogoUrl);
        const brandData: UpdateBrandDto = {
          name: values.name,
          logoUrl: finalLogoUrl || undefined,
          description: values.description || undefined,
        };
        await brandService.updateBrand(editingBrand.id, brandData);
        message.success("Brand updated successfully");
        setIsEditModalVisible(false);
        editForm.resetFields();
        setEditingBrand(null);
        fetchBrands();
      }
    } catch {
      message.error("Failed to update brand");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await brandService.deleteBrand(id);
      message.success("Brand deleted successfully");
      fetchBrands();
    } catch {
      message.error("Failed to delete brand");
    }
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 110,
      render: (id: string) => <CopyableId id={id} />,
    },
    {
      title: "Logo",
      dataIndex: "logoUrl",
      key: "logoUrl",
      width: 60,
      render: (logoUrl: string | null, record: Brand) => (
        <TableImage src={logoUrl} alt={record.name} />
      ),
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name: string, record: Brand) => (
        <button
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            color: "#0F172A",
            fontWeight: 500,
            fontSize: 13,
            textAlign: "left",
          }}
          onClick={() => navigate(`/brand/${record.id}`)}
        >
          {name}
        </button>
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (description: string | null) => (
        <span style={{ fontSize: 13, color: "#64748B" }}>{description || "—"}</span>
      ),
    },
    {
      title: "Status",
      key: "status",
      width: 100,
      render: (_: unknown, record: Brand) => (
        <StatusBadge status={record.deletedAt ? "Deleted" : "ACTIVE"} />
      ),
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
      render: (date: string) => (
        <span style={{ fontSize: 12, color: "#64748B" }}>
          {new Date(date).toLocaleDateString()}
        </span>
      ),
      sorter: (a: Brand, b: Brand) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      fixed: "right" as const,
      render: (_: unknown, record: Brand) => (
        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
          {isAdmin && (
            <>
              <Button
                className="ds-action-btn edit"
                icon={<EditOutlined style={{ fontSize: 14 }} />}
                onClick={() => {
                  setEditingBrand(record);
                  editForm.setFieldsValue({
                    name: record.name,
                    logoUrl: record.logoUrl,
                    description: record.description,
                  });
                  setIsEditModalVisible(true);
                }}
                disabled={!!record.deletedAt}
                title="Edit"
              />
              <Popconfirm
                title="Delete Brand"
                description="Are you sure you want to delete this brand?"
                onConfirm={() => handleDelete(record.id)}
                okText="Delete"
                cancelText="Cancel"
                okType="danger"
                disabled={!!record.deletedAt}
              >
                <Button
                  className="ds-action-btn delete"
                  icon={<DeleteOutlined style={{ fontSize: 14 }} />}
                  disabled={!!record.deletedAt}
                  title="Delete"
                />
              </Popconfirm>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <div className="ds-page-header">
        <h1 className="ds-page-title">Brands</h1>
        {isAdmin && (
          <Button
            icon={<PlusOutlined />}
            className="ds-btn-primary"
            onClick={() => { form.resetFields(); setIsModalVisible(true); }}
          >
            Add Brand
          </Button>
        )}
      </div>

      <div className="ds-table-wrapper">
        <Table
          columns={columns}
          dataSource={brands}
          rowKey="id"
          loading={loading}
          scroll={{ x: 800 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} brands`,
          }}
          locale={{
            emptyText: (
              <div className="ds-empty">
                <div className="ds-empty-icon">🏷️</div>
                <div className="ds-empty-text">No brands found</div>
              </div>
            ),
          }}
        />
      </div>

      {/* Add Brand Modal */}
      {isAdmin && (
        <Modal
          title="Add New Brand"
          open={isModalVisible}
          onOk={handleModalOk}
          onCancel={() => { setIsModalVisible(false); form.resetFields(); }}
          okText="Create"
          cancelText="Cancel"
          okButtonProps={{ style: { background: "#0F172A", borderColor: "#0F172A" } }}
        >
          <Form form={form} layout="vertical" name="addBrandForm">
            <Form.Item name="name" label="Brand Name" rules={[{ required: true }]}>
              <Input placeholder="Enter brand name" />
            </Form.Item>
            <Form.Item name="description" label="Description">
              <Input.TextArea placeholder="Enter brand description" rows={3} />
            </Form.Item>
            <Form.Item name="logoUrl" label="Logo">
              <AntdImageUpload />
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
          onCancel={() => { setIsEditModalVisible(false); editForm.resetFields(); setEditingBrand(null); }}
          okText="Update"
          cancelText="Cancel"
          okButtonProps={{ style: { background: "#0F172A", borderColor: "#0F172A" } }}
        >
          <Form form={editForm} layout="vertical" name="editBrandForm">
            <Form.Item name="name" label="Brand Name" rules={[{ required: true }]}>
              <Input placeholder="Enter brand name" />
            </Form.Item>
            <Form.Item name="description" label="Description">
              <Input.TextArea placeholder="Enter brand description" rows={3} />
            </Form.Item>
            <Form.Item name="logoUrl" label="Logo">
              <AntdImageUpload />
            </Form.Item>
          </Form>
        </Modal>
      )}
    </div>
  );
};

export default Brands;
