// src/app/context/AuthContext.tsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import {
  api,
  setToken,
  ApiError,
  touchActivity,
  isSessionExpired,
} from "../../lib/api";

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  employee_id?: string | null;
}

interface AuthError {
  message: string;
  secondsLeft?: number;
  lockedUntil?: string;
}

interface SignInResult {
  error: AuthError | null;
  requiresMfa?: boolean;
  tempToken?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  faceSignIn: (faceDescriptor: number[]) => Promise<SignInResult>;
  verifyMfa: (
    tempToken: string,
    code: string
  ) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 🔒 Session check interval (5 minutes)
const SESSION_CHECK_INTERVAL_MS = 30 * 1000; // Check every 30 seconds

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 🔒 Load user on mount
  const loadCurrentUser = useCallback(async () => {
    const token = sessionStorage.getItem("wms_token");
    if (!token) {
      setLoading(false);
      return;
    }

    // 🔒 Check kung expired na ang session
    if (isSessionExpired()) {
      setToken(null);
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const me = await api.me();
      setUser(me);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // 🔒 Session expiry check + auto logout
  useEffect(() => {
    loadCurrentUser();

    sessionCheckRef.current = setInterval(() => {
      if (isSessionExpired()) {
        setToken(null);
        setUser(null);
        if (
          typeof window !== "undefined" &&
          !window.location.pathname.includes("/login")
        ) {
          window.location.href = "/login?expired=1";
        }
      }
    }, SESSION_CHECK_INTERVAL_MS);

    return () => {
      if (sessionCheckRef.current) clearInterval(sessionCheckRef.current);
    };
  }, [loadCurrentUser]);

  // 🔒 Track user activity para hindi mag-expire ang session habang aktibo
  useEffect(() => {
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    const handler = () => touchActivity();

    events.forEach((e) =>
      window.addEventListener(e, handler, { passive: true })
    );
    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
    };
  }, []);

  // 🔒 Cross-tab sync: mag-logout lahat ng tabs kapag nag-logout sa isa
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "wms_token" && e.newValue === null && user) {
        setUser(null);
        if (
          typeof window !== "undefined" &&
          !window.location.pathname.includes("/login")
        ) {
          window.location.href = "/login";
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [user]);

  async function signIn(
    email: string,
    password: string
  ): Promise<SignInResult> {
    try {
      // 🔒 Trim inputs
      const res = await api.login(email.trim(), password);

      if ((res as any).requires_mfa) {
        return {
          error: null,
          requiresMfa: true,
          tempToken: (res as any).temp_token,
        };
      }

      setToken(res.token);
      setUser(res.user);
      return { error: null };
    } catch (err: any) {
      return {
        error: {
          message: err.message ?? "Login failed.",
          secondsLeft: err instanceof ApiError ? err.secondsLeft : undefined,
          lockedUntil:
            err instanceof ApiError ? err.lockedUntil : undefined,
        },
      };
    }
  }

  async function faceSignIn(faceDescriptor: number[]): Promise<SignInResult> {
    try {
      const res = await api.faceLogin(faceDescriptor);

      if ((res as any).requires_mfa) {
        return {
          error: null,
          requiresMfa: true,
          tempToken: (res as any).temp_token,
        };
      }

      setToken(res.token);
      setUser(res.user);
      return { error: null };
    } catch (err: any) {
      return {
        error: {
          message: err.message ?? "Face login failed.",
          secondsLeft: err instanceof ApiError ? err.secondsLeft : undefined,
          lockedUntil:
            err instanceof ApiError ? err.lockedUntil : undefined,
        },
      };
    }
  }

  async function verifyMfa(
    tempToken: string,
    code: string
  ): Promise<{ error: AuthError | null }> {
    try {
      const res = await api.verifyMfa(tempToken, code);
      setToken(res.token);
      setUser(res.user);
      return { error: null };
    } catch (err: any) {
      return {
        error: { message: err.message ?? "MFA verification failed." },
      };
    }
  }

  async function signOut() {
    try {
      await api.logout();
    } catch {
      // ignore
    } finally {
      setToken(null);
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        signIn,
        faceSignIn,
        verifyMfa,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}