import { Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <main className="mq-shell">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-6 px-4 py-10 lg:grid-cols-[1fr_1fr]">
        <section className="mq-hero hidden rounded-3xl p-9 text-white shadow-2xl lg:block">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4ea7f4]">MyQuad</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight">Focused workflow, premium experience.</h2>
          <p className="mt-4 text-sm text-white/80">
            Sign in ya sign up karke apne tasks ko quadrant model me streamline karo.
          </p>
        </section>
        <section className="mq-panel w-full max-w-lg p-7 lg:justify-self-end">
          <Outlet />
        </section>
      </div>
    </main>
  );
}
