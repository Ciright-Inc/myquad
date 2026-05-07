/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiRequest, type SessionUser } from "@/lib/api";

type AuthContextValue = {
  token: string | null;
  loading: boolean;
  user: SessionUser | null;
  isOrgAdmin: boolean;
  setSession: (token: string, isOrgAdmin?: boolean, user?: SessionUser | null) => void;
  refreshMe: () => Promise<void>;
  logout: () => void;
};

const STORAGE_TOKEN = "myquad_token";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_TOKEN));
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [loading, setLoading] = useState(() => !!localStorage.getItem(STORAGE_TOKEN));

  const refreshMe = useCallback(async () => {
    const savedToken = localStorage.getItem(STORAGE_TOKEN);
    if (!savedToken) return;
    const me = await apiRequest<SessionUser>("/api/me", { token: savedToken });
    setUser(me);
    setIsOrgAdmin(!!me.isOrgAdmin);
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshMe()
      .catch(() => {
        localStorage.removeItem(STORAGE_TOKEN);
        setToken(null);
        setLoading(false);
        setIsOrgAdmin(false);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [refreshMe, token]);

  const setSession = useCallback((nextToken: string, admin = false, nextUser: SessionUser | null = null) => {
    localStorage.setItem(STORAGE_TOKEN, nextToken);
    setToken(nextToken);
    setLoading(false);
    setIsOrgAdmin(admin);
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_TOKEN);
    setToken(null);
    setLoading(false);
    setIsOrgAdmin(false);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ token, loading, user, isOrgAdmin, setSession, refreshMe, logout }),
    [token, loading, user, isOrgAdmin, setSession, refreshMe, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
