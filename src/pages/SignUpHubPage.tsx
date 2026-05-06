import { Link } from "react-router-dom";

export function SignUpHubPage() {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#4ea7f4]">Onboarding</p>
      <h1 className="mt-2 text-3xl font-semibold text-[#060a32]">Choose account type</h1>
      <div className="mt-5 grid gap-3">
        <Link
          to="/sign-up/individual"
          className="rounded-xl border border-black/10 bg-[#f7f9fb] p-4 transition hover:-translate-y-0.5 hover:bg-white"
        >
          <p className="text-sm font-semibold text-[#2c4f66]">Individual</p>
          <p className="mt-1 text-xs text-black/60">Personal workspace with focused task flow.</p>
        </Link>
        <Link
          to="/sign-up/enterprise"
          className="rounded-xl border border-black/10 bg-[#f7f9fb] p-4 transition hover:-translate-y-0.5 hover:bg-white"
        >
          <p className="text-sm font-semibold text-[#0c34da]">Enterprise</p>
          <p className="mt-1 text-xs text-black/60">Organization setup with admin privileges.</p>
        </Link>
      </div>
    </div>
  );
}
