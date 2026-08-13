import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Spin } from "antd";
import { useAuth } from "../contexts/AuthContext";

interface RoleProtectedRouteProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

// Assumes it's nested under <ProtectedRoute>, but still handles the
// unauthenticated case defensively in case that ever changes.
export default function RoleProtectedRoute({ allowedRoles, children }: RoleProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/overview" replace />;
  }

  return <>{children}</>;
}
