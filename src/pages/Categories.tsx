import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Table,
  Popconfirm,
  Space,
  Form,
  Modal,
  Input,
  Card,
  Image,
  Typography,
  App,
  Select,
  Tag,
  Spin,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  RightOutlined,
  DownOutlined,
} from "@ant-design/icons";
import { categoryService } from "../services/categories";
import { uploadService } from "../services/upload";
import { useAuth } from "../contexts/AuthContext";
import type { Category, SubCategoriesMap } from "../types/category";
import AntdImageUpload from "../components/AntdImageUpload";

const { Title, Text } = Typography;

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleString();
}

function truncate(s: string | null | undefined, n: number) {
  if (!s) return "-";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

// ─── Component ───────────────────────────────────────────────────────────────

const Categories = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { message } = App.useApp();

  // ── Main categories (top-level) ──
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  // ── Search ──
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // ── Accordion state ──
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [subcategoriesMap, setSubcategoriesMap] = useState<SubCategoriesMap>({});
  const [loadingSubMap, setLoadingSubMap] = useState<Record<string, boolean>>({});

  // ── Add modal ──
  const [isModalVisible, setIsModalVisible] = useState(false);
  // When opened from "+ Add Subcategory", we pre-select this parentId
  const preselectedParentId = useRef<string | null>(null);
  // Track which parentId was pre-selected so we can refresh only that subcategory list
  const addedUnderParentId = useRef<string | null>(null);
  const [form] = Form.useForm();

  // ── Edit modal ──
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editForm] = Form.useForm();

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  // ── Debounce search ──
  useEffect(() => {
    const h = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(h);
  }, [searchInput]);

  const filteredCategories = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase())
  );

  // ── Fetch top-level categories ──
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await categoryService.getEnabledCategories();
      setCategories(data);
    } catch {
      message.error("Failed to fetch categories");
    } finally {
      setLoading(false);
    }
  };

  // ── Accordion expand/collapse ──
  const toggleRow = async (categoryId: string) => {
    const next = new Set(expandedRows);
    if (next.has(categoryId)) {
      next.delete(categoryId);
      setExpandedRows(next);
      return;
    }
    next.add(categoryId);
    setExpandedRows(next);

    // Lazy-load subcategories if not already fetched
    if (!subcategoriesMap[categoryId]) {
      setLoadingSubMap((prev) => ({ ...prev, [categoryId]: true }));
      try {
        const subs = await categoryService.getSubCategories(categoryId);
        setSubcategoriesMap((prev) => ({ ...prev, [categoryId]: subs }));
      } catch {
        message.error("Failed to fetch subcategories");
        setSubcategoriesMap((prev) => ({ ...prev, [categoryId]: [] }));
      } finally {
        setLoadingSubMap((prev) => ({ ...prev, [categoryId]: false }));
      }
    }
  };

  // ── Refresh one subcategory list ──
  const refreshSubcategories = async (parentId: string) => {
    setLoadingSubMap((prev) => ({ ...prev, [parentId]: true }));
    try {
      const subs = await categoryService.getSubCategories(parentId);
      setSubcategoriesMap((prev) => ({ ...prev, [parentId]: subs }));
    } catch {
      message.error("Failed to refresh subcategories");
    } finally {
      setLoadingSubMap((prev) => ({ ...prev, [parentId]: false }));
    }
  };

  // ── Add modal ──
  const openAddModal = (preParentId: string | null = null) => {
    preselectedParentId.current = preParentId;
    addedUnderParentId.current = preParentId;
    form.resetFields();
    if (preParentId) {
      form.setFieldsValue({ parentId: preParentId });
    }
    setIsModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();

      if (values.imageUrl instanceof File) {
        values.imageUrl = await uploadService.uploadFile(values.imageUrl);
      }

      // If parentId is undefined/empty string, omit it
      if (!values.parentId) {
        delete values.parentId;
      }

      await categoryService.createCategory(values);
      message.success("Category created successfully");
      setIsModalVisible(false);
      form.resetFields();

      const parentId = addedUnderParentId.current;
      if (parentId) {
        // Only refresh that parent's subcategory list
        await refreshSubcategories(parentId);
      } else {
        // Top-level add — refresh main list
        fetchCategories();
      }
      addedUnderParentId.current = null;
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message || "Failed to create category");
      }
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
    addedUnderParentId.current = null;
  };

  // ── Edit modal ──
  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    editForm.setFieldsValue({
      name: category.name,
      slug: category.slug,
      description: category.description,
      imageUrl: category.imageUrl,
      parentId: category.parentId ?? undefined, // null → undefined for Select
    });
    setIsEditModalVisible(true);
  };

  const handleEditModalOk = async () => {
    try {
      const values = await editForm.validateFields();
      if (!editingCategory) return;

      if (values.imageUrl instanceof File) {
        values.imageUrl = await uploadService.uploadFile(values.imageUrl);
      }

      // If parentId cleared → send null
      if (values.parentId === undefined) {
        values.parentId = null;
      }

      await categoryService.updateCategory(editingCategory.id, values);
      message.success("Category updated successfully");
      setIsEditModalVisible(false);
      setEditingCategory(null);
      editForm.resetFields();
      fetchCategories();

      // If we edited a subcategory, refresh its parent's list too
      if (editingCategory.parentId) {
        refreshSubcategories(editingCategory.parentId);
      }
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message || "Failed to update category");
      }
    }
  };

  const handleEditModalCancel = () => {
    setIsEditModalVisible(false);
    setEditingCategory(null);
    editForm.resetFields();
  };

  // ── Delete ──
  const handleDelete = async (category: Category) => {
    try {
      await categoryService.deleteCategory(category.id);
      message.success("Category deleted successfully");
      if (category.parentId) {
        refreshSubcategories(category.parentId);
      } else {
        fetchCategories();
      }
    } catch {
      message.error("Failed to delete category");
    }
  };

  const handleViewDetails = (category: Category) => {
    navigate(`/category/${category.slug}`);
  };

  // ── Shared action buttons ──
  const renderActions = (record: Category) => (
    <Space size="small">
      <Button
        type="primary"
        size="small"
        icon={<EditOutlined />}
        onClick={() => handleEdit(record)}
        disabled={!isAdmin || !!record.deletedAt}
      >
        Edit
      </Button>
      <Popconfirm
        title="Delete Category"
        description="Are you sure you want to delete this category?"
        onConfirm={() => handleDelete(record)}
        okText="Yes"
        cancelText="No"
        okType="danger"
        disabled={!isAdmin || !!record.deletedAt}
      >
        <Button
          danger
          size="small"
          icon={<DeleteOutlined />}
          disabled={!isAdmin || !!record.deletedAt}
        >
          Delete
        </Button>
      </Popconfirm>
    </Space>
  );

  // ── Resolve parentId → name ──
  const resolveParentName = (parentId: string | null) => {
    if (!parentId) return "-";
    const found = categories.find((c) => c.id === parentId);
    return found ? found.name : parentId.substring(0, 8) + "…";
  };

  // ── Main table columns ──
  const columns = [
    {
      title: "",
      key: "expand",
      width: 40,
      render: (_: unknown, record: Category) => (
        <Button
          type="text"
          size="small"
          icon={
            expandedRows.has(record.id) ? (
              <DownOutlined style={{ fontSize: 11 }} />
            ) : (
              <RightOutlined style={{ fontSize: 11 }} />
            )
          }
          onClick={() => toggleRow(record.id)}
          style={{ color: "#6b7280" }}
        />
      ),
    },
    {
      title: "Image",
      dataIndex: "imageUrl",
      key: "imageUrl",
      width: 72,
      render: (imageUrl: string | null) =>
        imageUrl ? (
          <Image
            width={40}
            height={40}
            src={imageUrl}
            style={{ borderRadius: 4, objectFit: "cover" }}
            fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='40' height='40' fill='%23e5e7eb'/%3E%3C/svg%3E"
          />
        ) : (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 4,
              background: "#e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              color: "#9ca3af",
            }}
          >
            N/A
          </div>
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
        <Text code style={{ fontSize: "12px" }}>
          {slug}
        </Text>
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (d: string) => truncate(d, 50) || "-",
    },
    {
      title: "Status",
      key: "status",
      width: 90,
      render: (_: unknown, record: Category) =>
        record.deletedAt ? (
          <Tag color="red">Deleted</Tag>
        ) : (
          <Tag color="green">Active</Tag>
        ),
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
      render: (d: string) => formatDate(d),
      sorter: (a: Category, b: Category) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: "Actions",
      key: "actions",
      width: 160,
      fixed: "right" as const,
      render: (_: unknown, record: Category) => renderActions(record),
    },
  ];

  // ── Subcategory expanded panel ──
  const renderExpandedPanel = (parentCategory: Category) => {
    const parentId = parentCategory.id;
    const isLoadingSubs = loadingSubMap[parentId];
    const subs = subcategoriesMap[parentId];

    return (
      <div
        style={{
          borderLeft: "3px solid #3DAA5C",
          marginLeft: 24,
          marginBottom: 4,
          background: "#f6fff9",
          borderRadius: "0 8px 8px 0",
          padding: "8px 0",
        }}
      >
        {isLoadingSubs ? (
          <div style={{ padding: "16px 24px", textAlign: "center" }}>
            <Spin size="small" />
            <span style={{ marginLeft: 8, color: "#6b7280", fontSize: 13 }}>
              Loading subcategories…
            </span>
          </div>
        ) : !subs || subs.length === 0 ? (
          <div
            style={{
              padding: "12px 24px",
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <Text type="secondary" style={{ fontSize: 13 }}>
              No subcategories found
            </Text>
            {isAdmin && (
              <Button
                size="small"
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => openAddModal(parentId)}
              >
                Add Subcategory
              </Button>
            )}
          </div>
        ) : (
          <>
            {subs.map((sub) => (
              <div
                key={sub.id}
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "72px 1fr 140px 1fr 90px 160px 160px",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 16px",
                  borderBottom: "1px solid #e9fce9",
                }}
              >
                {/* Image */}
                <div>
                  {sub.imageUrl ? (
                    <img
                      src={sub.imageUrl}
                      alt={sub.name}
                      style={{
                        width: 36,
                        height: 36,
                        objectFit: "cover",
                        borderRadius: 4,
                        border: "1px solid #d1fae5",
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        background: "#e5e7eb",
                        borderRadius: 4,
                      }}
                    />
                  )}
                </div>

                {/* Name + SUB badge */}
                <div
                  style={{
                    paddingLeft: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Tag
                    color="cyan"
                    style={{ fontSize: 10, padding: "0 4px", lineHeight: "18px" }}
                  >
                    SUB
                  </Tag>
                  <Text style={{ fontSize: 13 }}>{sub.name}</Text>
                </div>

                {/* Slug */}
                <Text code style={{ fontSize: 11 }}>
                  {sub.slug}
                </Text>



                {/* Description */}
                <Text style={{ fontSize: 12, color: "#6b7280" }}>
                  {truncate(sub.description, 40)}
                </Text>

                {/* Status */}
                {sub.deletedAt ? (
                  <Tag color="red" style={{ fontSize: 11 }}>
                    Inactive
                  </Tag>
                ) : (
                  <Tag color="green" style={{ fontSize: 11 }}>
                    Active
                  </Tag>
                )}

                {/* Created At */}
                <Text style={{ fontSize: 11, color: "#9ca3af" }}>
                  {formatDate(sub.createdAt)}
                </Text>

                {/* Actions */}
                <Space size="small">
                  <Button
                    type="primary"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(sub)}
                    disabled={!isAdmin || !!sub.deletedAt}
                  >
                    Edit
                  </Button>
                  <Popconfirm
                    title="Delete Subcategory"
                    description="Are you sure?"
                    onConfirm={() => handleDelete(sub)}
                    okText="Yes"
                    cancelText="No"
                    okType="danger"
                    disabled={!isAdmin || !!sub.deletedAt}
                  >
                    <Button
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      disabled={!isAdmin || !!sub.deletedAt}
                    >
                      Delete
                    </Button>
                  </Popconfirm>
                </Space>
              </div>
            ))}

            {/* Add Subcategory footer */}
            {isAdmin && (
              <div style={{ padding: "8px 24px" }}>
                <Button
                  size="small"
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => openAddModal(parentId)}
                >
                  Add Subcategory
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // ── Ant Design expandable config ──
  const expandable = {
    expandedRowKeys: Array.from(expandedRows),
    expandedRowRender: (record: Category) => renderExpandedPanel(record),
    expandIcon: () => null, // We handle chevron in the first column
    onExpand: (expanded: boolean, record: Category) => {
      // Triggered by Ant's row click — sync our state
      if (expanded && !expandedRows.has(record.id)) {
        toggleRow(record.id);
      } else if (!expanded && expandedRows.has(record.id)) {
        const next = new Set(expandedRows);
        next.delete(record.id);
        setExpandedRows(next);
      }
    },
  };

  // ── Parent category Select options (shared by both modals) ──
  const parentCategoryOptions = (excludeId?: string) => (
    <>
      <Select.Option value="">— None (Top-level category) —</Select.Option>
      {categories
        .filter((c) => c.id !== excludeId)
        .map((c) => (
          <Select.Option key={c.id} value={c.id}>
            {c.name}
          </Select.Option>
        ))}
    </>
  );

  // ── Render ──
  return (
    <div style={{ padding: "24px" }}>
      {/* Header */}
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
        <Space>
          <Input
            placeholder="Search categories…"
            allowClear
            prefix={<SearchOutlined style={{ color: "rgba(0,0,0,.45)" }} />}
            size="large"
            style={{ width: 300 }}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {isAdmin && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openAddModal(null)}
            >
              Add Category
            </Button>
          )}
        </Space>
      </div>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredCategories}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1300 }}
          expandable={expandable}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} categories`,
          }}
        />
      </Card>

      {/* ── Add Category Modal ── */}
      {isAdmin && (
        <Modal
          title="Add New Category"
          open={isModalVisible}
          onOk={handleModalOk}
          onCancel={handleModalCancel}
          okText="Create"
          cancelText="Cancel"
          destroyOnClose
        >
          <Form form={form} layout="vertical" name="categoryForm">
            <Form.Item
              name="name"
              label="Category Name"
              rules={[
                { required: true, message: "Please enter category name!" },
                { min: 2, message: "Category name must be at least 2 characters!" },
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
                  message: "Slug can only contain lowercase letters, numbers, and hyphens!",
                },
              ]}
            >
              <Input placeholder="Enter slug (e.g., electronics)" />
            </Form.Item>

            <Form.Item
              name="description"
              label="Description"
              rules={[{ max: 500, message: "Description must be less than 500 characters!" }]}
            >
              <Input.TextArea placeholder="Enter category description" rows={3} />
            </Form.Item>

            <Form.Item name="parentId" label="Parent Category">
              <Select placeholder="— None (Top-level category) —" allowClear>
                {parentCategoryOptions()}
              </Select>
            </Form.Item>

            <Form.Item name="imageUrl" label="Image">
              <AntdImageUpload />
            </Form.Item>
          </Form>
        </Modal>
      )}

      {/* ── Edit Category Modal ── */}
      {isAdmin && (
        <Modal
          title="Edit Category"
          open={isEditModalVisible}
          onOk={handleEditModalOk}
          onCancel={handleEditModalCancel}
          okText="Update"
          cancelText="Cancel"
          destroyOnClose
        >
          <Form form={editForm} layout="vertical" name="editCategoryForm">
            <Form.Item
              name="name"
              label="Category Name"
              rules={[
                { required: true, message: "Please enter category name!" },
                { min: 2, message: "Category name must be at least 2 characters!" },
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
                  message: "Slug can only contain lowercase letters, numbers, and hyphens!",
                },
              ]}
            >
              <Input placeholder="Enter slug (e.g., electronics)" />
            </Form.Item>

            <Form.Item
              name="description"
              label="Description"
              rules={[{ max: 500, message: "Description must be less than 500 characters!" }]}
            >
              <Input.TextArea placeholder="Enter category description" rows={3} />
            </Form.Item>

            <Form.Item name="parentId" label="Parent Category">
              <Select placeholder="— None (Top-level category) —" allowClear>
                {parentCategoryOptions(editingCategory?.id)}
              </Select>
            </Form.Item>

            <Form.Item name="imageUrl" label="Image">
              <AntdImageUpload />
            </Form.Item>
          </Form>
        </Modal>
      )}
    </div>
  );
};

export default Categories;
