import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { ProductUnit, CreateProductDto } from "../types/product";
import { productService } from "../services/products";
import { categoryService } from "../services/categories";
import { brandService } from "../services/brands";
import type { Category } from "../types/category";
import type { Brand } from "../types/brand";
import MultiImageUpload from "../components/MultiImageUpload";

function inputStyle() {
  return {
    width: "100%",
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    outline: "none",
    background: "#fff",
    color: "#111827",
    fontSize: 14,
    boxSizing: "border-box" as const,
  } as const;
}

function buttonStyle() {
  return {
    borderWidth: 1,
    borderStyle: "solid" as const,
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: 14,
    fontWeight: 600,
    background: "#4f46e5",
    color: "#fff",
    borderColor: "#4f46e5",
    cursor: "pointer",
  } as const;
}

function labelStyle() {
  return {
    fontSize: 13,
    fontWeight: 500,
    color: "#374151",
    marginBottom: 4,
    display: "block",
  } as const;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
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

export default function ProductAdd() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(false);

  // Collected objectNames from MultiImageUpload
  const [uploadedObjectNames, setUploadedObjectNames] = useState<string[]>([]);

  // Track if slug was manually edited
  const slugManuallyEdited = useRef(false);

  const [form, setForm] = useState<{
    name: string;
    slug: string;
    description: string;
    price: string;
    sku: string;
    unit: ProductUnit;
    isAvailable: boolean;
    categoryId: string;
    brandId: string; // "" means "None" (omit from payload)
  }>({
    name: "",
    slug: "",
    description: "",
    price: "0",
    sku: "",
    unit: "PIECE" as ProductUnit,
    isAvailable: true,
    categoryId: "",
    brandId: "",
  });

  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const data = await categoryService.getEnabledCategories();
        setCategories(data);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      } finally {
        setLoadingCategories(false);
      }
    };

    const fetchBrands = async () => {
      setLoadingBrands(true);
      try {
        const response = await brandService.getBrands({
          page: 1,
          pageSize: 100,
        });
        setBrands(response.data);
      } catch (error) {
        console.error("Failed to fetch brands:", error);
      } finally {
        setLoadingBrands(false);
      }
    };

    fetchCategories();
    fetchBrands();
  }, []);

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.value;
    setForm((prev) => ({
      ...prev,
      name,
      // Auto-generate slug only if user hasn't manually edited it
      slug: slugManuallyEdited.current ? prev.slug : generateSlug(name),
    }));
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    slugManuallyEdited.current = true;
    setForm((prev) => ({ ...prev, slug: e.target.value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setImageError(null);

    // Validate images — need at least one uploaded
    if (uploadedObjectNames.length < 1) {
      setImageError("Please upload at least one product image");
      return;
    }

    setSaving(true);
    try {
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
        // Omit brandId entirely if not selected
        ...(form.brandId ? { brandId: form.brandId } : {}),
      };

      console.log("Payload being sent:", payload);
      await productService.createProduct(payload);
      navigate("/products");
    } catch (error) {
      console.error("Product creation failed:", error);
      setSubmitError(
        error instanceof Error ? error.message : "Failed to create product"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <h2 style={{ margin: 0, marginBottom: 24, fontSize: 22, fontWeight: 700 }}>
        Add Product
      </h2>

      <form onSubmit={onSubmit}>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          {/* Name */}
          <label style={{ display: "block" }}>
            <span style={labelStyle()}>
              Name <span style={{ color: "#ef4444" }}>*</span>
            </span>
            <input
              id="product-add-name"
              value={form.name}
              onChange={handleNameChange}
              style={inputStyle()}
              required
              placeholder="e.g. Organic Basmati Rice"
            />
          </label>

          {/* Slug */}
          <label style={{ display: "block" }}>
            <span style={labelStyle()}>
              Slug <span style={{ color: "#ef4444" }}>*</span>
            </span>
            <input
              id="product-add-slug"
              value={form.slug}
              onChange={handleSlugChange}
              style={inputStyle()}
              required
              placeholder="auto-generated from name"
            />
          </label>

          {/* SKU */}
          <label style={{ display: "block" }}>
            <span style={labelStyle()}>
              SKU <span style={{ color: "#ef4444" }}>*</span>
            </span>
            <input
              id="product-add-sku"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              style={inputStyle()}
              required
              placeholder="e.g. RICE-001"
            />
          </label>

          {/* Price */}
          <label style={{ display: "block" }}>
            <span style={labelStyle()}>
              Price (₹) <span style={{ color: "#ef4444" }}>*</span>
            </span>
            <input
              id="product-add-price"
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(e) =>
                setForm({ ...form, price: e.target.value || "0" })
              }
              style={inputStyle()}
              required
            />
          </label>

          {/* Unit */}
          <label style={{ display: "block" }}>
            <span style={labelStyle()}>
              Unit <span style={{ color: "#ef4444" }}>*</span>
            </span>
            <select
              id="product-add-unit"
              value={form.unit}
              onChange={(e) =>
                setForm({ ...form, unit: e.target.value as ProductUnit })
              }
              style={inputStyle()}
              required
            >
              {UNIT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          {/* Category */}
          <label style={{ display: "block" }}>
            <span style={labelStyle()}>
              Category <span style={{ color: "#ef4444" }}>*</span>
            </span>
            <select
              id="product-add-category"
              value={form.categoryId}
              onChange={(e) =>
                setForm({ ...form, categoryId: e.target.value })
              }
              style={inputStyle()}
              required
              disabled={loadingCategories}
            >
              <option value="">
                {loadingCategories ? "Loading..." : "Select a category"}
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          {/* Brand (optional) */}
          <label style={{ display: "block" }}>
            <span style={labelStyle()}>Brand (optional)</span>
            <select
              id="product-add-brand"
              value={form.brandId}
              onChange={(e) => setForm({ ...form, brandId: e.target.value })}
              style={inputStyle()}
              disabled={loadingBrands}
            >
              <option value="">
                {loadingBrands ? "Loading..." : "None"}
              </option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </label>

          {/* Availability */}
          <label style={{ display: "block" }}>
            <span style={labelStyle()}>
              Availability <span style={{ color: "#ef4444" }}>*</span>
            </span>
            <select
              id="product-add-available"
              value={form.isAvailable.toString()}
              onChange={(e) =>
                setForm({
                  ...form,
                  isAvailable: e.target.value === "true",
                })
              }
              style={inputStyle()}
            >
              <option value="true">Available</option>
              <option value="false">Unavailable</option>
            </select>
          </label>

          {/* Description — full width */}
          <label style={{ gridColumn: "1 / -1", display: "block" }}>
            <span style={labelStyle()}>
              Description <span style={{ color: "#ef4444" }}>*</span>
            </span>
            <textarea
              id="product-add-description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              style={{ ...inputStyle(), minHeight: 90, resize: "vertical" }}
              required
              placeholder="Describe the product..."
            />
          </label>

          {/* Multi-image upload — full width */}
          <div style={{ gridColumn: "1 / -1" }}>
            <MultiImageUpload
              onChange={(names) => {
                setUploadedObjectNames(names);
                if (names.length > 0) setImageError(null);
              }}
            />
            {imageError && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  color: "#ef4444",
                  fontWeight: 500,
                }}
              >
                ⚠ {imageError}
              </div>
            )}
          </div>
        </div>

        {/* Submit error */}
        {submitError && (
          <div
            style={{
              marginTop: 12,
              padding: "8px 12px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 8,
              fontSize: 13,
              color: "#b91c1c",
            }}
          >
            {submitError}
          </div>
        )}

        <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
          <button
            id="product-add-submit"
            type="submit"
            style={buttonStyle()}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Product"}
          </button>
          <button
            type="button"
            style={{
              ...buttonStyle(),
              background: "#f3f4f6",
              color: "#111827",
              borderColor: "#e5e7eb",
            }}
            onClick={() => navigate("/products")}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
