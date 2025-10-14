import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { ProductUnit, CreateProductDto } from "../types/product";
import { productService } from "../services/products";
import { categoryService } from "../services/categories";
import type { Category } from "../types/category";

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

export default function ProductAdd() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [form, setForm] = useState<CreateProductDto>({
    name: "",
    slug: "",
    description: "",
    price: 0,
    sku: "",
    unit: "PIECE" as ProductUnit,
    imageUrl: null,
    isAvailable: true,
    categoryId: "",
    subCategoryId: "",
    brandId: null,
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

    fetchCategories();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: CreateProductDto = {
        name: form.name,
        slug: form.slug,
        description: form.description,
        price: form.price.toString(), // Convert to string for decimal validation
        sku: form.sku,
        unit: form.unit,
        isAvailable: form.isAvailable,
        categoryId: form.categoryId,
        // Only include imageUrl if it has a value
        ...(form.imageUrl && { imageUrl: form.imageUrl }),
        // Only include brandId if it has a value
        ...(form.brandId &&
          form.brandId.trim() !== "" && { brandId: form.brandId }),
      };
      console.log("Form data before submission:", form);
      console.log("Selected category ID:", form.categoryId);
      console.log("Payload being sent:", payload);
      await productService.createProduct(payload);
      navigate("/products");
    } catch (error) {
      console.error("Product creation failed:", error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ margin: 0, marginBottom: 16 }}>Add Product</h2>
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
                setForm({ ...form, price: Number(e.target.value) })
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
            <div>Sub Category ID (UUID)</div>
            <input
              value={form.subCategoryId}
              onChange={(e) =>
                setForm({ ...form, subCategoryId: e.target.value })
              }
              style={inputStyle()}
              placeholder="e.g., 123e4567-e89b-12d3-a456-426614174001"
              required
            />
          </label>
          <label>
            <div>Brand ID</div>
            <input
              value={form.brandId ?? ""}
              onChange={(e) =>
                setForm({ ...form, brandId: e.target.value || null })
              }
              style={inputStyle()}
            />
          </label>
          <label>
            <div>Image URL</div>
            <input
              value={form.imageUrl ?? ""}
              onChange={(e) =>
                setForm({ ...form, imageUrl: e.target.value || null })
              }
              style={inputStyle()}
            />
          </label>
          <label>
            <div>Available</div>
            <select
              value={form.isAvailable.toString()}
              onChange={(e) =>
                setForm({ ...form, isAvailable: e.target.value === "true" })
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
          <button type="submit" style={buttonStyle()} disabled={saving}>
            Save
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
