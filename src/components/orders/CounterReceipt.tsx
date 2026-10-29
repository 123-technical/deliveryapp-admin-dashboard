import { createPortal } from "react-dom";
import dayjs from "dayjs";
import type { Order } from "../../types/order";
import { COUNTER_PAYMENT_METHODS, shortOrderNumber } from "../../types/order";
import type { Warehouse } from "../../types/warehouse";

// A second copy of the receipt is portalled straight into <body>. While printing, every other
// child of <body> (the app, antd popups) is display:none, so only the receipt is on paper,
// sized for an 80mm till roll (it still prints fine on A4).
const PRINT_CSS = `
.counter-receipt-print { display: none; }
@media print {
  body > *:not(.counter-receipt-print) { display: none !important; }
  .counter-receipt-print { display: block; }
  .counter-receipt-print .counter-receipt { width: 72mm !important; padding: 0 !important; border: none !important; }
  @page { margin: 4mm; }
}
`;

const money = (n: number | string) => `₹${Number(n).toFixed(2)}`;

type Props = {
  order: Order;
  /** Product names by id; the sale response only carries ids. */
  productNames: Map<string, string>;
  store?: Warehouse;
};

/** Till receipt for a counter sale. Print it with window.print(). */
export default function CounterReceipt({ order, productNames, store }: Props) {
  const items = order.items ?? order.orderItems ?? [];
  const payment = COUNTER_PAYMENT_METHODS.find((m) => m.value === order.paymentMethod)?.label ?? order.paymentMethod;
  const customer = order.user && !order.user.isSystem ? order.user.name || order.user.mobile : null;
  const row = { display: "flex", justifyContent: "space-between", gap: 8 } as const;

  const receipt = (
    <div
      className="counter-receipt"
      style={{
        width: 300,
        padding: 16,
        background: "#fff",
        border: "1px solid #E2E8F0",
        borderRadius: 8,
        fontFamily: "ui-monospace, Menlo, Consolas, monospace",
        fontSize: 12,
        color: "#000",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{store?.name ?? "Store"}</div>
        {store?.location && <div>{store.location}</div>}
      </div>
      <div style={row}><span>Receipt #{shortOrderNumber(order)}</span><span>{dayjs(order.createdAt).format("DD MMM YYYY HH:mm")}</span></div>
      {customer && <div>Customer: {customer}</div>}
      <hr style={{ border: "none", borderTop: "1px dashed #000", margin: "8px 0" }} />
      {items.map((item) => (
        <div key={item.id ?? item.productId} style={{ marginBottom: 4 }}>
          <div>{productNames.get(item.productId) ?? item.productName ?? item.productId}</div>
          <div style={row}>
            <span>{item.quantity} × {money(item.priceAtPurchase)}</span>
            <span>{money(Number(item.priceAtPurchase) * item.quantity)}</span>
          </div>
        </div>
      ))}
      <hr style={{ border: "none", borderTop: "1px dashed #000", margin: "8px 0" }} />
      <div style={{ ...row, fontSize: 14, fontWeight: 700 }}><span>TOTAL</span><span>{money(order.finalAmount ?? 0)}</span></div>
      <div style={row}><span>Paid by</span><span>{payment}</span></div>
      <div style={{ textAlign: "center", marginTop: 12 }}>Thank you!</div>
    </div>
  );

  return (
    <>
      <style>{PRINT_CSS}</style>
      {receipt}
      {createPortal(<div className="counter-receipt-print">{receipt}</div>, document.body)}
    </>
  );
}
