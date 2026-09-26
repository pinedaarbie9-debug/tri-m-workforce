// src/app/components/ProtectedRoute.tsx
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../../context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[];
}

// 🔒 Role hierarchy — 4 roles lang
const ROLE_HIERARCHY: Record<string, number> = {
  admin: 100,
  hr_manager: 80,
  supervisor: 60,
  employee: 20,
};

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  // 🔒 Role check
  if (roles && user && !roles.includes(user.role)) {
    // Employee → redirect sa portal
    if (user.role === "employee") {
      return <Navigate to="/portal" replace />;
    }
    // Management → redirect sa dashboard
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}