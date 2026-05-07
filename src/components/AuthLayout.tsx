import { Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <main className="mq-shell relative flex min-h-screen items-center overflow-hidden bg-[#eef1f7]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_18%,rgba(27,77,255,0.20),transparent_40%),radial-gradient(circle_at_82%_84%,rgba(6,10,50,0.12),transparent_45%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(44,79,102,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(44,79,102,0.14)_1px,transparent_1px)] [background-size:44px_44px]"
      />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-7 px-4 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
        <section className="hidden h-full min-h-[560px] flex-col justify-center rounded-3xl border border-white/30 bg-gradient-to-br from-[#050a2e] via-[#0a1f69] to-[#1f43dd] p-10 text-white shadow-[0_30px_80px_-40px_rgba(6,10,50,0.9)] lg:flex">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#83c9ff]">MyQuad Workspace</p>
          <h2 className="mt-3 max-w-lg text-4xl font-semibold leading-tight">Focused workflow with executive-grade clarity.</h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/80">
            Run onboarding, align priorities, and launch your team's operating rhythm from one clean command surface.
          </p>

          <div className="mt-8 grid gap-3 text-sm">
            <div className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9cd5ff]">Strategic Focus</p>
              <p className="mt-1 text-white/90">Separate urgent execution from high-value planning.</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9cd5ff]">Ownership Control</p>
              <p className="mt-1 text-white/90">Assign accountability with role-aware access and visibility.</p>
            </div>
          </div>
        </section>

        <section className="mq-panel relative flex h-full min-h-[560px] w-full max-w-xl flex-col justify-center border border-white/60 bg-white/92 p-8 backdrop-blur-md lg:justify-self-end">
          <Outlet />
        </section>
      </div>
    </main>
  );
}
