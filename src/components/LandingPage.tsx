import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <main className="mq-shell">
      <section className="mq-hero">
        <div className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-4 py-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4ea7f4]">myquad.ciright.com</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight lg:text-5xl">Professional Priority Command Center</h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/80">
              Teams ko clear visibility do: urgent kya hai, important kya hai, aur ownership kis ke paas hai.
              Ek hi board par executive aur operations dono aligned rehte hain.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/sign-in" className="mq-btn-primary inline-flex px-5 py-3 text-sm">
                Sign in
              </Link>
              <Link
                to="/sign-up"
                className="inline-flex rounded-lg border border-white/25 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Create account
              </Link>
            </div>
          </div>

          <div className="mq-panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#2c4f66]">Workflow Preview</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <article className="rounded-xl bg-[#f7f9fb] p-4">
                <p className="text-xs font-semibold uppercase text-[#fe0f26]">Q1 Critical Now</p>
                <p className="mt-1 text-xs text-black/65">Immediate execution tasks</p>
              </article>
              <article className="rounded-xl bg-[#f7f9fb] p-4">
                <p className="text-xs font-semibold uppercase text-[#0c34da]">Q2 Important</p>
                <p className="mt-1 text-xs text-black/65">High-value strategic work</p>
              </article>
              <article className="rounded-xl bg-[#f7f9fb] p-4">
                <p className="text-xs font-semibold uppercase text-[#2c4f66]">Q3 Low Priority</p>
                <p className="mt-1 text-xs text-black/65">Defer or simplify items</p>
              </article>
              <article className="rounded-xl bg-[#f7f9fb] p-4">
                <p className="text-xs font-semibold uppercase text-black/55">Q4 Noise</p>
                <p className="mt-1 text-xs text-black/65">Avoid distraction workload</p>
              </article>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
