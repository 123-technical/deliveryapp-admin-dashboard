import { useEffect, useState } from "react";
import { Button, Table, Popconfirm, Form, Input, App } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, EnvironmentFilled } from "@ant-design/icons";
import { warehouseService } from "../services/warehouses";
import type { Warehouse } from "../types/warehouse";
import DrawerForm from "../components/DrawerForm";
import MapPicker, { type PickedLocation } from "../components/maps/MapPicker";

const coordValidator = (v: unknown, max: number, label: string) =>
  v == null || (typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= max)
    ? Promise.resolve()
    : Promise.reject(new Error(`${label} is out of range`));

const Warehouses = () => {
  const { message } = App.useApp();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);

  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // Bumped on every open so the map picker remounts with the right initial pin.
  const [pickerKey, setPickerKey] = useState(0);
  const [form] = Form.useForm();

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const data = await warehouseService.getWarehouses();
      setWarehouses(data);
    } catch {
      message.error("Failed to fetch warehouses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAddDrawer = () => {
    form.resetFields();
    form.setFieldsValue({ latitude: null, longitude: null });
    setEditingWarehouse(null);
    setPickerKey((k) => k + 1);
    setDrawerOpen(true);
  };

  const openEditDrawer = (warehouse: Warehouse) => {
    form.setFieldsValue({
      name: warehouse.name,
      location: warehouse.location,
      latitude: warehouse.latitude ?? null,
      longitude: warehouse.longitude ?? null,
    });
    setEditingWarehouse(warehouse);
    setPickerKey((k) => k + 1);
    setDrawerOpen(true);
  };

  const handlePinChange = (picked: PickedLocation | null) => {
    if (!picked) {
      form.setFieldsValue({ latitude: null, longitude: null });
      return;
    }
    form.setFieldsValue({ latitude: picked.lat, longitude: picked.lng });
    // Prefer a real address; only fall back to raw coordinates if the field is still empty.
    if (picked.addressSource !== "coordinates" || !form.getFieldValue("location")) {
      form.setFieldsValue({ location: picked.address });
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingWarehouse(null);
    form.resetFields();
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const dto = {
        name: values.name,
        location: values.location,
        latitude: values.latitude ?? null,
        longitude: values.longitude ?? null,
      };

      if (editingWarehouse) {
        await warehouseService.updateWarehouse(editingWarehouse.id, dto);
        message.success("Warehouse updated successfully");
      } else {
        await warehouseService.createWarehouse(dto);
        message.success("Warehouse created successfully");
      }

      closeDrawer();
      fetchWarehouses();
    } catch (error) {
      if (error instanceof Error) message.error(error.message || "Failed to save warehouse");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (warehouse: Warehouse) => {
    try {
      await warehouseService.deleteWarehouse(warehouse.id);
      message.success("Warehouse deleted successfully");
      fetchWarehouses();
    } catch {
      message.error("Failed to delete warehouse");
    }
  };

  const columns = [
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Location", dataIndex: "location", key: "location" },
    {
      title: "Map Pin",
      key: "pin",
      width: 190,
      render: (_: unknown, record: Warehouse) =>
        record.latitude != null && record.longitude != null ? (
          <span style={{ fontSize: 12, color: "#047857" }}>
            <EnvironmentFilled style={{ marginRight: 4 }} />
            {record.latitude.toFixed(5)}, {record.longitude.toFixed(5)}
          </span>
        ) : (
          <span style={{ fontSize: 12, color: "#94A3B8" }}>Not set</span>
        ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      fixed: "right" as const,
      render: (_: unknown, record: Warehouse) => (
        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
          <Button
            className="ds-action-btn edit"
            icon={<EditOutlined style={{ fontSize: 14 }} />}
            onClick={() => openEditDrawer(record)}
            title="Edit"
          />
          <Popconfirm
            title="Delete Warehouse"
            description="Are you sure you want to delete this warehouse?"
            onConfirm={() => handleDelete(record)}
            okText="Delete"
            cancelText="Cancel"
            okType="danger"
          >
            <Button className="ds-action-btn delete" icon={<DeleteOutlined style={{ fontSize: 14 }} />} title="Delete" />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <div className="ds-page-header">
        <h1 className="ds-page-title">Warehouses</h1>
        <Button icon={<PlusOutlined />} className="ds-btn-primary" onClick={openAddDrawer}>
          Add Warehouse
        </Button>
      </div>

      <div className="ds-table-wrapper">
        <Table
          columns={columns}
          dataSource={warehouses}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} warehouses` }}
          locale={{
            emptyText: (
              <div className="ds-empty">
                <div className="ds-empty-icon">🏬</div>
                <div className="ds-empty-text">No warehouses yet</div>
              </div>
            ),
          }}
        />
      </div>

      <DrawerForm
        isOpen={drawerOpen}
        title={editingWarehouse ? "Edit Warehouse" : "Add Warehouse"}
        onClose={closeDrawer}
        onSubmit={handleSave}
        isSubmitting={saving}
        submitLabel={editingWarehouse ? "Save Changes" : "Create"}
      >
        <Form form={form} layout="vertical" name="warehouseForm">
          <Form.Item
            name="name"
            label="Warehouse Name"
            rules={[{ required: true, message: "Please enter a warehouse name!" }]}
          >
            <Input placeholder="e.g. Main Warehouse" className="ds-input" />
          </Form.Item>

          <Form.Item
            name="location"
            label="Location"
            rules={[{ required: true, message: "Please enter a location!" }]}
          >
            <Input placeholder="e.g. Vidyanagar, Kasaragod, Kerala" className="ds-input" />
          </Form.Item>

          <Form.Item
            label="Map Pin"
            extra="Search or drag the map — the pin in the middle marks the warehouse. Picking a place fills Location."
          >
            {drawerOpen && (
              <MapPicker
                key={pickerKey}
                value={
                  editingWarehouse?.latitude != null && editingWarehouse?.longitude != null
                    ? { lat: editingWarehouse.latitude, lng: editingWarehouse.longitude }
                    : null
                }
                initialAddress={editingWarehouse?.location}
                onChange={handlePinChange}
              />
            )}
          </Form.Item>

          <Form.Item name="latitude" hidden rules={[{ validator: (_, v) => coordValidator(v, 90, "Latitude") }]}>
            <Input />
          </Form.Item>
          <Form.Item name="longitude" hidden rules={[{ validator: (_, v) => coordValidator(v, 180, "Longitude") }]}>
            <Input />
          </Form.Item>
        </Form>
      </DrawerForm>
    </div>
  );
};

export default Warehouses;
