import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import type { Product } from "../types/product";
import { productService } from "../services/products";

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

function StatusPill({ value }: { value: Product["status"] }) {
  const colors = {
    active: { bg: "#ecfdf5", color: "#065f46" },
    inactive: { bg: "#f3f4f6", color: "#6b7280" },
    out_of_stock: { bg: "#fee2e2", color: "#b91c1c" },
  };
  const { bg, color } = colors[value];
  return (
    <span
      style={{
        padding: "4px 12px",
        borderRadius: 999,
        background: bg,
        color,
        fontSize: 12,
        textTransform: "capitalize",
        fontWeight: 600,
      }}
    >
      {value.replace("_", " ")}
    </span>
  );
}

function StockPill({ value }: { value: Product["stockStatus"] }) {
  const colors = {
    in_stock: { bg: "#ecfdf5", color: "#065f46" },
    low_stock: { bg: "#fef3c7", color: "#b45309" },
    out_of_stock: { bg: "#fee2e2", color: "#b91c1c" },
  };
  const { bg, color } = colors[value];
  return (
    <span
      style={{
        padding: "4px 12px",
        borderRadius: 999,
        background: bg,
        color,
        fontSize: 12,
        textTransform: "capitalize",
        fontWeight: 600,
      }}
    >
      {value.replace("_", " ")}
    </span>
  );
}

