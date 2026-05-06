import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { apiRequest, type SessionUser } from "@/lib/api";

type LoginResponse = {
  token: string;
  user: SessionUser;
};

export function SignInPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setError("");
    setBusy(true);
    try {
      const data = await apiRequest<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: { email, password },
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
      <p className="mt-2 text-sm text-black/60">Use your workspace credentials to continue.</p>
      {error ? <p className="mt-3 rounded-lg bg-[#fe0f26]/10 px-3 py-2 text-sm text-[#fe0f26]">{error}</p> : null}
      <form onSubmit={submit} className="mt-4 space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="mq-input"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="mq-input"
        />
        <button type="submit" className="mq-btn-primary w-full py-2.5 disabled:cursor-not-allowed disabled:opacity-70" disabled={busy}>
          {busy ? "Signing in..." : "Continue"}
        </button>
      </form>
      <p className="mt-5 text-sm text-black/60">
        New here?{" "}
        <Link to="/sign-up" className="font-semibold text-[#0c34da]">
          Create account
        </Link>
      </p>
    </div>
  );
}
