// src/app/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api, setToken, ApiError } from "../../lib/api";

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
  verifyMfa: (tempToken: string, code: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadCurrentUser() {
    const token = localStorage.getItem("wms_token");
    if (!token) {
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
  }

  useEffect(() => {
    loadCurrentUser();
  }, []);

  async function signIn(email: string, password: string): Promise<SignInResult> {
    try {
      const res = await api.login(email, password);

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
          lockedUntil: err instanceof ApiError ? err.lockedUntil : undefined,
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
          lockedUntil: err instanceof ApiError ? err.lockedUntil : undefined,
        },
      };
    }
  }

  async function verifyMfa(tempToken: string, code: string): Promise<{ error: AuthError | null }> {
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
      value={{ user, isAuthenticated: !!user, loading, signIn, faceSignIn, verifyMfa, signOut }}
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