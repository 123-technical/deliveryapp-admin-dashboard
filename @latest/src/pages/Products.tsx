import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import type { Product } from "../types/product";
import { productService } from "../services/products";

type SortOrder = "ascend" | "descend" | undefined;

function buttonStyle(
  variant: "primary" | "secondary" | "danger" | "ghost" = "secondary",
  size: "sm" | "md" = "md",
  disabled?: boolean
) {
  const base = {
    borderWidth: 1,
    borderStyle: "solid" as const,
    borderRadius: 8,
    padding: size === "sm" ? "6px 10px" : "8px 14px",
    fontSize: size === "sm" ? 12 : 14,
    lineHeight: 1.2,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    background: "#ffffff",
    color: "#111827",
    borderColor: "#e5e7eb",
    transition:
      "background 120ms ease, color 120ms ease, border-color 120ms ease",
  };
  if (variant === "primary") {
    // Indigo primary
    return {
      ...base,
      background: "#4f46e5",
      color: "#ffffff",
      borderColor: "#4f46e5",
    };
  }
  if (variant === "danger") {
    // Brighter red
    return {
      ...base,
      background: "#ef4444",
      color: "#ffffff",
      borderColor: "#ef4444",
    };
  }
  if (variant === "ghost") {
    // Link-style indigo
    return {
      ...base,
      background: "transparent",
      borderColor: "transparent",
      color: "#4f46e5",
    };
  }
  // Secondary: soft gray
  return {
    ...base,
    background: "#f9fafb",
    color: "#111827",
    borderColor: "#e5e7eb",
  };
}

