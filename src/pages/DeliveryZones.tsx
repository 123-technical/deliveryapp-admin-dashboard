import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
import ZoneEditor from "../components/maps/ZoneEditor";
import ZonesOverviewMap from "../components/maps/ZonesOverviewMap";
import { validateZoneDraft, warehouseColor, type ZoneDraft } from "../components/maps/zoneShapes";

const ALL = "__all__";

const DeliveryZones = () => {
  const { message, modal } = App.useApp();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loadingZones, setLoadingZones] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<string>(ALL);

  // Editor state: the drawer and the drawing map are open together.
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [draft, setDraft] = useState<ZoneDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const formWarehouseId: string | undefined = Form.useWatch("warehouseId", form);

  const fetchZones = async () => {
    setLoadingZones(true);
    try {
      setZones(await deliveryZoneService.getDeliveryZones());
    } catch {
      message.error("Failed to fetch delivery zones");
    } finally {
      setLoadingZones(false);
    }
  };

  useEffect(() => {
    (async () => {
      setLoadingWarehouses(true);
      try {
        setWarehouses(await warehouseService.getWarehouses());
      } catch {
        message.error("Failed to fetch warehouses");
      } finally {
        setLoadingWarehouses(false);
      }
      await fetchZones();
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const colorKeys = useMemo(() => warehouses.map((w) => w.id), [warehouses]);
  const warehouseById = (id: string | undefined) => warehouses.find((w) => w.id === id);
  const visibleZones = filter === ALL ? zones : zones.filter((z) => z.warehouseId === filter);
  const visibleWarehouses = filter === ALL ? warehouses : warehouses.filter((w) => w.id === filter);

  // ── Open / close the editor ──
  const openAdd = () => {
    form.resetFields();
    form.setFieldsValue({
      isActive: true,
      priority: 0,
      warehouseId: filter !== ALL ? filter : warehouses[0]?.id,
    });
    setEditingZone(null);
    setDraft(null);
    setEditorKey((k) => k + 1);
    setEditorOpen(true);
  };

  const openEdit = (zone: DeliveryZone) => {
    form.setFieldsValue({
      name: zone.name,
      warehouseId: zone.warehouseId,
      isActive: zone.isActive,
      priority: zone.priority,
    });
    setEditingZone(zone);
    setDraft({ shapeType: zone.shapeType, shape: zone.shape });
    setEditorKey((k) => k + 1);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingZone(null);
    setDraft(null);
    form.resetFields();
  };

  const draftError = validateZoneDraft(draft);
  // Clearing an existing zone's shape and saving means "delete this zone".
  const pendingDelete = !!editingZone && draft === null;

  const confirmDeleteFromEditor = (zone: DeliveryZone) => {
    modal.confirm({
      title: `Delete "${zone.name}"?`,
      content: "You cleared this zone's shape. Saving now deletes the zone. This can't be undone.",
      okText: "Delete Zone",
      okType: "danger",
      cancelText: "Keep Editing",
      onOk: async () => {
        setSaving(true);
        try {
          await deliveryZoneService.deleteDeliveryZone(zone.id);
          message.success("Delivery zone deleted successfully");
          closeEditor();
          fetchZones();
        } catch {
          message.error("Failed to delete delivery zone");
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const handleSave = async () => {
    if (pendingDelete && editingZone) {
      confirmDeleteFromEditor(editingZone);
      return;
    }
    try {
      const values = await form.validateFields();
      const problem = validateZoneDraft(draft);
      if (problem || !draft) {
        message.error(problem ?? "Draw the zone on the map first.");
        return;
      }

      setSaving(true);
      const dto = {
        name: values.name,
        warehouseId: values.warehouseId,
        isActive: values.isActive,
        priority: values.priority ?? 0,
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

      closeEditor();
      fetchZones();
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
      fetchZones();
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

  const columns = [
    { title: "Name", dataIndex: "name", key: "name" },
    {
      title: "Warehouse",
      key: "warehouse",
      render: (_: unknown, record: DeliveryZone) => (
        <span style={{ fontSize: 13, color: "#475569", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: warehouseColor(colorKeys, record.warehouseId),
              display: "inline-block",
            }}
          />
          {warehouseById(record.warehouseId)?.name ?? "—"}
        </span>
      ),
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
            onClick={() => openEdit(record)}
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

  const formWarehouse = warehouseById(formWarehouseId);
  // Every other active zone (any warehouse) is shown faintly so overlaps are obvious.
  const otherActiveZones = zones.filter((z) => z.isActive && z.id !== editingZone?.id);

  return (
    <div style={{ padding: "24px" }}>
      <div className="ds-page-header">
        <h1 className="ds-page-title">Delivery Zones</h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {warehouses.length === 0 && !loadingWarehouses ? (
            <span style={{ fontSize: 13, color: "#64748B" }}>
              No warehouses yet — <Link to="/warehouses">add one first</Link>
            </span>
          ) : (
            <Select
              style={{ width: 240 }}
              loading={loadingWarehouses}
              value={filter}
              onChange={setFilter}
              disabled={editorOpen}
              options={[
                { label: "All warehouses", value: ALL },
                ...warehouses.map((w) => ({ label: w.name, value: w.id })),
              ]}
            />
          )}
          {editorOpen ? (
            <Button icon={<CloseOutlined />} onClick={closeEditor}>
              Cancel
            </Button>
          ) : (
            <Button
              icon={<PlusOutlined />}
              className="ds-btn-primary"
              onClick={openAdd}
              disabled={warehouses.length === 0}
            >
              Add Zone
            </Button>
          )}
        </div>
      </div>

      {/* Leave room for the maskless drawer so the whole editor map stays reachable. */}
      <div style={{ height: 520, marginBottom: 12, marginRight: editorOpen ? 440 : 0 }}>
        {editorOpen ? (
          <ZoneEditor
            key={editorKey}
            initial={editingZone ? { shapeType: editingZone.shapeType, shape: editingZone.shape } : null}
            onChange={setDraft}
            warehouse={
              formWarehouse
                ? { name: formWarehouse.name, lat: formWarehouse.latitude, lng: formWarehouse.longitude }
                : null
            }
            otherZones={otherActiveZones}
          />
        ) : (
          <ZonesOverviewMap
            zones={visibleZones}
            warehouses={visibleWarehouses}
            colorKeys={colorKeys}
            onZoneClick={openEdit}
            fitKey={`${filter}:${loaded}`}
          />
        )}
      </div>

      {!editorOpen && warehouses.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 12, color: "#475569", marginBottom: 24 }}>
          {warehouses.map((w) => (
            <span key={w.id} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span
                style={{ width: 10, height: 10, borderRadius: 2, background: warehouseColor(colorKeys, w.id) }}
              />
              {w.name}
              {(w.latitude == null || w.longitude == null) && (
                <span style={{ color: "#94A3B8" }}>(no map pin)</span>
              )}
            </span>
          ))}
          <span style={{ color: "#94A3B8" }}>Faded = inactive · Click a zone to edit it</span>
        </div>
      )}

      <div className="ds-table-wrapper">
        <Table
          columns={columns}
          dataSource={visibleZones}
          rowKey="id"
          loading={loadingZones}
          pagination={{ pageSize: 10, showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} zones` }}
          locale={{
            emptyText: (
              <div className="ds-empty">
                <div className="ds-empty-icon">📍</div>
                <div className="ds-empty-text">No delivery zones yet</div>
              </div>
            ),
          }}
        />
      </div>

      <DrawerForm
        isOpen={editorOpen}
        title={editingZone ? "Edit Delivery Zone" : "Add Delivery Zone"}
        onClose={closeEditor}
        onSubmit={handleSave}
        isSubmitting={saving}
        submitDisabled={!!draftError && !pendingDelete}
        submitLabel={editingZone ? "Save Changes" : "Create"}
        mask={false}
        width={420}
      >
        <div
          style={{
            fontSize: 13,
            marginTop: 0,
            marginBottom: 16,
            padding: "10px 12px",
            borderRadius: 8,
            background: pendingDelete ? "#FEF2F2" : draftError ? "#EFF6FF" : "#ECFDF5",
            color: pendingDelete ? "#B91C1C" : draftError ? "#1D4ED8" : "#047857",
          }}
        >
          {pendingDelete
            ? "Shape cleared — saving will delete this zone. Draw a new shape instead to keep it."
            : draftError
            ? draftError
            : draft?.shapeType === "RADIUS"
            ? `✓ Circle ready — ${Math.round((draft.shape as { radiusMeters: number }).radiusMeters)} m radius.`
            : "✓ Polygon ready — adjust it on the map if needed, then save."}
        </div>
        <Form form={form} layout="vertical" name="deliveryZoneForm">
          <Form.Item
            name="name"
            label="Zone Name"
            rules={[{ required: true, message: "Please enter a zone name!" }]}
          >
            <Input placeholder="Enter zone name" className="ds-input" />
          </Form.Item>

          <Form.Item
            name="warehouseId"
            label="Warehouse"
            rules={[{ required: true, message: "Please select a warehouse!" }]}
            extra={
              formWarehouse && (formWarehouse.latitude == null || formWarehouse.longitude == null)
                ? "This warehouse has no map pin yet — set one on the Warehouses page to see it here."
                : undefined
            }
          >
            <Select
              placeholder="Select warehouse"
              options={warehouses.map((w) => ({ label: w.name, value: w.id }))}
            />
          </Form.Item>

          <Form.Item name="priority" label="Priority" initialValue={0}>
            <InputNumber min={0} precision={0} style={{ width: "100%" }} placeholder="0" />
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
