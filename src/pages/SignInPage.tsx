import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AtSign, LockKeyhole } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCiright } from "@/context/CirightContext";
import { apiRequest, type SessionUser } from "@/lib/api";
import { loginSchema, inputClass, toFieldErrors, type FieldErrors } from "@/lib/validation";
import { buildIdentityPayload } from "@/lib/identity";

type LoginResponse = {
  token: string;
  user: SessionUser;
};

export function SignInPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const { app: cirightApp, loading: cirightLoading, error: cirightError } = useCiright();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<"email" | "password">>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error.issues));
      return;
    }
    setError("");
    setFieldErrors({});
    setBusy(true);
    try {
      const data = await apiRequest<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: { ...parsed.data, ...buildIdentityPayload("none") },
      });
      setSession(data.token, !!data.user?.isOrgAdmin, data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to login");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#4ea7f4]">Welcome back</p>
      <h1 className="mt-2 text-3xl font-semibold text-[#060a32]">Sign in</h1>
      <p className="mt-2 text-sm text-black/60">Sign in with your myciright.com email and password.</p>
      {cirightLoading ? (
        <p className="mt-3 text-sm text-black/50">Connecting to Ciright…</p>
      ) : cirightError ? (
        <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-900">
          {cirightError} You can still sign in below if the API is reachable.
        </p>
      ) : cirightApp ? (
        <p className="mt-3 rounded-lg bg-[#4ea7f4]/10 px-3 py-2 text-sm text-[#2c4f66]">
          Ciright app: <span className="font-semibold">{cirightApp.appName.trim()}</span>
        </p>
      ) : null}
      {error ? <p className="mt-3 rounded-lg bg-[#fe0f26]/10 px-3 py-2 text-sm text-[#fe0f26]">{error}</p> : null}
      <form onSubmit={submit} className="mt-4 space-y-3">
        <div className="space-y-1">
          <div className="mq-input-wrap">
            <AtSign size={15} className="mq-input-icon" />
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
              }}
              placeholder="Email"
              className={inputClass("mq-input mq-input-with-icon", !!fieldErrors.email)}
              aria-invalid={!!fieldErrors.email}
            />
          </div>
          {fieldErrors.email ? <p className="text-xs text-[#fe0f26]">{fieldErrors.email}</p> : null}
        </div>
        <div className="space-y-1">
          <div className="mq-input-wrap">
            <LockKeyhole size={15} className="mq-input-icon" />
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
              }}
              placeholder="Password"
              className={inputClass("mq-input mq-input-with-icon", !!fieldErrors.password)}
              aria-invalid={!!fieldErrors.password}
            />
          </div>
          {fieldErrors.password ? <p className="text-xs text-[#fe0f26]">{fieldErrors.password}</p> : null}
        </div>
        <button
          type="submit"
          className="mq-btn-primary w-full py-2.5 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={busy || cirightLoading}
        >
          {busy ? "Signing in..." : "Continue"}
        </button>
      </form>
      {/* <p className="mt-5 text-sm text-black/60">
        New here?{" "}
        <Link to="/sign-up" className="font-semibold text-[#0c34da]">
          Create account
        </Link>
      </p> */}
    </div>
  );
}