export default function Products() {
  const navigate = useNavigate();
  const [data, setData] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<keyof Product | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>(undefined);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await productService.getProducts({
          page,
          pageSize,
          search,
          sortBy,
          sortOrder,
        });
        if (!cancelled) {
          setData(res.data);
          setTotal(res.total);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, search, sortBy, sortOrder]);

  const allSelectedOnPage = useMemo(() => {
    if (!data || data.length === 0) return false;
    return data.every((r) => selectedIds.includes(r.id));
  }, [data, selectedIds]);

  function toggleSelectAllCurrentPage() {
    if (allSelectedOnPage) {
      const remaining = selectedIds.filter(
        (id) => !data?.some((r) => r.id === id)
      );
      setSelectedIds(remaining);
    } else {
      const merged = Array.from(
        new Set([...selectedIds, ...(data?.map((r) => r.id) || [])])
      );
      setSelectedIds(merged);
    }
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function headerSort(key: keyof Product) {
    if (sortBy !== key) {
      setSortBy(key);
      setSortOrder("ascend");
      return;
    }
    if (sortOrder === "ascend") {
      setSortOrder("descend");
      return;
    }
    if (sortOrder === "descend") {
      setSortBy(undefined);
      setSortOrder(undefined);
      return;
    }
    setSortOrder("ascend");
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <input
          placeholder="Search products (name, SKU, category, brand)"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          style={{
            padding: "8px 12px",
            width: 360,
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            outline: "none",
            background: "#fff",
            color: "#111827",
            fontSize: 14,
            transition: "border-color 120ms ease, box-shadow 120ms ease",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "#4f46e5";
            e.target.style.boxShadow = "0 0 0 3px rgba(79, 70, 229, 0.1)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#e5e7eb";
            e.target.style.boxShadow = "none";
          }}
        />
        <div>
          <button
            style={buttonStyle("secondary", "md", loading)}
            onClick={() => setPage(1)}
            disabled={loading}
          >
            Refresh
          </button>
          <button
            style={{
              ...buttonStyle("secondary", "md", selectedIds.length === 0),
              marginLeft: 8,
            }}
            disabled={selectedIds.length === 0}
          >
            Bulk Actions
          </button>
          <button
            style={{ ...buttonStyle("primary"), marginLeft: 8 }}
            onClick={() => navigate("/product/add")}
          >
            Add Product
          </button>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "left",
                  padding: 8,
                  borderBottom: "1px solid #eee",
                }}
              >
                <input
                  type="checkbox"
                  checked={allSelectedOnPage}
                  onChange={toggleSelectAllCurrentPage}
                />
              </th>
              <Th
                label="Product"
                onClick={() => headerSort("name")}
                active={sortBy === "name"}
                order={sortOrder}
              />
              <Th
                label="SKU"
                onClick={() => headerSort("sku")}
                active={sortBy === "sku"}
                order={sortOrder}
              />
              <Th
                label="Category"
                onClick={() => headerSort("category")}
                active={sortBy === "category"}
                order={sortOrder}
              />
              <Th
                label="Price"
                onClick={() => headerSort("regularPrice")}
                active={sortBy === "regularPrice"}
                order={sortOrder}
              />
              <Th
                label="Stock"
                onClick={() => headerSort("stockQty")}
                active={sortBy === "stockQty"}
                order={sortOrder}
              />
              <Th
                label="Status"
                onClick={() => headerSort("status")}
                active={sortBy === "status"}
                order={sortOrder}
              />
              <Th
                label="Last Modified"
                onClick={() => headerSort("lastModifiedAt")}
                active={sortBy === "lastModifiedAt"}
                order={sortOrder}
              />
              <th
                style={{
                  textAlign: "right",
                  padding: 8,
                  borderBottom: "1px solid #eee",
                }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} style={{ padding: 16 }}>
                  Loading...
                </td>
              </tr>
            )}
            {!loading && (!data || data.length === 0) && (
              <tr>
                <td colSpan={9} style={{ padding: 16 }}>
                  No products found.
                </td>
              </tr>
            )}
            {!loading &&
              data?.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #f3f3f3" }}>
                  <td style={{ padding: 8 }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(p.id)}
                      onChange={() => toggleRow(p.id)}
                    />
                  </td>
                  <td
                    style={{
                      padding: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {p.thumbnailUrl ? (
                      <img
                        src={p.thumbnailUrl}
                        alt={p.name}
                        width={40}
                        height={40}
                        style={{ borderRadius: 4, objectFit: "cover" }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          background: "#eee",
                          borderRadius: 4,
                        }}
                      />
                    )}
                    <div>
                      <div
                        style={{
                          fontWeight: 600,
                          color: "#4f46e5",
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                        onClick={() => navigate(`/product/detail/${p.id}`)}
                      >
                        {p.name}
                      </div>
                      <div style={{ color: "#666", fontSize: 12 }}>
                        {p.brand ?? "—"}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: 8 }}>{p.sku}</td>
                  <td style={{ padding: 8 }}>
                    <div>{p.category}</div>
                    <div style={{ color: "#666", fontSize: 12 }}>
                      {p.subcategory ?? "—"}
                    </div>
                  </td>
                  <td style={{ padding: 8 }}>
                    <div>₹{p.salePrice ?? p.regularPrice}</div>
                    {p.salePrice && (
                      <div
                        style={{
                          color: "#666",
                          fontSize: 12,
                          textDecoration: "line-through",
                        }}
                      >
                        ₹{p.regularPrice}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: 8 }}>
                    <button
                      style={{
                        width: 50,
                        height: 24,
                        borderRadius: 12,
                        border: "none",
                        background: p.stockQty > 0 ? "#4f46e5" : "#e5e7eb",
                        cursor: "pointer",
                        position: "relative",
                        transition: "background 200ms ease",
                      }}
                      onClick={async () => {
                        const newQty = p.stockQty > 0 ? 0 : 10;
                        try {
                          await productService.updateProduct(p.id, {
                            stockQty: newQty,
                            stockStatus:
                              newQty > 0 ? "in_stock" : "out_of_stock",
                          });
                          // Update the local state to show the change
                          setData((prevData) =>
                            prevData.map((item) =>
                              item.id === p.id
                                ? {
                                    ...item,
                                    stockQty: newQty,
                                    stockStatus:
                                      newQty > 0 ? "in_stock" : "out_of_stock",
                                  }
                                : item
                            )
                          );
                        } catch (error) {
                          console.error(
                            "Failed to update product stock:",
                            error
                          );
                        }
                      }}
                    >
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          background: "#fff",
                          position: "absolute",
                          top: 2,
                          left: p.stockQty > 0 ? 28 : 2,
                          transition: "left 200ms ease",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                        }}
                      />
                    </button>
                  </td>
                  <td style={{ padding: 8 }}>
                    <select
                      value={p.status}
                      onChange={async (e) => {
                        const newStatus = e.target.value as Product["status"];
                        try {
                          await productService.updateProduct(p.id, {
                            status: newStatus,
                          });
                          // Update the local state to show the change
                          setData((prevData) =>
                            prevData.map((item) =>
                              item.id === p.id
                                ? { ...item, status: newStatus }
                                : item
                            )
                          );
                        } catch (error) {
                          console.error(
                            "Failed to update product status:",
                            error
                          );
                        }
                      }}
                      style={{
                        padding: "4px 8px",
                        borderRadius: 6,
                        border: "1px solid #e5e7eb",
                        background: "#fff",
                        color: "#111827",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        minWidth: 100,
                      }}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </td>
                  <td style={{ padding: 8 }}>
                    {dayjs(p.lastModifiedAt).format("YYYY-MM-DD HH:mm")}
                  </td>
                  <td style={{ padding: 8, textAlign: "right" }}>
                    <button
                      style={buttonStyle("secondary", "sm")}
                      onClick={() => navigate(`/product/edit/${p.id}`)}
                    >
                      Edit
                    </button>
                    <button
                      style={{ ...buttonStyle("ghost", "sm"), marginLeft: 8 }}
                      onClick={() => navigate(`/product/duplicate/${p.id}`)}
                    >
                      Duplicate
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 12,
        }}
      >
        <div style={{ color: "#666" }}>{selectedIds.length} selected</div>
        <div>
          <select
            value={pageSize}
            onChange={(e) => {
              setPage(1);
              setPageSize(parseInt(e.target.value));
            }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <button
            style={{ ...buttonStyle("secondary"), marginLeft: 8 }}
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Prev
          </button>
          <span style={{ margin: "0 8px" }}>
            Page {page} of {Math.max(1, Math.ceil(total / pageSize))}
          </span>
          <button
            style={buttonStyle("secondary")}
            disabled={page >= Math.ceil(total / pageSize)}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function Th({
  label,
  onClick,
  active,
  order,
}: {
  label: string;
  onClick: () => void;
  active: boolean;
  order: SortOrder;
}) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: 8,
        borderBottom: "1px solid #eee",
        cursor: "pointer",
        userSelect: "none",
      }}
      onClick={onClick}
    >
      {label}{" "}
      {active
        ? order === "ascend"
          ? "▲"
          : order === "descend"
          ? "▼"
          : ""
        : ""}
    </th>
  );
}
