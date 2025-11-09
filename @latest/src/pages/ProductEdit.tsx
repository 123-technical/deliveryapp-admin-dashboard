import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { ProductUnit, UpdateProductDto } from "../types/product";
import { productService } from "../services/products";
import { categoryService } from "../services/categories";
import { brandService } from "../services/brands";
import type { Category } from "../types/category";
import type { Brand } from "../types/brand";
import { message } from "antd";

function inputStyle() {
  return {
    width: "100%",
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    outline: "none",
    background: "#fff",
    color: "#111827",
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

export default function ProductEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [originalProduct, setOriginalProduct] = useState<any>(null);
  const [form, setForm] = useState<{
    name: string;
    slug: string;
    description: string;
    price: string;
    sku: string;
    unit: ProductUnit;
    imageUrl?: string;
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
    imageUrl: undefined,
    isAvailable: true,
    categoryId: "",
    brandId: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      // Fetch categories and brands
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

      // Fetch product
      setLoading(true);
      try {
        const product = await productService.getProductById(id);
        setOriginalProduct(product);
        setForm({
          name: product.name,
          slug: product.slug,
          description: product.description || "",
          price: product.price,
          sku: product.sku,
          unit: product.unit,
          imageUrl: product.imageUrl || undefined,
          isAvailable: product.isAvailable,
          categoryId: product.categoryId,
          brandId: product.brandId || "",
        });
      } catch (error) {
        console.error("Failed to fetch product:", error);
        message.error("Failed to fetch product");
        setOriginalProduct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Check if form has changes
  const hasChanges =
    originalProduct &&
    (form.name !== originalProduct.name ||
      form.slug !== originalProduct.slug ||
      form.description !== (originalProduct.description || "") ||
      form.price !== originalProduct.price ||
      form.sku !== originalProduct.sku ||
      form.unit !== originalProduct.unit ||
      form.imageUrl !== (originalProduct.imageUrl || undefined) ||
      form.isAvailable !== originalProduct.isAvailable ||
      form.categoryId !== originalProduct.categoryId ||
      form.brandId !== (originalProduct.brandId || ""));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasChanges || !id) return;

    setSaving(true);
    try {
      const payload: UpdateProductDto = {
        name: form.name,
        slug: form.slug,
        description: form.description,
        price: form.price,
        sku: form.sku,
        unit: form.unit,
        isAvailable: form.isAvailable,
        categoryId: form.categoryId,
        brandId: form.brandId || undefined,
        // Only include imageUrl if it has a value
        ...(form.imageUrl &&
          form.imageUrl.trim() !== "" && { imageUrl: form.imageUrl }),
      };
      await productService.updateProduct(id, payload);
      message.success("Product updated successfully");
      navigate("/products");
    } catch (error) {
      console.error("Product update failed:", error);
      message.error("Failed to update product");
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
    <div style={{ padding: 24 }}>
      <h2 style={{ margin: 0, marginBottom: 16 }}>Edit Product</h2>
      <form onSubmit={onSubmit} style={{ maxWidth: 720 }}>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <label>
            <div>Name</div>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={inputStyle()}
              required
            />
          </label>
          <label>
            <div>Slug</div>
            <input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              style={inputStyle()}
              required
            />
          </label>
          <label>
            <div>SKU</div>
            <input
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              style={inputStyle()}
              required
            />
          </label>
          <label>
            <div>Price</div>
            <input
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) =>
                setForm({ ...form, price: e.target.value || "0" })
              }
              style={inputStyle()}
              required
            />
          </label>
          <label>
            <div>Unit</div>
            <select
              value={form.unit}
              onChange={(e) =>
                setForm({ ...form, unit: e.target.value as ProductUnit })
              }
              style={inputStyle()}
              required
            >
              <option value="PIECE">Piece</option>
              <option value="KG">Kilogram</option>
              <option value="GRAM">Gram</option>
              <option value="LITER">Liter</option>
              <option value="ML">Milliliter</option>
              <option value="METER">Meter</option>
              <option value="CM">Centimeter</option>
              <option value="BOX">Box</option>
              <option value="PACK">Pack</option>
            </select>
          </label>
          <label>
            <div>Category</div>
            <select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              style={inputStyle()}
              required
              disabled={loadingCategories}
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <div>Brand</div>
            <select
              value={form.brandId ?? ""}
              onChange={(e) =>
                setForm({ ...form, brandId: e.target.value || "" })
              }
              style={inputStyle()}
              required
              disabled={loadingBrands}
            >
              <option value="">Select a brand</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <div>Image URL</div>
            <input
              value={form.imageUrl ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  imageUrl: e.target.value || undefined,
                })
              }
              style={inputStyle()}
            />
          </label>
          <label>
            <div>Available</div>
            <select
              value={form.isAvailable.toString()}
              onChange={(e) =>
                setForm({
                  ...form,
                  isAvailable: e.target.value === "true",
                })
              }
              style={inputStyle()}
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            <div>Description</div>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              style={{ ...inputStyle(), minHeight: 80 }}
              required
            />
          </label>
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <button
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
