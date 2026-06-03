import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Table,
  Popconfirm,
  Form,
  Input,
  App,
  Select,
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
import StatusBadge from "../components/StatusBadge";
import TableImage from "../components/TableImage";
import DrawerForm from "../components/DrawerForm";

// ─── Helpers ────────────────────────────────────────────────────────────────

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

  // ── Drawer state ──
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [savingCategory, setSavingCategory] = useState(false);
  
  // When opened from "+ Add Subcategory", we pre-select this parentId
  const preselectedParentId = useRef<string | null>(null);
  // Track which parentId was pre-selected so we can refresh only that subcategory list
  const addedUnderParentId = useRef<string | null>(null);
  const [form] = Form.useForm();

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

  // ── Drawer Handlers ──
  const openAddDrawer = (preParentId: string | null = null) => {
    preselectedParentId.current = preParentId;
    addedUnderParentId.current = preParentId;
    form.resetFields();
    if (preParentId) {
      form.setFieldsValue({ parentId: preParentId });
    }
    setEditingCategory(null);
    setIsDrawerOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    form.setFieldsValue({
      name: category.name,
      slug: category.slug,
      description: category.description,
      imageUrl: category.imageUrl,
      parentId: category.parentId ?? undefined, // null → undefined for Select
    });
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setEditingCategory(null);
    form.resetFields();
    addedUnderParentId.current = null;
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSavingCategory(true);

      if (values.imageUrl instanceof File) {
        values.imageUrl = await uploadService.uploadFile(values.imageUrl);
      }

      if (values.parentId === undefined) {
        values.parentId = null;
      }

      if (editingCategory) {
        await categoryService.updateCategory(editingCategory.id, values);
        message.success("Category updated successfully");
      } else {
        await categoryService.createCategory(values);
        message.success("Category created successfully");
      }

      setIsDrawerOpen(false);
      form.resetFields();

      const parentId = editingCategory ? editingCategory.parentId : addedUnderParentId.current;
      if (parentId) {
        // Only refresh that parent's subcategory list
        await refreshSubcategories(parentId);
      } else {
        // Top-level add/edit — refresh main list
        fetchCategories();
      }
      
      setEditingCategory(null);
      addedUnderParentId.current = null;
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message || "Failed to save category");
      }
    } finally {
      setSavingCategory(false);
    }
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
    <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
      <Button
        className="ds-action-btn edit"
        icon={<EditOutlined style={{ fontSize: 14 }} />}
        onClick={() => handleEdit(record)}
        disabled={!isAdmin || !!record.deletedAt}
        title="Edit"
      />
      <Popconfirm
        title="Delete Category"
        description="Are you sure you want to delete this category?"
        onConfirm={() => handleDelete(record)}
        okText="Delete"
        cancelText="Cancel"
        okType="danger"
        disabled={!isAdmin || !!record.deletedAt}
      >
        <Button
          className="ds-action-btn delete"
          icon={<DeleteOutlined style={{ fontSize: 14 }} />}
          disabled={!isAdmin || !!record.deletedAt}
          title="Delete"
        />
      </Popconfirm>
    </div>
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
          style={{ color: "#64748B" }}
        />
      ),
    },
    {
      title: "Image",
      dataIndex: "imageUrl",
      key: "imageUrl",
      width: 64,
      render: (imageUrl: string | null, record: Category) => (
        <TableImage src={imageUrl} alt={record.name} />
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
        <span style={{ fontSize: "12px", fontFamily: "monospace", background: "#f1f5f9", padding: "2px 4px", borderRadius: "4px" }}>
          {slug}
        </span>
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
      render: (_: unknown, record: Category) => (
        <StatusBadge status={record.deletedAt ? "Deleted" : "ACTIVE"} />
      ),
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 130,
      render: (d: string) => (
        <span style={{ fontSize: 12, color: "#64748B" }}>{new Date(d).toLocaleDateString()}</span>
      ),
      sorter: (a: Category, b: Category) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
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
          borderLeft: "3px solid #10B981",
          marginLeft: 0,
          background: "#F8FAFC",
          borderRadius: "0 0 0 0",
        }}
      >
        {isLoadingSubs ? (
          <div style={{ padding: "16px 24px", textAlign: "center" }}>
            <Spin size="small" />
            <span style={{ marginLeft: 8, color: "#64748B", fontSize: 13 }}>
              Loading subcategories…
            </span>
          </div>
        ) : !subs || subs.length === 0 ? (
          <div style={{ padding: "12px 24px", display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 13, color: "#64748B" }}>No subcategories found</span>
            {isAdmin && (
              <Button
                size="small"
                icon={<PlusOutlined />}
                onClick={() => openAddDrawer(parentId)}
                style={{ borderStyle: "dashed" }}
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
                className="ds-sub-row"
                style={{
                  gridTemplateColumns: "60px 1fr 150px 1fr 100px 100px",
                }}
              >
                {/* Image */}
                <TableImage src={sub.imageUrl} alt={sub.name} />

                {/* Name + SUB badge */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 8 }}>
                  <span className="ds-badge sub" style={{ fontSize: 10 }}>SUB</span>
                  <span style={{ fontSize: 13, color: "#0F172A" }}>{sub.name}</span>
                </div>

                {/* Slug */}
                <span style={{ fontFamily: "monospace", fontSize: 11, color: "#64748B" }}>
                  {sub.slug}
                </span>

                {/* Description */}
                <span style={{ fontSize: 12, color: "#64748B" }}>
                  {truncate(sub.description, 40)}
                </span>

                {/* Status */}
                <StatusBadge status={sub.deletedAt ? "Deleted" : "ACTIVE"} />

                {/* Actions */}
                <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                  <Button
                    className="ds-action-btn edit"
                    icon={<EditOutlined style={{ fontSize: 13 }} />}
                    onClick={() => handleEdit(sub)}
                    disabled={!isAdmin || !!sub.deletedAt}
                    title="Edit"
                  />
                  <Popconfirm
                    title="Delete Subcategory"
                    description="Are you sure?"
                    onConfirm={() => handleDelete(sub)}
                    okText="Delete"
                    cancelText="Cancel"
                    okType="danger"
                    disabled={!isAdmin || !!sub.deletedAt}
                  >
                    <Button
                      className="ds-action-btn delete"
                      icon={<DeleteOutlined style={{ fontSize: 13 }} />}
                      disabled={!isAdmin || !!sub.deletedAt}
                      title="Delete"
                    />
                  </Popconfirm>
                </div>
              </div>
            ))}

            {/* Add Subcategory footer */}
            {isAdmin && (
              <div style={{ padding: "10px 24px" }}>
                <Button
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => openAddDrawer(parentId)}
                  style={{ borderStyle: "dashed", color: "#64748B" }}
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
      <div className="ds-page-header">
        <h1 className="ds-page-title">Categories</h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Input
            placeholder="Search categories…"
            allowClear
            prefix={<SearchOutlined style={{ color: "#94A3B8" }} />}
            style={{ width: 260, borderRadius: 8, borderColor: "#E2E8F0" }}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {isAdmin && (
            <Button
              icon={<PlusOutlined />}
              className="ds-btn-primary"
              onClick={() => openAddDrawer(null)}
            >
              Add Category
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="ds-table-wrapper">
        <Table
          columns={columns}
          dataSource={filteredCategories}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1000 }}
          expandable={expandable}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} categories`,
          }}
          locale={{
            emptyText: (
              <div className="ds-empty">
                <div className="ds-empty-icon">📂</div>
                <div className="ds-empty-text">No categories found</div>
              </div>
            ),
          }}
        />
      </div>

      {/* ── Category Drawer ── */}
      <DrawerForm
        isOpen={isDrawerOpen}
        title={editingCategory ? "Edit Category" : "Add Category"}
        onClose={handleCloseDrawer}
        onSubmit={handleSubmit}
        isSubmitting={savingCategory}
        submitLabel={editingCategory ? "Save Changes" : "Create"}
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
            <Input placeholder="Enter category name" className="ds-input" />
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
            <Input placeholder="Enter slug (e.g., electronics)" className="ds-input" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ max: 500, message: "Description must be less than 500 characters!" }]}
          >
            <Input.TextArea placeholder="Enter category description" rows={3} className="ds-input" />
          </Form.Item>

          <Form.Item name="parentId" label="Parent Category">
            {editingCategory && editingCategory.parentId ? (
              <Input value={resolveParentName(editingCategory.parentId)} disabled className="ds-input" />
            ) : addedUnderParentId.current ? (
              <Input value={resolveParentName(addedUnderParentId.current)} disabled className="ds-input" />
            ) : (
              <Select placeholder="— None (Top-level category) —" allowClear>
                {parentCategoryOptions(editingCategory?.id)}
              </Select>
            )}
          </Form.Item>

          <Form.Item name="imageUrl" label="Image">
            <AntdImageUpload />
          </Form.Item>
        </Form>
      </DrawerForm>
    </div>
  );
};

export default Categories;
