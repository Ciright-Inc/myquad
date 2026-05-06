import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { apiRequest, type SessionUser } from "@/lib/api";

type AuthResponse = {
  token: string;
  user: SessionUser;
};

export function SignUpIndividualPage() {
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !password) return;
    setError("");
    setBusy(true);
    try {
      const data = await apiRequest<AuthResponse>("/api/auth/register-individual", {
        method: "POST",
        body: { name, email, password },
      });
      setSession(data.token, !!data.user?.isOrgAdmin, data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#4ea7f4]">Individual</p>
      <h1 className="mt-2 text-3xl font-semibold text-[#060a32]">Create individual account</h1>
      {error ? <p className="mt-3 rounded-lg bg-[#fe0f26]/10 px-3 py-2 text-sm text-[#fe0f26]">{error}</p> : null}
      <form onSubmit={submit} className="mt-4 space-y-3">
        <input className="mq-input" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="mq-input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" className="mq-input" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit" className="mq-btn-primary w-full py-2.5 disabled:cursor-not-allowed disabled:opacity-70" disabled={busy}>
          {busy ? "Creating..." : "Create workspace"}
        </button>
      </form>
      <Link to="/sign-up" className="mt-4 inline-block text-sm font-semibold text-[#0c34da]">
        Back
      </Link>
    </div>
  );
}
