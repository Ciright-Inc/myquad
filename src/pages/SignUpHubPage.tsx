import { Link } from "react-router-dom";

export function SignUpHubPage() {
  return (
    <div>
      <div className="inline-flex items-center rounded-full border border-[#d6deeb] bg-[#f6f9ff] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4e8ce0]">
        Onboarding
      </div>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[#060a32]">Choose account type</h1>
      <p className="mt-2 text-sm text-black/60">Pick the workspace model and continue setup in under a minute.</p>

      <div className="mt-6 grid gap-4">
        <Link
          to="/sign-up/individual"
          className="group rounded-2xl border border-[#d6deeb] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#aabdd6] hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-[#1f3851]">Individual</p>
              <p className="mt-1 text-xs text-black/60">Personal workspace with focused task flow.</p>
            </div>
            <span className="rounded-full bg-[#edf3ff] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.09em] text-[#2c4f66]">Solo</span>
          </div>
          <div className="mt-3 h-px bg-[#e8eef6]" />
          <ul className="mt-3 space-y-1 text-xs text-[#48627b]">
            <li>Single owner task planning</li>
            <li>Personal priority board</li>
          </ul>
          <p className="mt-3 text-xs font-semibold text-[#2c4f66] group-hover:text-[#0c34da]">Continue as Individual</p>
        </Link>

        <Link
          to="/sign-up/enterprise"
          className="group rounded-2xl border border-[#d6deeb] bg-gradient-to-br from-white to-[#f7faff] p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#aabdd6] hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-[#0c34da]">Enterprise</p>
              <p className="mt-1 text-xs text-black/60">Organization setup with admin privileges.</p>
            </div>
            <span className="rounded-full bg-[#e8eeff] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.09em] text-[#0c34da]">
              Recommended
            </span>
          </div>
          <div className="mt-3 h-px bg-[#e8eef6]" />
          <ul className="mt-3 space-y-1 text-xs text-[#48627b]">
            <li>Multi-user workspace and roles</li>
            <li>Admin controls and team governance</li>
          </ul>
          <p className="mt-3 text-xs font-semibold text-[#2c4f66] group-hover:text-[#0c34da]">Continue as Enterprise</p>
        </Link>
      </div>
    </div>
  );
}