export default function ProductDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;

      setLoading(true);
      try {
        const productData = await productService.getProductById(id);
        setProduct(productData);
      } catch (error) {
        console.error("Failed to fetch product:", error);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  async function handleDelete() {
    if (!product) return;

    setDeleting(true);
    try {
      await productService.deleteProduct(product.id);
      navigate("/products");
    } catch (error) {
      console.error("Failed to delete product:", error);
      alert("Failed to delete product. Please try again.");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <div>Loading product details...</div>
      </div>
    );
  }

  if (!product) {
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1 style={{ margin: 0 }}>Product Details</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            style={buttonStyle()}
            onClick={() => navigate(`/product/edit/${product.id}`)}
          >
            Edit Product
          </button>
          <button
            style={{
              ...buttonStyle(),
              background: "#ef4444",
              color: "#fff",
              borderColor: "#ef4444",
            }}
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete Product
          </button>
          <button
            style={{
              ...buttonStyle(),
              background: "#f3f4f6",
              color: "#111827",
              borderColor: "#e5e7eb",
            }}
            onClick={() => navigate("/products")}
          >
            Back to Products
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Left Column - Basic Info */}
        <div>
          <div
            style={{
              background: "#fff",
              padding: 20,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              marginBottom: 16,
            }}
          >
            <h3 style={{ margin: "0 0 16px 0", color: "#111827" }}>
              Basic Information
            </h3>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label
                  style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}
                >
                  Product Name
                </label>
                <div
                  style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}
                >
                  {product.name}
                </div>
              </div>
              <div>
                <label
                  style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}
                >
                  SKU
                </label>
                <div style={{ fontSize: 14, color: "#111827" }}>
                  {product.sku}
                </div>
              </div>
              <div>
                <label
                  style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}
                >
                  Brand
                </label>
                <div style={{ fontSize: 14, color: "#111827" }}>
                  {product.brand || "—"}
                </div>
              </div>
              <div>
                <label
                  style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}
                >
                  Category
                </label>
                <div style={{ fontSize: 14, color: "#111827" }}>
                  {product.category}
                </div>
              </div>
              <div>
                <label
                  style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}
                >
                  Subcategory
                </label>
                <div style={{ fontSize: 14, color: "#111827" }}>
                  {product.subcategory || "—"}
                </div>
              </div>
              <div>
                <label
                  style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}
                >
                  Description
                </label>
                <div
                  style={{ fontSize: 14, color: "#111827", lineHeight: 1.5 }}
                >
                  {product.description || "—"}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              background: "#fff",
              padding: 20,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
            }}
          >
            <h3 style={{ margin: "0 0 16px 0", color: "#111827" }}>Pricing</h3>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label
                  style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}
                >
                  Regular Price
                </label>
                <div
                  style={{ fontSize: 18, fontWeight: 600, color: "#111827" }}
                >
                  ${product.regularPrice}
                </div>
              </div>
              {product.salePrice && (
                <div>
                  <label
                    style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}
                  >
                    Sale Price
                  </label>
                  <div
                    style={{ fontSize: 18, fontWeight: 600, color: "#dc2626" }}
                  >
                    ${product.salePrice}
                  </div>
                </div>
              )}
              {product.pricingTiers && product.pricingTiers.length > 0 && (
                <div>
                  <label
                    style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}
                  >
                    Bulk Pricing
                  </label>
                  <div style={{ fontSize: 14, color: "#111827" }}>
                    {product.pricingTiers.map((tier, index) => (
                      <div key={index} style={{ marginBottom: 4 }}>
                        {tier.minQty}+ units: ${tier.price}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Status & Inventory */}
        <div>
          <div
            style={{
              background: "#fff",
              padding: 20,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              marginBottom: 16,
            }}
          >
            <h3 style={{ margin: "0 0 16px 0", color: "#111827" }}>
              Status & Inventory
            </h3>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label
                  style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}
                >
                  Product Status
                </label>
                <div style={{ marginTop: 4 }}>
                  <StatusPill value={product.status} />
                </div>
              </div>
              <div>
                <label
                  style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}
                >
                  Stock Status
                </label>
                <div style={{ marginTop: 4 }}>
                  <StockPill value={product.stockStatus} />
                </div>
              </div>
              <div>
                <label
                  style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}
                >
                  Stock Quantity
                </label>
                <div
                  style={{ fontSize: 18, fontWeight: 600, color: "#111827" }}
                >
                  {product.stockQty}
                </div>
              </div>
              <div>
                <label
                  style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}
                >
                  Last Modified
                </label>
                <div style={{ fontSize: 14, color: "#111827" }}>
                  {dayjs(product.lastModifiedAt).format("YYYY-MM-DD HH:mm")}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              background: "#fff",
              padding: 20,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
            }}
          >
            <h3 style={{ margin: "0 0 16px 0", color: "#111827" }}>
              Additional Details
            </h3>
            <div style={{ display: "grid", gap: 12 }}>
              {product.weightKg && (
                <div>
                  <label
                    style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}
                  >
                    Weight
                  </label>
                  <div style={{ fontSize: 14, color: "#111827" }}>
                    {product.weightKg} kg
                  </div>
                </div>
              )}
              {product.dimensionsCm && (
                <div>
                  <label
                    style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}
                  >
                    Dimensions
                  </label>
                  <div style={{ fontSize: 14, color: "#111827" }}>
                    {product.dimensionsCm.length} × {product.dimensionsCm.width}{" "}
                    × {product.dimensionsCm.height} cm
                  </div>
                </div>
              )}
              <div>
                <label
                  style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}
                >
                  Fragile
                </label>
                <div style={{ fontSize: 14, color: "#111827" }}>
                  {product.fragile ? "Yes" : "No"}
                </div>
              </div>
              {product.barcode && (
                <div>
                  <label
                    style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}
                  >
                    Barcode
                  </label>
                  <div
                    style={{
                      fontSize: 14,
                      color: "#111827",
                      fontFamily: "monospace",
                    }}
                  >
                    {product.barcode}
                  </div>
                </div>
              )}
              {product.supplier && (
                <div>
                  <label
                    style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}
                  >
                    Supplier
                  </label>
                  <div style={{ fontSize: 14, color: "#111827" }}>
                    {product.supplier}
                  </div>
                </div>
              )}
              {product.vendor && (
                <div>
                  <label
                    style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}
                  >
                    Vendor
                  </label>
                  <div style={{ fontSize: 14, color: "#111827" }}>
                    {product.vendor}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Product Image */}
      {product.thumbnailUrl && (
        <div
          style={{
            background: "#fff",
            padding: 20,
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            marginTop: 16,
          }}
        >
          <h3 style={{ margin: "0 0 16px 0", color: "#111827" }}>
            Product Image
          </h3>
          <img
            src={product.thumbnailUrl}
            alt={product.name}
            style={{
              width: 200,
              height: 200,
              objectFit: "cover",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
            }}
          />
        </div>
      )}

      {/* Tags */}
      {product.tags && product.tags.length > 0 && (
        <div
          style={{
            background: "#fff",
            padding: 20,
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            marginTop: 16,
          }}
        >
          <h3 style={{ margin: "0 0 16px 0", color: "#111827" }}>Tags</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {product.tags.map((tag, index) => (
              <span
                key={index}
                style={{
                  padding: "4px 8px",
                  background: "#f3f4f6",
                  color: "#374151",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: 24,
              borderRadius: 12,
              maxWidth: 400,
              width: "90%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h3 style={{ margin: "0 0 16px 0", color: "#111827" }}>
              Delete Product
            </h3>
            <p
              style={{
                margin: "0 0 20px 0",
                color: "#6b7280",
                lineHeight: 1.5,
              }}
            >
              Are you sure you want to delete <strong>{product?.name}</strong>?
              This action cannot be undone and will permanently remove the
              product from your inventory.
            </p>
            <div
              style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
            >
              <button
                style={{
                  ...buttonStyle(),
                  background: "#f3f4f6",
                  color: "#111827",
                  borderColor: "#e5e7eb",
                }}
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                style={{
                  ...buttonStyle(),
                  background: "#ef4444",
                  color: "#fff",
                  borderColor: "#ef4444",
                }}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
