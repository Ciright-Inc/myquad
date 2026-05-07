import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { AtSign, LockKeyhole, UserRound } from "lucide-react";
import { apiRequest, type SessionUser } from "@/lib/api";
import { signUpIndividualSchema, inputClass, toFieldErrors, type FieldErrors } from "@/lib/validation";
import { buildIdentityPayload } from "@/lib/identity";

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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<"name" | "email" | "password">>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = signUpIndividualSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error.issues));
      return;
    }
    setError("");
    setFieldErrors({});
    setBusy(true);
    try {
      const data = await apiRequest<AuthResponse>("/api/auth/register-individual", {
        method: "POST",
        body: { ...parsed.data, ...buildIdentityPayload("none") },
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
        <div className="space-y-1">
          <div className="mq-input-wrap">
            <UserRound size={15} className="mq-input-icon" />
            <input
              className={inputClass("mq-input mq-input-with-icon", !!fieldErrors.name)}
              placeholder="Full name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: undefined }));
              }}
              aria-invalid={!!fieldErrors.name}
            />
          </div>
          {fieldErrors.name ? <p className="text-xs text-[#fe0f26]">{fieldErrors.name}</p> : null}
        </div>
        <div className="space-y-1">
          <div className="mq-input-wrap">
            <AtSign size={15} className="mq-input-icon" />
            <input
              className={inputClass("mq-input mq-input-with-icon", !!fieldErrors.email)}
              placeholder="Email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
              }}
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
              className={inputClass("mq-input mq-input-with-icon", !!fieldErrors.password)}
              placeholder="Password (min 8 chars)"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
              }}
              aria-invalid={!!fieldErrors.password}
            />
          </div>
          {fieldErrors.password ? <p className="text-xs text-[#fe0f26]">{fieldErrors.password}</p> : null}
        </div>
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
