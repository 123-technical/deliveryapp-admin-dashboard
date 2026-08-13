import { useEffect, useRef, useState } from "react";
import {
  Button,
  Table,
  Popconfirm,
  Form,
  Input,
  InputNumber,
  Switch,
  Select,
  App,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, CloseOutlined } from "@ant-design/icons";
import { warehouseService } from "../services/warehouses";
import { deliveryZoneService } from "../services/deliveryZones";
import type { Warehouse } from "../types/warehouse";
import type { DeliveryZone } from "../types/deliveryZone";
import DrawerForm from "../components/DrawerForm";
import DeliveryZoneMap, { type DeliveryZoneMapHandle, type DeliveryZoneMapMode } from "../components/DeliveryZoneMap";

// Best-effort geocode of a free-text warehouse address, used only as a
// fallback map center when a warehouse has no zones drawn yet.
async function geocodeAddress(query: string): Promise<{ lat: number; lng: number } | null> {
  if (!query.trim()) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
    );
    const results = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (results.length === 0) return null;
    return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
  } catch {
    return null;
  }
}

const DeliveryZones = () => {
  const { message } = App.useApp();
  const mapRef = useRef<DeliveryZoneMapHandle>(null);

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);

  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loadingZones, setLoadingZones] = useState(false);
  const [centerHint, setCenterHint] = useState<{ lat: number; lng: number } | null>(null);

  const [mapMode, setMapMode] = useState<DeliveryZoneMapMode>("view");
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // ── Load warehouses, auto-select the first one ──
  useEffect(() => {
    (async () => {
      setLoadingWarehouses(true);
      try {
        const data = await warehouseService.getWarehouses();
        setWarehouses(data);
        if (data.length > 0) setSelectedWarehouseId(data[0].id);
      } catch {
        message.error("Failed to fetch warehouses");
      } finally {
        setLoadingWarehouses(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load zones + a fallback center whenever the selected warehouse changes ──
  useEffect(() => {
    if (!selectedWarehouseId) {
      setZones([]);
      setCenterHint(null);
      return;
    }
    setMapMode("view");
    setEditingZone(null);
    fetchZones(selectedWarehouseId);
    const warehouse = warehouses.find((w) => w.id === selectedWarehouseId);
    if (warehouse) {
      geocodeAddress(warehouse.location).then(setCenterHint);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWarehouseId]);

  const fetchZones = async (warehouseId: string) => {
    setLoadingZones(true);
    try {
      const data = await deliveryZoneService.getDeliveryZones(warehouseId);
      setZones(data);
    } catch {
      message.error("Failed to fetch delivery zones");
    } finally {
      setLoadingZones(false);
    }
  };

  // ── Add / Edit / Cancel ──
  const openAddDrawer = () => {
    form.resetFields();
    form.setFieldsValue({ isActive: true, priority: 0 });
    setEditingZone(null);
    setMapMode("draw");
    setDrawerOpen(true);
  };

  const openEditDrawer = (zone: DeliveryZone) => {
    form.setFieldsValue({ name: zone.name, isActive: zone.isActive, priority: zone.priority });
    setEditingZone(zone);
    setMapMode("edit");
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setMapMode("view");
    setEditingZone(null);
    form.resetFields();
  };

  const handleSave = async () => {
    if (!selectedWarehouseId) return;
    try {
      const values = await form.validateFields();
      const draft = mapRef.current?.getCurrentDraft();
      if (!draft) {
        message.error("Please draw a zone on the map before saving.");
        return;
      }

      setSaving(true);
      const dto = {
        name: values.name,
        warehouseId: selectedWarehouseId,
        isActive: values.isActive,
        priority: values.priority,
        shapeType: draft.shapeType,
        shape: draft.shape,
      };

      if (editingZone) {
        await deliveryZoneService.updateDeliveryZone(editingZone.id, dto);
        message.success("Delivery zone updated successfully");
      } else {
        await deliveryZoneService.createDeliveryZone(dto);
        message.success("Delivery zone created successfully");
      }

      closeDrawer();
      fetchZones(selectedWarehouseId);
    } catch (error) {
      if (error instanceof Error) message.error(error.message || "Failed to save delivery zone");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (zone: DeliveryZone) => {
    try {
      await deliveryZoneService.deleteDeliveryZone(zone.id);
      message.success("Delivery zone deleted successfully");
      if (selectedWarehouseId) fetchZones(selectedWarehouseId);
    } catch {
      message.error("Failed to delete delivery zone");
    }
  };

  const handleToggleActive = async (zone: DeliveryZone, isActive: boolean) => {
    try {
      await deliveryZoneService.updateDeliveryZone(zone.id, { isActive });
      setZones((prev) => prev.map((z) => (z.id === zone.id ? { ...z, isActive } : z)));
    } catch {
      message.error("Failed to update zone status");
    }
  };

  const selectedWarehouseName = warehouses.find((w) => w.id === selectedWarehouseId)?.name ?? "—";

  const columns = [
    { title: "Name", dataIndex: "name", key: "name" },
    {
      title: "Warehouse",
      key: "warehouse",
      render: () => <span style={{ fontSize: 13, color: "#64748B" }}>{selectedWarehouseName}</span>,
    },
    {
      title: "Type",
      dataIndex: "shapeType",
      key: "shapeType",
      width: 100,
      render: (t: string) => <span className="ds-badge">{t}</span>,
    },
    { title: "Priority", dataIndex: "priority", key: "priority", width: 90 },
    {
      title: "Active",
      key: "isActive",
      width: 90,
      render: (_: unknown, record: DeliveryZone) => (
        <Switch checked={record.isActive} onChange={(checked) => handleToggleActive(record, checked)} />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      fixed: "right" as const,
      render: (_: unknown, record: DeliveryZone) => (
        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
          <Button
            className="ds-action-btn edit"
            icon={<EditOutlined style={{ fontSize: 14 }} />}
            onClick={() => openEditDrawer(record)}
            title="Edit"
          />
          <Popconfirm
            title="Delete Delivery Zone"
            description="Are you sure you want to delete this zone?"
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

  const isDrafting = mapMode === "draw" || mapMode === "edit";

  return (
    <div style={{ padding: "24px" }}>
      <div className="ds-page-header">
        <h1 className="ds-page-title">Delivery Zones</h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Select
            placeholder="Select warehouse"
            style={{ width: 240 }}
            loading={loadingWarehouses}
            value={selectedWarehouseId}
            onChange={setSelectedWarehouseId}
            options={warehouses.map((w) => ({ label: w.name, value: w.id }))}
            disabled={isDrafting}
          />
          {isDrafting ? (
            <Button icon={<CloseOutlined />} onClick={closeDrawer}>
              Cancel Drawing
            </Button>
          ) : (
            <Button
              icon={<PlusOutlined />}
              className="ds-btn-primary"
              onClick={openAddDrawer}
              disabled={!selectedWarehouseId}
            >
              Add Zone
            </Button>
          )}
        </div>
      </div>

      <div style={{ height: 520, marginBottom: 24 }}>
        <DeliveryZoneMap
          ref={mapRef}
          zones={zones}
          editingZoneId={editingZone?.id ?? null}
          mode={mapMode}
          centerHint={centerHint}
          focusKey={selectedWarehouseId ?? ""}
        />
      </div>

      <div className="ds-table-wrapper">
        <Table
          columns={columns}
          dataSource={zones}
          rowKey="id"
          loading={loadingZones}
          pagination={{ pageSize: 10, showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} zones` }}
          locale={{
            emptyText: (
              <div className="ds-empty">
                <div className="ds-empty-icon">📍</div>
                <div className="ds-empty-text">No delivery zones for this warehouse yet</div>
              </div>
            ),
          }}
        />
      </div>

      <DrawerForm
        isOpen={drawerOpen}
        title={editingZone ? "Edit Delivery Zone" : "Add Delivery Zone"}
        onClose={closeDrawer}
        onSubmit={handleSave}
        isSubmitting={saving}
        submitLabel={editingZone ? "Save Changes" : "Create"}
      >
        <p style={{ fontSize: 13, color: "#64748B", marginTop: 0 }}>
          {editingZone
            ? "Drag the vertices or radius handle on the map to adjust the zone's shape."
            : "Use the Polygon or Circle tool on the map to draw the zone's coverage area."}
        </p>
        <Form form={form} layout="vertical" name="deliveryZoneForm">
          <Form.Item
            name="name"
            label="Zone Name"
            rules={[{ required: true, message: "Please enter a zone name!" }]}
          >
            <Input placeholder="Enter zone name" className="ds-input" />
          </Form.Item>

          <Form.Item name="priority" label="Priority" initialValue={0}>
            <InputNumber
              min={0}
              precision={0}
              style={{ width: "100%" }}
              placeholder="0"
            />
          </Form.Item>

          <Form.Item name="isActive" label="Active" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </DrawerForm>
    </div>
  );
};

export default DeliveryZones;
