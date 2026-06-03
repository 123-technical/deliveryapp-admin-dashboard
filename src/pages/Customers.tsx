import { useMemo, useState } from "react";
import {
  Button,
  DatePicker,
  Input,
  Select,
  Table,
  Modal,
  message,
  type TableColumnsType,
  App,
} from "antd";
import { PlusOutlined, EditOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import type {
  Customer,
  CustomerStatus,
  CustomersQuery,
  CustomersResponse,
  CreateUserDto,
} from "../types/customer";
import { fetchCustomers, updateCustomerStatus, createUser } from "../services/customers";
import DrawerForm from "../components/DrawerForm";
import StatusBadge from "../components/StatusBadge";
import CopyableId from "../components/CopyableId";

const { RangePicker } = DatePicker;

// ─── Form state ───────────────────────────────────────────────────────────────
const defaultForm = {
  username: "",
  mobile: "",
  password: "",
  email: "",
  name: "",
};

export default function Customers() {
  const { message: msg } = App.useApp();
  const [search, setSearch] = useState<string>("");
  const [status, setStatus] = useState<CustomerStatus | "all">("all");
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sorter, setSorter] = useState<{
    sortBy?: keyof Customer;
    sortOrder?: "ascend" | "descend";
  }>({});

  // ── Drawer state ──
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [formErrors, setFormErrors] = useState<Partial<typeof defaultForm>>({});

  const queryClient = useQueryClient();
  const [modal, modalContextHolder] = Modal.useModal();

  const queryParams: CustomersQuery = useMemo(
    () => ({
      page,
      pageSize,
      search: search || undefined,
      status: status === "all" ? undefined : status,
      startDate: range?.[0]?.toISOString(),
      endDate: range?.[1]?.toISOString(),
      sortBy: sorter.sortBy,
      sortOrder: sorter.sortOrder,
    }),
    [page, pageSize, search, status, range, sorter]
  );

  const { data, isFetching } = useQuery<CustomersResponse>({
    queryKey: ["customers", queryParams],
    queryFn: () => fetchCustomers(queryParams),
    placeholderData: (prev) => prev,
    staleTime: 5_000,
  });

  const mutation = useMutation({
    mutationFn: ({ id, newStatus }: { id: string; newStatus: CustomerStatus }) =>
      updateCustomerStatus(id, newStatus),
    onMutate: async ({ id, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: ["customers"] });
      const previous = queryClient.getQueriesData<CustomersResponse>({
        queryKey: ["customers"],
      }) as [QueryKey, CustomersResponse | undefined][];
      previous.forEach(([key, value]) => {
        if (!value) return;
        queryClient.setQueryData<CustomersResponse>(key, {
          ...value,
          data: value.data.map((c) => (c.id === id ? { ...c, status: newStatus } : c)),
        });
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      (ctx?.previous as [QueryKey, CustomersResponse | undefined][])?.forEach(
        ([key, value]) => queryClient.setQueryData(key, value)
      );
      message.error("Failed to update status");
    },
    onSuccess: () => { message.success("Status updated"); },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: ["customers"] }); },
  });

  const confirmChange = (record: Customer, next: CustomerStatus) => {
    const displayName = record.name || record.username || record.email || "Customer";
    modal.confirm({
      title: "Change customer status?",
      content: `Are you sure you want to change ${displayName}'s status to ${next}?`,
      okText: "Confirm",
      cancelText: "Cancel",
      zIndex: 2000,
      onOk: () => mutation.mutate({ id: record.id, newStatus: next }),
    });
  };

  // ── Drawer helpers ──
  const openAddDrawer = () => {
    setEditingCustomer(null);
    setForm(defaultForm);
    setFormErrors({});
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (customer: Customer) => {
    setEditingCustomer(customer);
    setForm({
      username: customer.username || "",
      mobile: customer.mobile || "",
      password: "",
      email: customer.email || "",
      name: customer.name || "",
    });
    setFormErrors({});
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (saving) return;
    setIsDrawerOpen(false);
    setEditingCustomer(null);
    setForm(defaultForm);
    setFormErrors({});
  };

  const validate = () => {
    const errors: Partial<typeof defaultForm> = {};
    if (!form.username || form.username.length < 3)
      errors.username = "Username must be at least 3 characters";
    if (!form.mobile || !/^[0-9]+$/.test(form.mobile) || form.mobile.length < 10)
      errors.mobile = "Enter a valid 10-digit mobile number";
    if (!editingCustomer && (!form.password || form.password.length < 6))
      errors.password = "Password must be at least 6 characters";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errors.email = "Enter a valid email";
    if (form.name && form.name.length < 2)
      errors.name = "Name must be at least 2 characters";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editingCustomer) {
        // Use the updateCustomerStatus endpoint or a direct PUT for field updates
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
        const token = localStorage.getItem("token");
        const payload: Record<string, string> = {
          username: form.username,
          mobile: form.mobile,
        };
        if (form.email) payload.email = form.email;
        if (form.name) payload.name = form.name;
        const res = await fetch(`${API_BASE_URL}/api/v1/users/${editingCustomer.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || "Failed to update customer");
        }
        msg.success("Customer updated successfully");
      } else {
        const payload: CreateUserDto = {
          username: form.username,
          mobile: form.mobile,
          password: form.password,
          ...(form.email ? { email: form.email } : {}),
          ...(form.name ? { name: form.name } : {}),
        };
        await createUser(payload);
        msg.success("Customer created successfully");
      }
      closeDrawer();
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    } catch (error: any) {
      msg.error(error?.message || "Failed to save customer");
    } finally {
      setSaving(false);
    }
  };

  // ── Columns ──
  const columns: TableColumnsType<Customer> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 110,
      fixed: "left",
      render: (id: string) => <CopyableId id={id} />,
      sorter: true,
    },
    {
      title: "Username",
      dataIndex: "username",
      key: "username",
      width: 150,
      ellipsis: true,
      sorter: true,
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      width: 180,
      ellipsis: true,
      render: (name: string | null, record: Customer) => name || record.username || "—",
      sorter: true,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 200,
      ellipsis: true,
      render: (email: string | null) => email || <span style={{ color: "#94A3B8" }}>—</span>,
      sorter: true,
    },
    {
      title: "Mobile",
      dataIndex: "mobile",
      key: "mobile",
      width: 150,
      ellipsis: true,
      sorter: true,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (value: CustomerStatus, record) => (
        <Select<CustomerStatus>
          size="small"
          value={value}
          onChange={(v) => confirmChange(record, v)}
          options={[
            { label: "Active", value: "active" },
            { label: "Blocked", value: "blocked" },
            { label: "Inactive", value: "inactive" },
          ]}
          style={{ minWidth: 120 }}
        />
      ),
    },
    {
      title: "Joined",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 130,
      render: (date: string) => dayjs(date).format("DD MMM YYYY"),
      sorter: true,
    },
    {
      title: "Account",
      dataIndex: "deletedAt",
      key: "deletedAt",
      width: 100,
      render: (date: string | null) => (
        <StatusBadge status={date ? "Deleted" : "ACTIVE"} />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 80,
      fixed: "right" as const,
      render: (_: unknown, record: Customer) => (
        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
          <Button
            className="ds-action-btn edit"
            icon={<EditOutlined style={{ fontSize: 14 }} />}
            onClick={() => openEditDrawer(record)}
            title="Edit Customer"
          />
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      {modalContextHolder}

      {/* Page Header */}
      <div className="ds-page-header">
        <div>
          <h1 className="ds-page-title">Customers</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748B" }}>
            Manage and track all customers in the system
          </p>
        </div>
        <Button
          icon={<PlusOutlined />}
          className="ds-btn-primary"
          onClick={openAddDrawer}
        >
          Add Customer
        </Button>
      </div>

      {/* Filters */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #E2E8F0",
          borderRadius: 12,
          padding: "16px 20px",
          marginBottom: 20,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <Input.Search
          allowClear
          placeholder="Search by ID, username, name, email or mobile"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={() => setPage(1)}
          style={{ width: 320, borderRadius: 8 }}
        />
        <Select<CustomerStatus | "all">
          style={{ width: 150 }}
          value={status}
          onChange={(value) => { setStatus(value); setPage(1); }}
          options={[
            { label: "All Status", value: "all" },
            { label: "Active", value: "active" },
            { label: "Blocked", value: "blocked" },
            { label: "Inactive", value: "inactive" },
          ]}
        />
        <RangePicker
          onChange={(value) => { setRange(value as [Dayjs | null, Dayjs | null] | null); setPage(1); }}
          allowEmpty={[true, true]}
        />
        <Button
          onClick={() => { setSearch(""); setStatus("all"); setRange(null); setPage(1); setSorter({}); }}
        >
          Reset
        </Button>
      </div>

      {/* Table */}
      <div className="ds-table-wrapper">
        <Table<Customer>
          rowKey={(r) => r.id}
          loading={isFetching || mutation.isPending}
          columns={columns}
          dataSource={data?.data || []}
          size="middle"
          scroll={{ x: 1200 }}
          pagination={{
            current: page,
            pageSize,
            total: data?.total || 0,
            responsive: true,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} customers`,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          }}
          onChange={(_pagination, _filters, sorter) => {
            if (!Array.isArray(sorter) && sorter.field && sorter.order) {
              setSorter({ sortBy: sorter.field as keyof Customer, sortOrder: sorter.order });
            } else if (!Array.isArray(sorter) && !sorter.field) {
              setSorter({});
            }
          }}
          locale={{
            emptyText: (
              <div className="ds-empty">
                <div className="ds-empty-icon">👥</div>
                <div className="ds-empty-text">No customers found</div>
              </div>
            ),
          }}
        />
      </div>

      {/* Add / Edit Drawer */}
      <DrawerForm
        isOpen={isDrawerOpen}
        title={editingCustomer ? "Edit Customer" : "Add Customer"}
        onClose={closeDrawer}
        onSubmit={handleSubmit}
        isSubmitting={saving}
        submitLabel={editingCustomer ? "Save Changes" : "Create Customer"}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Username */}
          <div className="ds-field-group">
            <label className="ds-label">
              Username <span style={{ color: "#EF4444" }}>*</span>
            </label>
            <input
              id="customer-username"
              className={`ds-input ${formErrors.username ? "error" : ""}`}
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="Enter username"
            />
            {formErrors.username && (
              <p className="ds-error-text">{formErrors.username}</p>
            )}
          </div>

          {/* Mobile */}
          <div className="ds-field-group">
            <label className="ds-label">
              Mobile <span style={{ color: "#EF4444" }}>*</span>
            </label>
            <input
              id="customer-mobile"
              className={`ds-input ${formErrors.mobile ? "error" : ""}`}
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              placeholder="Enter mobile number"
            />
            {formErrors.mobile && (
              <p className="ds-error-text">{formErrors.mobile}</p>
            )}
          </div>

          {/* Password (only for Add) */}
          {!editingCustomer && (
            <div className="ds-field-group">
              <label className="ds-label">
                Password <span style={{ color: "#EF4444" }}>*</span>
              </label>
              <input
                id="customer-password"
                className={`ds-input ${formErrors.password ? "error" : ""}`}
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Enter password (min 6 characters)"
              />
              {formErrors.password && (
                <p className="ds-error-text">{formErrors.password}</p>
              )}
            </div>
          )}

          {/* Email */}
          <div className="ds-field-group">
            <label className="ds-label">Email</label>
            <input
              id="customer-email"
              className={`ds-input ${formErrors.email ? "error" : ""}`}
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Enter email (optional)"
            />
            {formErrors.email && (
              <p className="ds-error-text">{formErrors.email}</p>
            )}
          </div>

          {/* Name */}
          <div className="ds-field-group">
            <label className="ds-label">Full Name</label>
            <input
              id="customer-name"
              className={`ds-input ${formErrors.name ? "error" : ""}`}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter name (optional)"
            />
            {formErrors.name && (
              <p className="ds-error-text">{formErrors.name}</p>
            )}
          </div>
        </div>
      </DrawerForm>
    </div>
  );
}
