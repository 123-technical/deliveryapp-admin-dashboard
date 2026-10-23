import { useEffect, useState } from "react";
import { Modal, Segmented, InputNumber, Input, App, Alert } from "antd";
import { inventoryService, InventoryApiError } from "../../services/inventory";
import type { ManualStockReason } from "../../types/inventory";

export type StockTarget = {
  productId: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  reorderLevel: number;
};

type Mode = "add" | "remove" | "set";

const MODE_REASON: Record<Mode, ManualStockReason> = {
  add: "RESTOCK",
  remove: "ADJUSTMENT",
  set: "STOCK_COUNT",
};

type Props = {
  target: StockTarget | null;
  onClose: () => void;
  /** Called after a successful save so the caller can refetch. */
  onSaved: () => void;
};

/**
 * Restock / remove / set an exact count for one product in one warehouse.
 * Sends the quantity the admin is looking at as `expectedQuantity`; if an
 * order changed it meanwhile the server refuses, and the modal refreshes the
 * number so the admin can decide again instead of overwriting live stock.
 */
export default function StockAdjustModal({ target, onClose, onSaved }: Props) {
  const { message } = App.useApp();
  const [mode, setMode] = useState<Mode>("add");
  const [amount, setAmount] = useState<number | null>(null);
  const [reorderLevel, setReorderLevel] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [current, setCurrent] = useState(0);
  const [saving, setSaving] = useState(false);
  const [staleNotice, setStaleNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    setMode("add");
    setAmount(null);
    setReorderLevel(target.reorderLevel);
    setNote("");
    setCurrent(target.quantity);
    setStaleNotice(null);
  }, [target]);

  const next =
    amount == null ? current : mode === "add" ? current + amount : mode === "remove" ? current - amount : amount;
  const reorderChanged = target != null && reorderLevel != null && reorderLevel !== target.reorderLevel;
  const stockChanged = amount != null && (mode === "set" ? amount !== current : amount > 0);
  const invalid = next < 0 || (!stockChanged && !reorderChanged);

  const save = async () => {
    if (!target || invalid) return;
    setSaving(true);
    try {
      await inventoryService.adjust({
        productId: target.productId,
        warehouseId: target.warehouseId,
        ...(stockChanged && {
          reason: MODE_REASON[mode],
          ...(mode === "set" ? { quantity: amount! } : { delta: mode === "add" ? amount! : -amount! }),
          expectedQuantity: current,
        }),
        ...(reorderChanged && { reorderLevel: reorderLevel! }),
        ...(note.trim() && { note: note.trim() }),
      });
      message.success("Stock updated");
      onSaved();
      onClose();
    } catch (error) {
      if (error instanceof InventoryApiError && error.code === "STOCK_CHANGED") {
        const latest = Number(error.data?.quantity ?? current);
        setStaleNotice(`Stock changed from ${current} to ${latest} while this was open (likely an order). Check the new value and save again.`);
        setCurrent(latest);
        onSaved(); // refresh the table behind the modal too
      } else {
        message.error(error instanceof Error ? error.message : "Failed to update stock");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={target != null}
      title={target ? `Stock · ${target.productName}` : ""}
      onCancel={onClose}
      onOk={save}
      okText="Save"
      okButtonProps={{ disabled: invalid, loading: saving }}
      destroyOnHidden
    >
      {target && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ color: "#64748B", fontSize: 13 }}>
            {target.warehouseName} · currently <b style={{ color: "#0F172A" }}>{current}</b> in stock
          </div>

          {staleNotice && <Alert type="warning" showIcon message={staleNotice} />}

          <Segmented<Mode>
            block
            value={mode}
            onChange={(m) => { setMode(m); setAmount(null); }}
            options={[
              { label: "Add stock", value: "add" },
              { label: "Remove", value: "remove" },
              { label: "Set exact count", value: "set" },
            ]}
          />

          <div className="ds-field-group">
            <label className="ds-label">
              {mode === "add" ? "Units received" : mode === "remove" ? "Units to remove (damaged, expired…)" : "Counted quantity"}
            </label>
            <InputNumber
              autoFocus
              min={0}
              precision={0}
              style={{ width: "100%" }}
              value={amount}
              onChange={(v) => setAmount(v)}
              onPressEnter={save}
            />
            {amount != null && (
              <div style={{ marginTop: 6, fontSize: 13, color: next < 0 ? "#B91C1C" : "#475569" }}>
                {next < 0 ? `Only ${current} in stock` : `New stock: ${next}`}
              </div>
            )}
          </div>

          <div className="ds-field-group">
            <label className="ds-label">Reorder level (low-stock alert at or below)</label>
            <InputNumber min={0} precision={0} style={{ width: "100%" }} value={reorderLevel} onChange={(v) => setReorderLevel(v)} />
          </div>

          <div className="ds-field-group">
            <label className="ds-label">Note (optional)</label>
            <Input.TextArea rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Supplier invoice #1234" />
          </div>
        </div>
      )}
    </Modal>
  );
}
