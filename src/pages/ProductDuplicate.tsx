import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Product } from "../types/product";
import { productService } from "../services/products";

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

export default function ProductDuplicate() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [originalProduct, setOriginalProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    slug: "",
    categoryId: "",
    subCategoryId: "",
    price: "",
    unit: "PIECE" as any,
    isAvailable: true,
    description: "",
    brandId: "",
    imageUrl: "",
  });

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;

      setLoading(true);
      try {
        const product = await productService.getProductById(id);
        setOriginalProduct(product);
        // Pre-fill form with original product data, but modify SKU to be numerically close
        const originalSku = product.sku;
        let newSku = originalSku;

        // Try to generate a new SKU by incrementing the numeric part
        const skuMatch = originalSku.match(/^(.+?)(\d+)$/);
        if (skuMatch) {
          const prefix = skuMatch[1];
          const number = parseInt(skuMatch[2]);
          newSku = `${prefix}${number + 1}`;
        } else {
          // If no numeric part, append "1"
          newSku = `${originalSku}1`;
        }

        setForm({
          name: product.name,
          sku: newSku,
          slug: product.slug + "-copy",
          categoryId: product.categoryId,
          subCategoryId: product.subCategoryId || "",
          price: product.price,
          unit: product.unit,
          isAvailable: product.isAvailable,
          description: product.description || "",
          brandId: product.brandId || "",
          imageUrl: product.imageUrl || "",
        });
      } catch (error) {
        console.error("Failed to fetch product:", error);
        setOriginalProduct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // Check if form has changes from the original pre-filled data
  const hasChanges =
    originalProduct &&
    (form.name !== originalProduct.name ||
      form.sku !==
        (() => {
          const originalSku = originalProduct.sku;
          const skuMatch = originalSku.match(/^(.+?)(\d+)$/);
          if (skuMatch) {
            const prefix = skuMatch[1];
            const number = parseInt(skuMatch[2]);
            return `${prefix}${number + 1}`;
          } else {
            return `${originalSku}1`;
          }
        })() ||
      form.slug !== originalProduct.slug + "-copy" ||
      form.categoryId !== originalProduct.categoryId ||
      form.subCategoryId !== (originalProduct.subCategoryId || "") ||
      form.price !== originalProduct.price ||
      form.unit !== originalProduct.unit ||
      form.isAvailable !== originalProduct.isAvailable ||
      form.description !== (originalProduct.description || "") ||
      form.brandId !== (originalProduct.brandId || "") ||
      form.imageUrl !== (originalProduct.imageUrl || ""));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasChanges) return;

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        sku: form.sku,
        slug: form.slug,
        description: form.description,
        price: form.price,
        unit: form.unit,
        isAvailable: form.isAvailable,
        categoryId: form.categoryId || "Uncategorized",
        subCategoryId: form.subCategoryId,
        brandId: form.brandId,
        imageUrl: form.imageUrl,
      };
      await productService.createProduct(payload);
      navigate("/products");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <div>Loading product to duplicate...</div>
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
      <h2 style={{ margin: 0, marginBottom: 16 }}>Duplicate Product</h2>
      <div
        style={{
          background: "#fef3c7",
          padding: 12,
          borderRadius: 8,
          marginBottom: 16,
          border: "1px solid #f59e0b",
        }}
      >
        <div style={{ color: "#92400e", fontSize: 14, fontWeight: 600 }}>
          Duplicating: {originalProduct.name}
        </div>
        <div style={{ color: "#92400e", fontSize: 12, marginTop: 4 }}>
          This will create a new product with a new ID. Make any changes you
          want before saving.
        </div>
      </div>

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
            <div>SKU</div>
            <input
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
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
            <div>Category ID</div>
            <input
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              style={inputStyle()}
            />
          </label>
          <label>
            <div>Subcategory ID</div>
            <input
              value={form.subCategoryId}
              onChange={(e) =>
                setForm({ ...form, subCategoryId: e.target.value })
              }
              style={inputStyle()}
            />
          </label>
          <label>
            <div>Price</div>
            <input
              type="text"
              value={form.price}
              onChange={(e) =>
                setForm({ ...form, price: e.target.value })
              }
              style={inputStyle()}
            />
          </label>
          <label>
            <div>Unit</div>
            <input
              value={form.unit}
              onChange={(e) =>
                setForm({ ...form, unit: e.target.value as any })
              }
              style={inputStyle()}
            />
          </label>
          <label>
            <div>Brand ID</div>
            <input
              value={form.brandId}
              onChange={(e) =>
                setForm({ ...form, brandId: e.target.value })
              }
              style={inputStyle()}
            />
          </label>
          <label>
            <div>Image URL</div>
            <input
              value={form.imageUrl}
              onChange={(e) =>
                setForm({ ...form, imageUrl: e.target.value })
              }
              style={inputStyle()}
            />
          </label>
          <label>
            <div>Availability</div>
            <select
              value={form.isAvailable ? "true" : "false"}
              onChange={(e) =>
                setForm({
                  ...form,
                  isAvailable: e.target.value === "true",
                })
              }
              style={{ ...inputStyle(), height: 38 }}
            >
              <option value="true">Available</option>
              <option value="false">Unavailable</option>
            </select>
          </label>
        </div>

        <label style={{ display: "block", marginTop: 12 }}>
          <div>Description</div>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            style={{ ...inputStyle(), minHeight: 80 }}
          />
        </label>

        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <button
            type="submit"
            style={buttonStyle(!hasChanges || saving)}
            disabled={!hasChanges || saving}
          >
            {saving ? "Creating Duplicate..." : "Create Duplicate"}
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
