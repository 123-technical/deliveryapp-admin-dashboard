import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "./layouts/AdminLayout.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import LoginPage from "./pages/Login.tsx";

const Overview = lazy(() => import("./pages/Overview.tsx"));
const Customers = lazy(() => import("./pages/Customers.tsx"));
const Riders = lazy(() => import("./pages/Riders.tsx"));
const Staffs = lazy(() => import("./pages/Staffs.tsx"));
const Orders = lazy(() => import("./pages/Orders.tsx"));
const OrderAdd = lazy(() => import("./pages/OrderAdd.tsx"));
const Products = lazy(() => import("./pages/Products.tsx"));
const ProductAdd = lazy(() => import("./pages/ProductAdd.tsx"));
const ProductEdit = lazy(() => import("./pages/ProductEdit.tsx"));
const ProductDetail = lazy(() => import("./pages/ProductDetail.tsx"));
const ProductDuplicate = lazy(() => import("./pages/ProductDuplicate.tsx"));
const Reports = lazy(() => import("./pages/Reports.tsx"));
const Notifications = lazy(() => import("./pages/Notifications.tsx"));
const Settings = lazy(() => import("./pages/Settings.tsx"));
const Support = lazy(() => import("./pages/Support.tsx"));
const Categories = lazy(() => import("./pages/Categories.tsx"));
const CategoryDetail = lazy(() => import("./pages/CategoryDetail.tsx"));
const Brands = lazy(() => import("./pages/Brands.tsx"));
const BrandDetail = lazy(() => import("./pages/BrandDetail.tsx"));
const Carts = lazy(() => import("./pages/Carts.tsx"));
const OrderDetail = lazy(() => import("./pages/OrderDetail.tsx"));
const CustomerAdd = lazy(() => import("./pages/CustomerAdd.tsx"));

function App() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <Routes>
                  <Route
                    path="/"
                    element={<Navigate to="/overview" replace />}
                  />
                  <Route path="/overview" element={<Overview />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/customers/add" element={<CustomerAdd />} />
                  <Route path="/riders" element={<Riders />} />
                  <Route path="/staffs" element={<Staffs />} />
                  <Route path="/orders" element={<Orders />} />
                  <Route path="/orders/add" element={<OrderAdd />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/product/add" element={<ProductAdd />} />
                  <Route path="/product/edit/:id" element={<ProductEdit />} />
                  <Route
                    path="/product/detail/:id"
                    element={<ProductDetail />}
                  />
                  <Route
                    path="/product/duplicate/:id"
                    element={<ProductDuplicate />}
                  />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/support" element={<Support />} />
                  <Route path="/categories" element={<Categories />} />
                  <Route path="/category/:slug" element={<CategoryDetail />} />
                  <Route path="/brands" element={<Brands />} />
                  <Route path="/brand/:id" element={<BrandDetail />} />
                  <Route path="/carts" element={<Carts />} />
                  <Route path="/order/:id" element={<OrderDetail />} />
                  <Route
                    path="*"
                    element={<div style={{ padding: 24 }}>Not Found</div>}
                  />
                </Routes>
              </AdminLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  );
}

export default App;
