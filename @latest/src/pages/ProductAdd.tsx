import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Product } from "../types/product";
import { createProduct } from "../services/products";

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
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
      await createProduct(payload);
      navigate("/products");
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
