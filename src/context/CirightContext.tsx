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
import {
  cirightLogin,
  loadStoredCirightApp,
  storeCirightApp,
  type CirightAppRecord,
  type CirightLoginRequest,
} from "@/lib/ciright";

type CirightContextValue = {
  app: CirightAppRecord | null;
  loading: boolean;
  error: string | null;
  bootstrap: (payload?: CirightLoginRequest) => Promise<CirightAppRecord | null>;
  clear: () => void;
};

const CirightContext = createContext<CirightContextValue | null>(null);

export function CirightProvider({ children }: { children: ReactNode }) {
  const [app, setApp] = useState<CirightAppRecord | null>(() => loadStoredCirightApp());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bootstrap = useCallback(async (payload: CirightLoginRequest = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await cirightLogin(payload);
      const record = res.data[0] ?? null;
      setApp(record);
      storeCirightApp(record);
      if (!record) {
        setError("No app configuration returned for this subscription.");
      }
      return record;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ciright login failed";
      setError(message);
      setApp(null);
      storeCirightApp(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void bootstrap();
  }, [bootstrap]);

  const clear = useCallback(() => {
    setApp(null);
    setError(null);
    storeCirightApp(null);
  }, []);

  const value = useMemo<CirightContextValue>(
    () => ({ app, loading, error, bootstrap, clear }),
    [app, loading, error, bootstrap, clear],
  );

  return <CirightContext.Provider value={value}>{children}</CirightContext.Provider>;
}

export function useCiright() {
  const ctx = useContext(CirightContext);
  if (!ctx) {
    throw new Error("useCiright must be used inside CirightProvider");
  }
  return ctx;
}
