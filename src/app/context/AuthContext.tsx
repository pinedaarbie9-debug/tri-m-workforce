// src/app/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api, setToken } from "../../lib/api";

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  employee_id?: string | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: { message: string } | null }>;
  faceSignIn: (faceDescriptor: number[]) => Promise<{ error: { message: string } | null }>;
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

  async function signIn(email: string, password: string) {
    try {
      const { token, user } = await api.login(email, password);
      setToken(token);
      setUser(user);
      return { error: null };
    } catch (err: any) {
      return { error: { message: err.message ?? "Nabigo ang pag-login." } };
    }
  }

  async function faceSignIn(faceDescriptor: number[]) {
    try {
      const { token, user } = await api.faceLogin(faceDescriptor);
      setToken(token);
      setUser(user);
      return { error: null };
    } catch (err: any) {
      return { error: { message: err.message ?? "Nabigo ang face login." } };
    }
  }

  async function signOut() {
    try {
      await api.logout();
    } catch {
      // hindi na kailangan i-block ang logout kahit mag-fail ang request
    } finally {
      setToken(null);
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, loading, signIn, faceSignIn, signOut }}
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