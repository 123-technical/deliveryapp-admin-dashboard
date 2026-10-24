import { Input, Modal } from "antd";

/**
 * Staff confirmation before cancelling an order, with an optional reason
 * (stored on the order and shown to the customer in the app). Resolves the
 * dialog only once [onConfirm] settles, so errors keep it open-able again.
 */
export function confirmCancelOrder(onConfirm: (reason: string | undefined) => Promise<void>) {
  let reason = "";
  Modal.confirm({
    title: "Cancel this order?",
    content: (
      <div>
        <p style={{ marginBottom: 12 }}>
          Its items go back into the warehouse's stock and on sale in the app straight away. A cancelled order
          can't be reopened.
        </p>
        <Input.TextArea
          rows={2}
          maxLength={300}
          placeholder="Reason (optional, shown to the customer)"
          onChange={(e) => { reason = e.target.value; }}
        />
      </div>
    ),
    okText: "Cancel order",
    okButtonProps: { danger: true },
    cancelText: "Keep order",
    onOk: () => onConfirm(reason.trim() || undefined),
  });
}

const CANCELLED_BY: Record<string, string> = {
  CUSTOMER: "Customer (from the app)",
  STAFF: "Staff",
  SYSTEM: "System: payment not completed in time",
};

export function cancelledByLabel(by: string | null | undefined): string {
  return (by && CANCELLED_BY[by]) || "—";
}
