import { useEffect, useMemo, useState } from "react";
import { Alert, App, Button, Card, InputNumber, Space, Spin, Table, Tooltip } from "antd";
import { DeleteOutlined, PlusOutlined, UndoOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { deliveryFeeService } from "../services/deliveryFees";
import { warehouseService } from "../services/warehouses";
import { deliveryZoneService } from "../services/deliveryZones";
import { formatDistance, formatFee, tierColor, type FeeTier } from "../types/deliveryFee";
import FeeRingsMap from "../components/maps/FeeRingsMap";

type Row = FeeTier & { key: number };

let nextKey = 1;
const withKeys = (tiers: FeeTier[]): Row[] => tiers.map((t) => ({ ...t, key: nextKey++ }));

/** Problems that would make the backend refuse the schedule, per row. */
function validate(rows: Row[], beyondFee: number | null): string | null {
  if (rows.length === 0) return "Add at least one tier";
  if (rows.length > 10) return "At most 10 tiers";
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!(r.upToMeters >= 1)) return `Tier ${i + 1}: enter a distance`;
    if (!(r.fee >= 0)) return `Tier ${i + 1}: enter a fee (0 for free)`;
    if (i > 0 && r.upToMeters <= rows[i - 1].upToMeters) {
      return `Tier ${i + 1} must reach further than tier ${i} (${formatDistance(rows[i - 1].upToMeters)})`;
    }
  }
  if (beyondFee == null || beyondFee < 0) return "Enter the fee for beyond the last tier";
  return null;
}

export default function DeliveryFees() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ["delivery-fee-settings"], queryFn: () => deliveryFeeService.getSettings() });
  const warehouses = useQuery({ queryKey: ["warehouses"], queryFn: () => warehouseService.getWarehouses() });
  const zones = useQuery({ queryKey: ["delivery-zones"], queryFn: () => deliveryZoneService.getDeliveryZones() });

  const [rows, setRows] = useState<Row[]>([]);
  const [beyondFee, setBeyondFee] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    if (!settings.data) return;
    setRows(withKeys(settings.data.tiers));
    setBeyondFee(settings.data.beyondFee);
  };
  useEffect(reset, [settings.data]);

  const error = validate(rows, beyondFee);
  const dirty =
    !!settings.data &&
    (beyondFee !== settings.data.beyondFee ||
      JSON.stringify(rows.map(({ upToMeters, fee }) => ({ upToMeters, fee }))) !== JSON.stringify(settings.data.tiers));

  const summary = useMemo(() => {
    if (error) return null;
    const parts = rows.map((r, i) => {
      const from = i === 0 ? "Up to" : `${formatDistance(rows[i - 1].upToMeters)} –`;
      return { color: tierColor(i), text: `${from} ${formatDistance(r.upToMeters)}`, fee: formatFee(r.fee) };
    });
    parts.push({ color: "#64748B", text: `Beyond ${formatDistance(rows[rows.length - 1].upToMeters)}`, fee: formatFee(beyondFee!) });
    return parts;
  }, [rows, beyondFee, error]);

  const update = (key: number, patch: Partial<FeeTier>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const addTier = () =>
    setRows((rs) => {
      const last = rs[rs.length - 1];
      return [...rs, { key: nextKey++, upToMeters: (last?.upToMeters ?? 0) + 1000, fee: last?.fee ?? 0 }];
    });

  const save = async () => {
    if (error || beyondFee == null) return;
    setSaving(true);
    try {
      await deliveryFeeService.updateSettings({ tiers: rows.map(({ upToMeters, fee }) => ({ upToMeters, fee })), beyondFee });
      message.success("Delivery fees saved. They apply to orders placed from now on.");
      await queryClient.invalidateQueries({ queryKey: ["delivery-fee-settings"] });
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (settings.isLoading) {
    return <div style={{ padding: 48, textAlign: "center" }}><Spin /></div>;
  }
  if (settings.isError) {
    return <div style={{ padding: 24 }}><Alert type="error" showIcon message="Couldn't load delivery fees" description={(settings.error as Error).message} /></div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <div className="ds-page-header">
        <div>
          <h1 className="ds-page-title">Delivery Fees</h1>
          <div style={{ color: "#64748B", fontSize: 13 }}>
            Charged by straight-line distance from the store serving the address.
            {settings.data?.updatedAt && ` Last changed ${dayjs(settings.data.updatedAt).format("DD MMM YYYY, HH:mm")}.`}
          </div>
        </div>
        <Space>
          <Button icon={<UndoOutlined />} disabled={!dirty || saving} onClick={reset}>Discard changes</Button>
          <Button className="ds-btn-primary" disabled={!dirty || !!error} loading={saving} onClick={save}>Save</Button>
        </Space>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 440px) 1fr", gap: 24, alignItems: "start" }}>
        <Card title="Fee tiers">
          <Table<Row>
            rowKey="key"
            size="small"
            pagination={false}
            dataSource={rows}
            columns={[
              {
                title: "",
                key: "swatch",
                width: 16,
                render: (_, __, i) => <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 5, background: tierColor(i) }} />,
              },
              {
                title: "Up to",
                key: "upTo",
                render: (_, r) => (
                  <InputNumber
                    min={1}
                    max={100000}
                    precision={0}
                    value={r.upToMeters}
                    suffix="m"
                    style={{ width: 130 }}
                    onChange={(v) => update(r.key, { upToMeters: v ?? 0 })}
                  />
                ),
              },
              {
                title: "Fee",
                key: "fee",
                render: (_, r) => (
                  <InputNumber
                    min={0}
                    max={10000}
                    precision={2}
                    value={r.fee}
                    prefix="₹"
                    style={{ width: 120 }}
                    onChange={(v) => update(r.key, { fee: v ?? -1 })}
                  />
                ),
              },
              {
                title: "",
                key: "remove",
                width: 40,
                render: (_, r) => (
                  <Tooltip title="Remove tier">
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      disabled={rows.length <= 1}
                      onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                    />
                  </Tooltip>
                ),
              },
            ]}
          />
          <Button block icon={<PlusOutlined />} style={{ marginTop: 12 }} onClick={addTier} disabled={rows.length >= 10}>
            Add tier
          </Button>

          <div className="ds-field-group" style={{ marginTop: 20 }}>
            <label className="ds-label">Beyond the last tier (and when an address has no map pin)</label>
            <InputNumber min={0} max={10000} precision={2} prefix="₹" value={beyondFee} onChange={setBeyondFee} style={{ width: 160 }} />
          </div>

          {error ? (
            <Alert type="warning" showIcon style={{ marginTop: 16 }} message={error} />
          ) : (
            <div style={{ marginTop: 16, display: "grid", gap: 6 }}>
              {summary!.map((p) => (
                <div key={p.text} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: p.color, marginRight: 8 }} />{p.text}</span>
                  <b>{p.fee}</b>
                </div>
              ))}
            </div>
          )}

          <Alert
            type="info"
            style={{ marginTop: 16 }}
            message="Customers see the new fee in their cart right away. Orders already placed keep the fee they were placed with; an order placed against an old fee is refused and the customer is shown the new one."
          />
        </Card>

        <Card title="Preview" extra={dirty && <span style={{ color: "#B45309", fontSize: 12 }}>Showing unsaved changes</span>}>
          <FeeRingsMap
            warehouses={warehouses.data ?? []}
            zones={zones.data ?? []}
            tiers={error ? (settings.data?.tiers ?? []) : rows}
            beyondFee={error ? (settings.data?.beyondFee ?? 0) : (beyondFee ?? 0)}
          />
        </Card>
      </div>
    </div>
  );
}
