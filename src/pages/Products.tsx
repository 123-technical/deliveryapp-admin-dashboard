import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  Button,
  Input,
  App,
  Popconfirm,
  Tag,
  Tooltip,
} from "antd";
import { useQuery } from "@tanstack/react-query";
import { inventoryService } from "../services/inventory";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { productService } from "../services/products";
import { categoryService } from "../services/categories";
import { brandService } from "../services/brands";
import { useAuth } from "../contexts/AuthContext";
import type { Product, ProductUnit, CreateProductDto, UpdateProductDto } from "../types/product";
import type { Category } from "../types/category";
import type { Brand } from "../types/brand";
import MultiImageUpload from "../components/MultiImageUpload";
import DrawerForm from "../components/DrawerForm";
import StatusBadge from "../components/StatusBadge";
import CopyableId from "../components/CopyableId";
import TableImage from "../components/TableImage";

// ─── Slug helper ──────────────────────────────────────────────────────────────
function generateSlug(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

const UNIT_OPTIONS: { value: ProductUnit; label: string }[] = [
  { value: "PIECE", label: "Piece" },
  { value: "KG", label: "Kilogram" },
  { value: "GRAM", label: "Gram" },
  { value: "LITRE", label: "Litre" },
  { value: "ML", label: "Milliliter" },
  { value: "METER", label: "Meter" },
  { value: "CM", label: "Centimeter" },
  { value: "BOX", label: "Box" },
  { value: "PACK", label: "Pack" },
];

// ─── Default form state ───────────────────────────────────────────────────────
const defaultForm = {
  name: "",
  slug: "",
  description: "",
  price: "0",
  sku: "",
  unit: "PIECE" as ProductUnit,
  isAvailable: true,
  categoryId: "",
  brandId: "",
};

const Products = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { message } = App.useApp();

  // ── Table state ──
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // ── Drawer state ──
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  // ── Form state ──
  const [form, setForm] = useState(defaultForm);
  const slugManuallyEdited = useRef(false);

  // ── Data for selects ──
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(false);

  // ── Image upload state ──
  const [uploadedObjectNames, setUploadedObjectNames] = useState<string[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [multiUploadReady, setMultiUploadReady] = useState(false);

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  // ── Debounce search ──
  useEffect(() => {
    const h = setTimeout(() => {
      if (search !== searchInput) { setSearch(searchInput); setPage(1); }
    }, 300);
    return () => clearTimeout(h);
  }, [searchInput, search]);

  // ── Fetch products ──
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productService.getProducts({ page, pageSize, search: search || undefined });
      setProducts(res.data);
      setTotal(res.total);
    } catch {
      message.error("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Stock summed across warehouses for the visible page; polled so orders
  // from the app show up without a manual refresh.
  const productIds = products.map((p) => p.id);
  const stockTotals = useQuery({
    queryKey: ["stock-totals", productIds],
    queryFn: () => inventoryService.totals(productIds),
    enabled: productIds.length > 0,
    refetchInterval: 30_000,
  });

  // ── Fetch categories + brands for the drawer ──
  const fetchDropdownData = async () => {
    setLoadingCategories(true);
    setLoadingBrands(true);
    try {
      const [cats, brandsRes] = await Promise.all([
        categoryService.getEnabledCategories(),
        brandService.getBrands({ page: 1, pageSize: 100 }),
      ]);
      setCategories(cats);
      setBrands(brandsRes.data);
    } catch {
      message.error("Failed to load categories/brands");
    } finally {
      setLoadingCategories(false);
      setLoadingBrands(false);
    }
  };

  // ── Open drawer for Add ──
  const openAddDrawer = () => {
    setEditingProduct(null);
    setForm(defaultForm);
    slugManuallyEdited.current = false;
    setUploadedObjectNames([]);
    setExistingImageUrls([]);
    setMultiUploadReady(true);
    setSubmitError(null);
    setImageError(null);
    setIsDrawerOpen(true);
    fetchDropdownData();
  };

  // ── Open drawer for Edit ──
  const openEditDrawer = async (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      slug: product.slug,
      description: product.description || "",
      price: product.price,
      sku: product.sku,
      unit: product.unit,
      isAvailable: product.isAvailable,
      categoryId: product.categoryId,
      brandId: product.brandId || "",
    });
    slugManuallyEdited.current = true;
    const urls = Array.isArray(product.imageUrls) ? product.imageUrls : [];
    setExistingImageUrls(urls);
    setMultiUploadReady(false);
    setTimeout(() => setMultiUploadReady(true), 50);
    setUploadedObjectNames([]);
    setSubmitError(null);
    setImageError(null);
    setIsDrawerOpen(true);
    fetchDropdownData();
  };

  const closeDrawer = () => {
    if (saving) return;
    setIsDrawerOpen(false);
    setEditingProduct(null);
    setForm(defaultForm);
    setUploadedObjectNames([]);
    setExistingImageUrls([]);
    setMultiUploadReady(false);
  };

  // ── Submit ──
  const handleSubmit = async () => {
    setSubmitError(null);
    setImageError(null);

    if (uploadedObjectNames.length < 1) {
      setImageError("Please upload at least one product image");
      return;
    }
    if (!form.name || !form.slug || !form.sku || !form.categoryId) {
      setSubmitError("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      if (editingProduct) {
        const payload: UpdateProductDto = {
          name: form.name,
          slug: form.slug,
          description: form.description,
          price: form.price,
          sku: form.sku,
          unit: form.unit,
          imageKeys: uploadedObjectNames,
          isAvailable: form.isAvailable,
          categoryId: form.categoryId,
          ...(form.brandId ? { brandId: form.brandId } : { brandId: undefined }),
        };
        await productService.updateProduct(editingProduct.id, payload);
        message.success("Product updated successfully");
      } else {
        const payload: CreateProductDto = {
          name: form.name,
          slug: form.slug,
          description: form.description,
          price: form.price,
          sku: form.sku,
          unit: form.unit,
          imageKeys: uploadedObjectNames,
          isAvailable: form.isAvailable,
          categoryId: form.categoryId,
          ...(form.brandId ? { brandId: form.brandId } : {}),
        };
        await productService.createProduct(payload);
        message.success("Product created successfully");
      }
      closeDrawer();
      fetchProducts();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to save product";
      setSubmitError(msg);
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──
  const handleDelete = async (id: string) => {
    try {
      await productService.deleteProduct(id);
      message.success("Product deleted successfully");
      fetchProducts();
    } catch {
      message.error("Failed to delete product");
    }
  };

  // ── Name change (auto-slug) ──
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setForm((prev) => ({
      ...prev,
      name,
      slug: slugManuallyEdited.current ? prev.slug : generateSlug(name),
    }));
  };

  // ── Columns ──
  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 110,
      render: (id: string) => <CopyableId id={id} />,
    },
    {
      title: "Image",
      key: "image",
      width: 60,
      render: (_: unknown, record: Product) => (
        <TableImage src={record.imageUrls?.[0]} alt={record.name} />
      ),
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name: string, record: Product) => (
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
          onClick={() => navigate(`/product/detail/${record.id}`)}
        >
          {name}
        </button>
      ),
    },
    {
      title: "Price",
      dataIndex: "price",
      key: "price",
      width: 100,
      render: (price: string) => `₹${parseFloat(price).toFixed(2)}`,
    },
    {
      title: "Stock",
      key: "stock",
      width: 150,
      render: (_: unknown, record: Product) => {
        const t = stockTotals.data?.[record.id];
        if (!t) return <span style={{ color: "#94A3B8" }}>—</span>;
        const issues = [
          t.outIn > 0 && `out in ${t.outIn} warehouse${t.outIn > 1 ? "s" : ""}`,
          t.lowIn > 0 && `low in ${t.lowIn}`,
        ].filter(Boolean).join(", ");
        const color = t.total === 0 ? "red" : issues ? "orange" : "green";
        return (
          <Tooltip title={issues ? `Total across warehouses · ${issues}` : "Total across warehouses"}>
            <Tag color={color} style={{ fontWeight: 600, cursor: "pointer" }} onClick={() => navigate(`/product/detail/${record.id}`)}>
              {t.total === 0 ? "Out of stock" : `${t.total}${issues ? " · check" : ""}`}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: "Unit",
      dataIndex: "unit",
      key: "unit",
      width: 80,
      render: (unit: string) => (
        <span className="ds-badge confirmed" style={{ fontSize: 11 }}>{unit}</span>
      ),
    },
    {
      title: "Available",
      dataIndex: "isAvailable",
      key: "isAvailable",
      width: 100,
      render: (isAvailable: boolean) => <StatusBadge status={isAvailable} />,
    },
    {
      title: "Status",
      key: "status",
      width: 90,
      render: (_: unknown, record: Product) => (
        <StatusBadge status={record.deletedAt ? "Deleted" : "ACTIVE"} />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      fixed: "right" as const,
      render: (_: unknown, record: Product) => (
        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
          <Button
            className="ds-action-btn edit"
            icon={<EyeOutlined style={{ fontSize: 14 }} />}
            onClick={() => navigate(`/product/detail/${record.id}`)}
            title="View Details"
          />
          {isAdmin && (
            <>
              <Button
                className="ds-action-btn edit"
                icon={<EditOutlined style={{ fontSize: 14 }} />}
                onClick={() => openEditDrawer(record)}
                disabled={!!record.deletedAt}
                title="Edit Product"
              />
              <Popconfirm
                title="Delete Product"
                description="Are you sure you want to delete this product?"
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
                  title="Delete Product"
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
      {/* Page Header */}
      <div className="ds-page-header">
        <h1 className="ds-page-title">Products</h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Input
            placeholder="Search products…"
            prefix={<SearchOutlined style={{ color: "#94A3B8" }} />}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ width: 260, borderRadius: 8, borderColor: "#E2E8F0" }}
            allowClear
          />
          {isAdmin && (
            <Button
              icon={<PlusOutlined />}
              onClick={openAddDrawer}
              className="ds-btn-primary"
            >
              Add Product
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="ds-table-wrapper">
        <Table
          columns={columns}
          dataSource={products}
          rowKey="id"
          loading={loading}
          scroll={{ x: 900 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t, range) => `${range[0]}-${range[1]} of ${t} products`,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          }}
          locale={{
            emptyText: (
              <div className="ds-empty">
                <div className="ds-empty-icon">📦</div>
                <div className="ds-empty-text">No products found</div>
              </div>
            ),
          }}
        />
      </div>

      {/* Add / Edit Drawer */}
      <DrawerForm
        isOpen={isDrawerOpen}
        title={editingProduct ? "Edit Product" : "Add Product"}
        onClose={closeDrawer}
        onSubmit={handleSubmit}
        isSubmitting={saving}
        submitLabel={editingProduct ? "Save Changes" : "Create Product"}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Name */}
          <div className="ds-field-group">
            <label className="ds-label">Name <span style={{ color: "#EF4444" }}>*</span></label>
            <input
              id="product-name"
              className="ds-input"
              value={form.name}
              onChange={handleNameChange}
              required
              placeholder="e.g. Organic Basmati Rice"
            />
          </div>

          {/* Slug */}
          <div className="ds-field-group">
            <label className="ds-label">Slug <span style={{ color: "#EF4444" }}>*</span></label>
            <input
              id="product-slug"
              className="ds-input"
              value={form.slug}
              onChange={(e) => {
                slugManuallyEdited.current = true;
                setForm((p) => ({ ...p, slug: e.target.value }));
              }}
              required
              placeholder="auto-generated from name"
            />
          </div>

          {/* SKU */}
          <div className="ds-field-group">
            <label className="ds-label">SKU <span style={{ color: "#EF4444" }}>*</span></label>
            <input
              id="product-sku"
              className="ds-input"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              required
              placeholder="e.g. RICE-001"
            />
          </div>

          {/* Price */}
          <div className="ds-field-group">
            <label className="ds-label">Price (₹) <span style={{ color: "#EF4444" }}>*</span></label>
            <input
              id="product-price"
              className="ds-input"
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value || "0" })}
              required
            />
          </div>

          {/* Unit */}
          <div className="ds-field-group">
            <label className="ds-label">Unit <span style={{ color: "#EF4444" }}>*</span></label>
            <select
              id="product-unit"
              className="ds-input"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value as ProductUnit })}
              required
            >
              {UNIT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div className="ds-field-group">
            <label className="ds-label">Category <span style={{ color: "#EF4444" }}>*</span></label>
            <select
              id="product-category"
              className="ds-input"
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              required
              disabled={loadingCategories}
            >
              <option value="">{loadingCategories ? "Loading…" : "Select a category"}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Brand */}
          <div className="ds-field-group">
            <label className="ds-label">Brand (optional)</label>
            <select
              id="product-brand"
              className="ds-input"
              value={form.brandId}
              onChange={(e) => setForm({ ...form, brandId: e.target.value })}
              disabled={loadingBrands}
            >
              <option value="">{loadingBrands ? "Loading…" : "None"}</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Availability */}
          <div className="ds-field-group">
            <label className="ds-label">Availability <span style={{ color: "#EF4444" }}>*</span></label>
            <select
              id="product-available"
              className="ds-input"
              value={form.isAvailable.toString()}
              onChange={(e) => setForm({ ...form, isAvailable: e.target.value === "true" })}
            >
              <option value="true">Available</option>
              <option value="false">Unavailable</option>
            </select>
          </div>

          {/* Description — full width */}
          <div className="ds-field-group" style={{ gridColumn: "1 / -1" }}>
            <label className="ds-label">Description <span style={{ color: "#EF4444" }}>*</span></label>
            <textarea
              id="product-description"
              className="ds-input"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
              placeholder="Describe the product…"
              style={{ minHeight: 80, resize: "vertical" }}
            />
          </div>

          {/* Images — full width */}
          <div style={{ gridColumn: "1 / -1" }}>
            <div className="ds-section-label">Product Images</div>
            {multiUploadReady && (
              <MultiImageUpload
                existingImageUrls={existingImageUrls}
                onChange={(names) => {
                  setUploadedObjectNames(names);
                  if (names.length > 0) setImageError(null);
                }}
              />
            )}
            {imageError && (
              <p className="ds-error-text" style={{ marginTop: 6 }}>⚠ {imageError}</p>
            )}
          </div>
        </div>

        {/* Submit error */}
        {submitError && (
          <div
            style={{
              marginTop: 16,
              padding: "10px 14px",
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: 8,
              fontSize: 13,
              color: "#B91C1C",
            }}
          >
            {submitError}
          </div>
        )}
      </DrawerForm>
    </div>
  );
};

export default Products;
