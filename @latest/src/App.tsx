import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "./layouts/AdminLayout";

const Overview = lazy(() => import("./pages/Overview"));
const Customers = lazy(() => import("./pages/Customers"));
const Riders = lazy(() => import("./pages/Riders"));
const Staffs = lazy(() => import("./pages/Staffs"));
const Orders = lazy(() => import("./pages/Orders"));
const Products = lazy(() => import("./pages/Products"));
const Reports = lazy(() => import("./pages/Reports"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Settings = lazy(() => import("./pages/Settings"));
const Support = lazy(() => import("./pages/Support"));

function App() {
  return (
    <AdminLayout>
      <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<Overview />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/riders" element={<Riders />} />
          <Route path="/staffs" element={<Staffs />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/products" element={<Products />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/support" element={<Support />} />
          <Route
            path="*"
            element={<div style={{ padding: 24 }}>Not Found</div>}
          />
        </Routes>
      </Suspense>
    </AdminLayout>
  );
}

export default App;
