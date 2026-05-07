import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <main className="mq-shell">
      <section className="mq-hero">
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-10 sm:px-8 lg:px-10">
          <header className="flex items-center justify-between">
            <div className="inline-flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-sm font-bold text-white ring-1 ring-white/25">
                MQ
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7ac2ff]">myquad.ciright.com</p>
                <p className="text-xs text-white/70">Priority Intelligence Platform</p>
              </div>
            </div>
            <Link
              to="/sign-in"
              className="inline-flex rounded-lg border border-white/25 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
            >
              Existing user
            </Link>
          </header>

          <div className="mt-12 grid flex-1 items-center gap-10 pb-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="text-white">
              <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8dc8ff]">
                Executive and Operations Alignment
              </p>
              <h1 className="mt-6 max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">
                Professional Priority Command Center for Modern Teams
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
                Bring strategy, execution, and ownership into one shared view. MyQuad helps teams focus on what must move
                now, what creates long-term value, and what should be deprioritized.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/sign-in" className="mq-btn-primary inline-flex px-6 py-3 text-sm">
                  Sign in
                </Link>
                <Link
                  to="/sign-up"
                  className="inline-flex rounded-lg border border-white/25 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Create account
                </Link>
              </div>

              <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
                <div className="rounded-xl border border-white/20 bg-white/8 p-3">
                  <p className="text-xl font-semibold text-white">4Q</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-white/70">Decision model</p>
                </div>
                <div className="rounded-xl border border-white/20 bg-white/8 p-3">
                  <p className="text-xl font-semibold text-white">360°</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-white/70">Team visibility</p>
                </div>
                <div className="rounded-xl border border-white/20 bg-white/8 p-3">
                  <p className="text-xl font-semibold text-white">1 Board</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-white/70">Shared alignment</p>
                </div>
              </div>
            </div>

            <div className="mq-panel overflow-hidden p-6">
              <div className="rounded-xl border border-[#dbe4ee] bg-[#f9fbff] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#2c4f66]">Workflow Preview</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <article className="rounded-xl bg-white p-4 ring-1 ring-[#e6edf5]">
                    <p className="text-xs font-semibold uppercase text-[#fe0f26]">Q1 Critical Now</p>
                    <p className="mt-1 text-xs text-black/65">Immediate execution tasks</p>
                  </article>
                  <article className="rounded-xl bg-white p-4 ring-1 ring-[#e6edf5]">
                    <p className="text-xs font-semibold uppercase text-[#0c34da]">Q2 Important</p>
                    <p className="mt-1 text-xs text-black/65">High-value strategic work</p>
                  </article>
                  <article className="rounded-xl bg-white p-4 ring-1 ring-[#e6edf5]">
                    <p className="text-xs font-semibold uppercase text-[#2c4f66]">Q3 Low Priority</p>
                    <p className="mt-1 text-xs text-black/65">Defer or simplify items</p>
                  </article>
                  <article className="rounded-xl bg-white p-4 ring-1 ring-[#e6edf5]">
                    <p className="text-xs font-semibold uppercase text-black/55">Q4 Noise</p>
                    <p className="mt-1 text-xs text-black/65">Avoid distraction workload</p>
                  </article>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-[#dbe4ee] bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[#2c4f66]">Built for clarity at scale</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-[#2c4f66]">
                  <span className="rounded-full bg-[#edf4ff] px-3 py-1">Department-wise filtering</span>
                  <span className="rounded-full bg-[#edf4ff] px-3 py-1">Ownership tracking</span>
                  <span className="rounded-full bg-[#edf4ff] px-3 py-1">Role-based access</span>
                  <span className="rounded-full bg-[#edf4ff] px-3 py-1">Action-first dashboards</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
