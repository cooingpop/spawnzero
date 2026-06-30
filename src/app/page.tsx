const statusCards = [
  { label: "Base", value: "Next.js" },
  { label: "Deployment", value: "Vercel" },
  { label: "Growth engine", value: "Local Ollama / Qwen" },
  { label: "Mode", value: "Public experiment" },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#080a0d] text-zinc-100">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-white/10 pb-5 text-sm text-zinc-400">
          <div className="font-mono uppercase tracking-[0.22em] text-emerald-300">
            SpawnZero
          </div>
          <a
            href="https://github.com/cooingpop/spawnzero"
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-white/10 px-3 py-2 font-mono text-xs text-zinc-300 transition hover:border-emerald-300/50 hover:text-white"
          >
            GitHub
          </a>
        </header>

        <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
          <div className="max-w-3xl">
            <p className="mb-5 font-mono text-sm uppercase tracking-[0.28em] text-amber-200">
              System bootstrap / public repo
            </p>
            <h1 className="text-5xl font-semibold tracking-normal text-white sm:text-6xl lg:text-7xl">
              SpawnZero
            </h1>
            <p className="mt-7 max-w-2xl text-xl leading-8 text-zinc-200 sm:text-2xl sm:leading-9">
              An open experiment where AI starts from zero and grows a project
              one step at a time.
            </p>
            <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
              SpawnZero begins with a minimal web base. Future changes are
              proposed by a local AI model, tested, and submitted as pull
              requests.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href="https://github.com/cooingpop/spawnzero"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center rounded-md bg-emerald-300 px-5 font-mono text-sm font-semibold text-zinc-950 transition hover:bg-emerald-200"
              >
                View repository
              </a>
              <div className="inline-flex h-11 items-center justify-center rounded-md border border-white/10 px-5 font-mono text-sm text-zinc-300">
                Ready to connect with Vercel.
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 shadow-2xl shadow-black/30">
            <div className="mb-4 flex items-center gap-2 border-b border-white/10 pb-4">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
              <span className="ml-3 font-mono text-xs text-zinc-500">
                boot.log
              </span>
            </div>
            <div className="space-y-3 font-mono text-sm">
              {statusCards.map((item) => (
                <div
                  key={item.label}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 rounded-md border border-white/10 bg-black/30 px-4 py-3"
                >
                  <span className="text-zinc-500">{item.label}</span>
                  <span className="text-right text-zinc-100">{item.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-md border border-emerald-300/20 bg-emerald-300/5 p-4 font-mono text-xs leading-6 text-emerald-100">
              <p>$ npm run lint</p>
              <p>$ npm run build</p>
              <p className="text-zinc-500">next step: wait for a local model proposal</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
