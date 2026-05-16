import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Image,
  Typography,
  Tag,
  App,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { productService } from "../services/products";
import { useAuth } from "../contexts/AuthContext";
import type { Product } from "../types/product";

const { Title } = Typography;
const { Search } = Input;

const Products = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { message } = App.useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Debounce the search input to provide instant search without overloading the backend
  useEffect(() => {
    const handler = setTimeout(() => {
      if (search !== searchInput) {
        setSearch(searchInput);
        setPage(1);
      }
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchInput, search]);

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await productService.getProducts({
        page,
        pageSize,
        search: search || undefined,
      });
      setProducts(response.data);
      setTotal(response.total);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      message.error("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDelete = async (id: string) => {
    try {
      await productService.deleteProduct(id);
      message.success("Product deleted successfully");
      fetchProducts();
    } catch (error) {
      console.error("Failed to delete product:", error);
      message.error("Failed to delete product");
    }
  };

  const handleViewDetails = (product: Product) => {
    navigate(`/product/detail/${product.id}`);
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 100,
      render: (id: string) => (
        <Typography.Text
          copyable={{ text: id }}
          style={{ fontFamily: "monospace", fontSize: "12px" }}
        >
          {id.substring(0, 8)}...
        </Typography.Text>
      ),
    },
    {
      title: "Image",
      key: "imageUrl",
      width: 80,
      render: (_: unknown, record: Product) => {
        const src = record.imageUrls?.[0];
        return src ? (
          <Image
            width={60}
            height={60}
            src={src}
            style={{ borderRadius: 4, objectFit: "cover" }}
            fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Crect width='60' height='60' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='10'%3ENo img%3C/text%3E%3C/svg%3E"
          />
        ) : (
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 4,
              background: "#e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              color: "#9ca3af",
            }}
          >
            No img
          </div>
        );
      },
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      sorter: (a: Product, b: Product) => a.name.localeCompare(b.name),
      render: (name: string, record: Product) => (
        <Button
          type="link"
          onClick={() => handleViewDetails(record)}
          style={{ padding: 0, height: "auto" }}
        >
          {name}
        </Button>
      ),
    },
    // {
    //   title: "Slug",
    //   dataIndex: "slug",
    //   key: "slug",
    //   sorter: (a: Product, b: Product) => a.slug.localeCompare(b.slug),
    //   render: (slug: string) => (
    //     <Typography.Text code style={{ fontSize: "12px" }}>
    //       {slug}
    //     </Typography.Text>
    //   ),
    // },
    // {
    //   title: "SKU",
    //   dataIndex: "sku",
    //   key: "sku",
    //   sorter: (a: Product, b: Product) => a.sku.localeCompare(b.sku),
    //   render: (sku: string) => (
    //     <Typography.Text style={{ fontFamily: "monospace", fontSize: "12px" }}>
    //       {sku}
    //     </Typography.Text>
    //   ),
    // },
    {
      title: "Price",
      dataIndex: "price",
      key: "price",
      width: 120,
      sorter: (a: Product, b: Product) =>
        parseFloat(a.price) - parseFloat(b.price),
      render: (price: string) => `₹${parseFloat(price).toFixed(2)}`,
    },
    {
      title: "Unit",
      dataIndex: "unit",
      key: "unit",
      width: 100,
      render: (unit: string) => (
        <Tag color="blue" style={{ margin: 0 }}>
          {unit}
        </Tag>
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (description: string) => description || "-",
    },
    // {
    //   title: "Category ID",
    //   dataIndex: "categoryId",
    //   key: "categoryId",
    //   width: 100,
    //   render: (categoryId: string) => (
    //     <Typography.Text
    //       copyable={{ text: categoryId }}
    //       style={{ fontFamily: "monospace", fontSize: "12px" }}
    //     >
    //       {categoryId.substring(0, 8)}...
    //     </Typography.Text>
    //   ),
    // },
    // {
    //   title: "Sub Category ID",
    //   dataIndex: "subCategoryId",
    //   key: "subCategoryId",
    //   width: 120,
    //   render: (subCategoryId: string) =>
    //     subCategoryId ? (
    //       <Typography.Text
    //         copyable={{ text: subCategoryId }}
    //         style={{ fontFamily: "monospace", fontSize: "12px" }}
    //       >
    //         {subCategoryId.substring(0, 8)}...
    //       </Typography.Text>
    //     ) : (
    //       <Typography.Text type="secondary">-</Typography.Text>
    //     ),
    // },
    // {
    //   title: "Brand ID",
    //   dataIndex: "brandId",
    //   key: "brandId",
    //   width: 100,
    //   render: (brandId: string | null) =>
    //     brandId ? (
    //       <Typography.Text
    //         copyable={{ text: brandId }}
    //         style={{ fontFamily: "monospace", fontSize: "12px" }}
    //       >
    //         {brandId.substring(0, 8)}...
    //       </Typography.Text>
    //     ) : (
    //       <Typography.Text type="secondary">-</Typography.Text>
    //     ),
    // },
    {
      title: "Available",
      dataIndex: "isAvailable",
      key: "isAvailable",
      width: 120,
      render: (isAvailable: boolean) => (
        <Tag color={isAvailable ? "green" : "red"}>
          {isAvailable ? "Available" : "Unavailable"}
        </Tag>
      ),
      filters: [
        { text: "Available", value: true },
        { text: "Unavailable", value: false },
      ],
      onFilter: (value: boolean | React.Key, record: Product) =>
        record.isAvailable === value,
    },
    {
      title: "Status",
      key: "status",
      width: 100,
      render: (_: unknown, record: Product) => (
        <Typography.Text
          type={record.deletedAt ? "danger" : "success"}
          style={{ fontWeight: 500 }}
        >
          {record.deletedAt ? "Deleted" : "Active"}
        </Typography.Text>
      ),
    },
    // {
    //   title: "Created At",
    //   dataIndex: "createdAt",
    //   key: "createdAt",
    //   width: 150,
    //   render: (date: string) => new Date(date).toLocaleString(),
    //   sorter: (a: Product, b: Product) =>
    //     new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    // },
    // {
    //   title: "Updated At",
    //   dataIndex: "updatedAt",
    //   key: "updatedAt",
    //   width: 150,
    //   render: (date: string) => new Date(date).toLocaleString(),
    //   sorter: (a: Product, b: Product) =>
    //     new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
    // },
    // {
    //   title: "Deleted At",
    //   dataIndex: "deletedAt",
    //   key: "deletedAt",
    //   width: 150,
    //   render: (date: string | null) =>
    //     date ? new Date(date).toLocaleString() : "-",
    //   sorter: (a: Product, b: Product) => {
    //     if (!a.deletedAt && !b.deletedAt) return 0;
    //     if (!a.deletedAt) return 1;
    //     if (!b.deletedAt) return -1;
    //     return (
    //       new Date(a.deletedAt).getTime() - new Date(b.deletedAt).getTime()
    //     );
    //   },
    // },
    {
      title: "Actions",
      key: "actions",
      width: 150,
      fixed: "right" as const,
      render: (_: unknown, record: Product) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/product/edit/${record.id}`)}
            disabled={!isAdmin || !!record.deletedAt}
            title={!isAdmin ? "You do not have permission to edit products" : undefined}
          >
            Edit
          </Button>
          <Button
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
            disabled={!isAdmin || !!record.deletedAt}
            title={!isAdmin ? "You do not have permission to delete products" : undefined}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <div
        style={{
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Title level={2} style={{ margin: 0 }}>
          Products Management
        </Title>
        <Space>
          <Input
            placeholder="Search products (name, SKU)..."
            allowClear
            prefix={<SearchOutlined style={{ color: "rgba(0,0,0,.45)" }} />}
            size="large"
            style={{ width: 300 }}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate("/product/add")}
            disabled={!isAdmin}
            title={!isAdmin ? "You do not have permission to add products" : undefined}
          >
            Add Product
          </Button>
        </Space>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={products}
          rowKey="id"
          loading={loading}
          scroll={{ x: 2000 }}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} products`,
            onChange: (page, pageSize) => {
              setPage(page);
              setPageSize(pageSize);
            },
          }}
        />
      </Card>
    </div>
  );
};

export default Products;
