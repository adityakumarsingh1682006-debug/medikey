export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#071512] text-white">

      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-emerald-500/10 blur-[130px]" />
        <div className="absolute bottom-0 -left-40 h-[500px] w-[500px] rounded-full bg-teal-500/10 blur-[120px]" />

        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "55px 55px",
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-7 lg:px-10">

        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400 text-[#071512] shadow-lg shadow-emerald-500/20">
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
              <path
                d="M12 21s-8-4.5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.5-8 11-8 11Z"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M5 12h4l2-4 3 8 2-4h3"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <span className="text-2xl font-bold tracking-tight">
            Medi<span className="text-emerald-400">Key</span>
          </span>
        </div>

        <div className="hidden items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-emerald-300 sm:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
          Your health identity, reimagined
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 mx-auto grid min-h-[78vh] max-w-7xl items-center gap-16 px-6 py-16 lg:grid-cols-2 lg:px-10 lg:py-20">

        {/* Left content */}
        <div className="max-w-2xl">

          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-4 py-2 text-sm text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            A smarter way to manage medical identity
          </div>

          <h1 className="text-5xl font-semibold leading-[1.12] tracking-tight sm:text-6xl lg:text-[76px]">
            Your health.
            <br />
            Your identity.
            <br />
            <span className="bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
              One MediKey.
            </span>
          </h1>

          <p className="mt-8 max-w-xl text-lg leading-8 text-slate-400">
            Keep essential medical information connected, organized
            and accessible. Because the right information should
            always be within reach when it matters most.
          </p>

          {/* Continue button */}
          <form action="/api/demo-login" method="POST">
            <button
              type="submit"
              className="group mt-10 inline-flex items-center gap-4 rounded-2xl bg-emerald-400 px-8 py-5 text-base font-bold text-[#071512] shadow-xl shadow-emerald-500/15 transition-all duration-300 hover:-translate-y-1 hover:bg-emerald-300 hover:shadow-emerald-400/25"
            >
              Continue to MediKey

              <span className="transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </button>
          </form>

          <div className="mt-6 flex items-center gap-3 text-sm text-slate-500">
            <svg
              className="h-4 w-4 text-emerald-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            Secure access to your MediKey workspace
          </div>
        </div>

        {/* Right visual */}
        <div className="relative mx-auto w-full max-w-lg">

          <div className="absolute inset-0 rounded-full bg-emerald-400/10 blur-[90px]" />

          {/* Floating medical card */}
          <div className="relative rotate-1 rounded-[32px] border border-white/10 bg-gradient-to-br from-white/[0.12] to-white/[0.025] p-5 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:p-8">

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 text-[#071512]">
                  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                    <path
                      d="M12 21s-8-4.5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.5-8 11-8 11Z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-bold">MediKey</p>
                  <p className="text-xs text-slate-400">Medical Identity</p>
                </div>
              </div>

              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-300">
                Digital ID
              </span>
            </div>

            <div className="my-9 rounded-2xl border border-white/10 bg-[#0c211c]/80 p-6">

              <div className="flex items-center justify-between">
                <span className="text-xs tracking-[0.2em] text-slate-400">
                  PERSONAL HEALTH IDENTITY
                </span>

                <div className="h-2 w-2 rounded-full bg-emerald-400" />
              </div>

              <div className="mt-7 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 to-teal-500 text-2xl font-bold text-[#071512]">
                  M
                </div>

                <div>
                  <h3 className="text-xl font-semibold">
                    Your Medical Profile
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    One identity. Essential information.
                  </p>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3">

                {[
                  ["01", "Medical Identity"],
                  ["02", "Emergency Profile"],
                  ["03", "Family Health"],
                  ["04", "Digital Card"],
                ].map(([number, title]) => (
                  <div
                    key={number}
                    className="rounded-xl border border-white/[0.07] bg-white/[0.035] p-4"
                  >
                    <p className="text-xs text-emerald-400">{number}</p>
                    <p className="mt-2 text-sm font-medium text-slate-200">
                      {title}
                    </p>
                  </div>
                ))}

              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Healthcare, connected.</span>
              <span className="tracking-widest">MEDIKEY © 2026</span>
            </div>
          </div>

          {/* Floating status */}
          <div className="absolute -right-3 top-20 hidden rounded-2xl border border-white/10 bg-[#10251f] px-5 py-4 shadow-xl sm:block">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                ✓
              </div>
              <div>
                <p className="text-sm font-semibold">Connected</p>
                <p className="text-xs text-slate-500">Your health ecosystem</p>
              </div>
            </div>
          </div>

          <div className="absolute -bottom-5 -left-4 hidden rounded-2xl border border-white/10 bg-[#10251f] px-5 py-4 shadow-xl sm:block">
            <p className="text-xs text-slate-500">BUILT AROUND YOU</p>
            <p className="mt-1 font-semibold text-emerald-300">
              Health. Simplified.
            </p>
          </div>

        </div>
      </section>

      {/* Bottom feature strip */}
      <section className="relative z-10 border-t border-white/[0.08] bg-white/[0.02]">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 sm:grid-cols-3 lg:px-10">

          {[
            {
              number: "01",
              title: "One medical identity",
              description: "Bring essential health information together.",
            },
            {
              number: "02",
              title: "Emergency ready",
              description: "Keep important medical details accessible.",
            },
            {
              number: "03",
              title: "Family connected",
              description: "Organize health profiles in one place.",
            },
          ].map((feature) => (
            <div key={feature.number} className="flex gap-4">
              <span className="text-sm font-semibold text-emerald-400">
                {feature.number}
              </span>

              <div>
                <h3 className="font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}

        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 flex flex-col items-center justify-between gap-3 px-6 py-7 text-xs text-slate-600 sm:flex-row lg:px-10">
        <p>© 2026 MediKey. All rights reserved.</p>
        <p>Designed for a more connected healthcare experience.</p>
      </footer>

    </main>
  );
}
