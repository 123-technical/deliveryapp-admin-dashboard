import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { ProductUnit, UpdateProductDto } from "../types/product";
import { productService } from "../services/products";
import { categoryService } from "../services/categories";
import { brandService } from "../services/brands";
import type { Category } from "../types/category";
import type { Brand } from "../types/brand";
import { App } from "antd";
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

function buttonStyle(disabled = false) {
  return {
    borderWidth: 1,
    borderStyle: "solid" as const,
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: 14,
    fontWeight: 600,
    background: disabled ? "#f3f4f6" : "#4f46e5",
    color: disabled ? "#9ca3af" : "#fff",
    borderColor: disabled ? "#e5e7eb" : "#4f46e5",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
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

export default function ProductEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { message } = App.useApp();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(false);

  // Existing image URLs fetched from the product — passed to MultiImageUpload
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  // The current set of objectNames managed by MultiImageUpload (existing + new)
  const [uploadedObjectNames, setUploadedObjectNames] = useState<string[]>([]);
  // Whether MultiImageUpload has been initialised with existing images
  const [multiUploadReady, setMultiUploadReady] = useState(false);

  const slugManuallyEdited = useRef(false);

  const [originalProduct, setOriginalProduct] = useState<{
    name: string;
    slug: string;
    description: string;
    price: string;
    sku: string;
    unit: ProductUnit;
    isAvailable: boolean;
    categoryId: string;
    brandId: string;
  } | null>(null);

  const [form, setForm] = useState<{
    name: string;
    slug: string;
    description: string;
    price: string;
    sku: string;
    unit: ProductUnit;
    isAvailable: boolean;
    categoryId: string;
    brandId: string;
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
    const fetchData = async () => {
      if (!id) return;

      setLoadingCategories(true);
      setLoadingBrands(true);
      try {
        const [categoriesData, brandsResponse] = await Promise.all([
          categoryService.getEnabledCategories(),
          brandService.getBrands({ page: 1, pageSize: 100 }),
        ]);
        setCategories(categoriesData);
        setBrands(brandsResponse.data);
      } catch (error) {
        console.error("Failed to fetch categories/brands:", error);
      } finally {
        setLoadingCategories(false);
        setLoadingBrands(false);
      }

      setLoading(true);
      try {
        const product = await productService.getProductById(id);

        const formValues = {
          name: product.name,
          slug: product.slug,
          description: product.description || "",
          price: product.price,
          sku: product.sku,
          unit: product.unit,
          isAvailable: product.isAvailable,
          categoryId: product.categoryId,
          brandId: product.brandId || "",
        };

        setOriginalProduct(formValues);
        setForm(formValues);

        // Pre-populate existing images
        const urls = Array.isArray(product.imageUrls) ? product.imageUrls : [];
        setExistingImageUrls(urls);
        setMultiUploadReady(true);
      } catch (error) {
        console.error("Failed to fetch product:", error);
        message.error("Failed to fetch product");
        setOriginalProduct(null);
        setMultiUploadReady(true); // still show form
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const hasChanges =
    originalProduct &&
    (form.name !== originalProduct.name ||
      form.slug !== originalProduct.slug ||
      form.description !== originalProduct.description ||
      form.price !== originalProduct.price ||
      form.sku !== originalProduct.sku ||
      form.unit !== originalProduct.unit ||
      form.isAvailable !== originalProduct.isAvailable ||
      form.categoryId !== originalProduct.categoryId ||
      form.brandId !== originalProduct.brandId ||
      // Images changed if the objectNames differ from the original derived set
      JSON.stringify(uploadedObjectNames) !==
        JSON.stringify(
          existingImageUrls.map((url) => {
            try {
              const u = new URL(url);
              const oIndex = u.pathname.indexOf("/o/");
              if (oIndex !== -1)
                return decodeURIComponent(u.pathname.substring(oIndex + 3));
            } catch {}
            return url;
          })
        ));

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.value;
    setForm((prev) => ({
      ...prev,
      name,
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

    if (!hasChanges || !id) return;

    if (uploadedObjectNames.length < 1) {
      setImageError("Please upload at least one product image");
      return;
    }

    setSaving(true);
    try {
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

      await productService.updateProduct(id, payload);
      message.success("Product updated successfully");
      navigate("/products");
    } catch (error) {
      console.error("Product update failed:", error);
      const msg =
        error instanceof Error ? error.message : "Failed to update product";
      setSubmitError(msg);
      message.error(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <div>Loading product...</div>
      </div>
    );
  }

  if (!originalProduct) {
    return (
      <div style={{ padding: 24 }}>
        <div>Product not found.</div>
        <button style={buttonStyle()} onClick={() => navigate("/products")}>
          Back to Products
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <h2 style={{ margin: 0, marginBottom: 24, fontSize: 22, fontWeight: 700 }}>
        Edit Product
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
              id="product-edit-name"
              value={form.name}
              onChange={handleNameChange}
              style={inputStyle()}
              required
            />
          </label>

          {/* Slug */}
          <label style={{ display: "block" }}>
            <span style={labelStyle()}>
              Slug <span style={{ color: "#ef4444" }}>*</span>
            </span>
            <input
              id="product-edit-slug"
              value={form.slug}
              onChange={handleSlugChange}
              style={inputStyle()}
              required
            />
          </label>

          {/* SKU */}
          <label style={{ display: "block" }}>
            <span style={labelStyle()}>
              SKU <span style={{ color: "#ef4444" }}>*</span>
            </span>
            <input
              id="product-edit-sku"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              style={inputStyle()}
              required
            />
          </label>

          {/* Price */}
          <label style={{ display: "block" }}>
            <span style={labelStyle()}>
              Price (₹) <span style={{ color: "#ef4444" }}>*</span>
            </span>
            <input
              id="product-edit-price"
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
              id="product-edit-unit"
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
              id="product-edit-category"
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
              id="product-edit-brand"
              value={form.brandId}
              onChange={(e) => setForm({ ...form, brandId: e.target.value })}
              style={inputStyle()}
              disabled={loadingBrands}
            >
              <option value="">{loadingBrands ? "Loading..." : "None"}</option>
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
              id="product-edit-available"
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
              id="product-edit-description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              style={{ ...inputStyle(), minHeight: 90, resize: "vertical" }}
              required
            />
          </label>

          {/* Multi-image upload — full width, pre-populated with existing URLs */}
          <div style={{ gridColumn: "1 / -1" }}>
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
            id="product-edit-submit"
            type="submit"
            style={buttonStyle(!hasChanges || saving)}
            disabled={!hasChanges || saving}
          >
            {saving ? "Saving..." : "Save Changes"}
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
