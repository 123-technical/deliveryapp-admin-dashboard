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
    category: "",
    subcategory: "",
    regularPrice: 0,
    salePrice: undefined as number | undefined,
    stockQty: 0,
    status: "active" as Product["status"],
    description: "",
    brand: "",
    tags: [] as string[],
    thumbnailUrl: "",
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
          category: product.category,
          subcategory: product.subcategory || "",
          regularPrice: product.regularPrice,
          salePrice: product.salePrice,
          stockQty: product.stockQty,
          status: product.status,
          description: product.description || "",
          brand: product.brand || "",
          tags: product.tags || [],
          thumbnailUrl: product.thumbnailUrl || "",
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
      form.category !== originalProduct.category ||
      form.subcategory !== (originalProduct.subcategory || "") ||
      form.regularPrice !== originalProduct.regularPrice ||
      form.salePrice !== originalProduct.salePrice ||
      form.stockQty !== originalProduct.stockQty ||
      form.status !== originalProduct.status ||
      form.description !== (originalProduct.description || "") ||
      form.brand !== (originalProduct.brand || "") ||
      form.thumbnailUrl !== (originalProduct.thumbnailUrl || ""));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasChanges) return;

    setSaving(true);
    try {
      const payload: Omit<Product, "id" | "lastModifiedAt" | "stockStatus"> = {
        name: form.name,
        sku: form.sku,
        description: form.description || undefined,
        brand: form.brand || undefined,
        category: form.category || "Uncategorized",
        subcategory: form.subcategory || undefined,
        tags: form.tags.length ? form.tags : undefined,
        thumbnailUrl: form.thumbnailUrl || undefined,
        images: [],
        regularPrice: Number(form.regularPrice) || 0,
        salePrice: form.salePrice ? Number(form.salePrice) : undefined,
        pricingTiers: undefined,
        stockQty: Number(form.stockQty) || 0,
        status: form.status,
        weightKg: undefined,
        dimensionsCm: undefined,
        fragile: false,
        seoTitle: undefined,
        seoDescription: undefined,
        barcode: undefined,
        supplier: undefined,
        vendor: undefined,
        rating: undefined,
        reviewsCount: undefined,
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
            <div>Category</div>
            <input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              style={inputStyle()}
            />
          </label>
          <label>
            <div>Subcategory</div>
            <input
              value={form.subcategory}
              onChange={(e) =>
                setForm({ ...form, subcategory: e.target.value })
              }
              style={inputStyle()}
            />
          </label>
          <label>
            <div>Regular Price</div>
            <input
              type="number"
              step="0.01"
              value={form.regularPrice}
              onChange={(e) =>
                setForm({ ...form, regularPrice: Number(e.target.value) })
              }
              style={inputStyle()}
            />
          </label>
          <label>
            <div>Sale Price</div>
            <input
              type="number"
              step="0.01"
              value={form.salePrice ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  salePrice:
                    e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
              style={inputStyle()}
            />
          </label>
          <label>
            <div>Stock Qty</div>
            <input
              type="number"
              value={form.stockQty}
              onChange={(e) =>
                setForm({ ...form, stockQty: Number(e.target.value) })
              }
              style={inputStyle()}
            />
          </label>
          <label>
            <div>Status</div>
            <select
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: e.target.value as Product["status"],
                })
              }
              style={{ ...inputStyle(), height: 38 }}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="out_of_stock">Out of Stock</option>
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
