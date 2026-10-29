import { Suspense, lazy } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import type { Location } from "react-router-dom";
import AdminLayout from "./layouts/AdminLayout.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import RoleProtectedRoute from "./components/RoleProtectedRoute.tsx";
import LoginPage from "./pages/Login.tsx";
import Users from "./pages/Users.tsx";
import { useAuth } from "./contexts/AuthContext.tsx";

const Profile = lazy(() => import("./pages/Profile.tsx"));

const Overview = lazy(() => import("./pages/Overview.tsx"));
const Customers = lazy(() => import("./pages/Customers.tsx"));
const CustomerDetail = lazy(() => import("./pages/CustomerDetail.tsx"));
const Riders = lazy(() => import("./pages/Riders.tsx"));
const Orders = lazy(() => import("./pages/Orders.tsx"));
const Products = lazy(() => import("./pages/Products.tsx"));
const ProductDetail = lazy(() => import("./pages/ProductDetail.tsx"));
const ProductDuplicate = lazy(() => import("./pages/ProductDuplicate.tsx"));
const ProductEdit = lazy(() => import("./pages/ProductEdit.tsx"));
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
const CounterSale = lazy(() => import("./pages/CounterSale.tsx"));
const DeliveryZones = lazy(() => import("./pages/DeliveryZones.tsx"));
const Warehouses = lazy(() => import("./pages/Warehouses.tsx"));
const Inventory = lazy(() => import("./pages/Inventory.tsx"));
const DeliveryFees = lazy(() => import("./pages/DeliveryFees.tsx"));
const Advertisements = lazy(() => import("./pages/Advertisements.tsx"));

// GuestRoute: once authenticated, go back to the page that sent us to /login
// (set by ProtectedRoute), or /overview by default
function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return null;
  if (isAuthenticated) {
    const from = (location.state as { from?: Location } | null)?.from;
    const target = from ? `${from.pathname}${from.search}${from.hash}` : "/overview";
    return <Navigate to={target} replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
      <Routes>
        <Route path="/login"  element={<GuestRoute><LoginPage /></GuestRoute>} />

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
                  <Route path="/customers/:id" element={<CustomerDetail />} />
                  <Route path="/riders" element={<Riders />} />
                  <Route
                    path="/users"
                    element={
                      <RoleProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                        <Users />
                      </RoleProtectedRoute>
                    }
                  />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/orders" element={<Orders />} />
                  <Route path="/admin/orders" element={<Navigate to="/orders" replace />} />
                  <Route path="/counter" element={<CounterSale />} />
                  <Route path="/products" element={<Products />} />
                  <Route
                    path="/product/detail/:id"
                    element={<ProductDetail />}
                  />
                  <Route
                    path="/product/duplicate/:id"
                    element={<ProductDuplicate />}
                  />
                  <Route path="/product/edit/:id" element={<ProductEdit />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/support" element={<Support />} />
                  <Route path="/categories" element={<Categories />} />
                  <Route path="/category/:slug" element={<CategoryDetail />} />
                  <Route path="/brands" element={<Brands />} />
                  <Route path="/brand/:id" element={<BrandDetail />} />
                  <Route path="/carts" element={<Carts />} />
                  <Route path="/warehouses" element={<Warehouses />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route
                    path="/delivery-zones"
                    element={
                      <RoleProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                        <DeliveryZones />
                      </RoleProtectedRoute>
                    }
                  />
                  <Route
                    path="/delivery-fees"
                    element={
                      <RoleProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                        <DeliveryFees />
                      </RoleProtectedRoute>
                    }
                  />
                  <Route
                    path="/advertisements"
                    element={
                      <RoleProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                        <Advertisements />
                      </RoleProtectedRoute>
                    }
                  />
                  <Route path="/orders/:id" element={<OrderDetail />} />
                  <Route path="/admin/orders/:id" element={<Navigate to="/orders/:id" replace />} />
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
