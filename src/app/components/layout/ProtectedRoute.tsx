import { Navigate } from "react-router";
import { useAuth } from "../../context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  // Kung binigyan ng roles, dapat kasama sa listahan ang role ng naka-login
  // bago ipakita ang laman. Kung wala, kahit sinong naka-login ay pwede.
  roles?: string[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, loading, user } = useAuth();

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
    return <Navigate to="/login" replace />;
  }

  // May role restriction ba ang route na ito, at hindi kasama ang role ng user?
  if (roles && user && !roles.includes(user.role)) {
    // Empleyado pero sinusubukang pumasok sa admin area → ibalik sa Employee Portal
    if (user.role === "employee") {
      return <Navigate to="/portal" replace />;
    }
    // Admin/HR/atbp. pero sinusubukang pumasok sa Employee Portal → ibalik sa admin dashboard
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}