import Reveal from './Reveal'

export default function Hero() {
  return (
    <section className="relative pt-20 pb-16 text-center overflow-hidden">
      {/* Ambient floating glow orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-10 left-1/4 w-72 h-72 bg-brand-500/20 rounded-full blur-3xl float-slow" />
        <div
          className="absolute top-32 right-1/4 w-72 h-72 bg-cyan-accent/10 rounded-full blur-3xl float-slow"
          style={{ animationDelay: '2s' }}
        />
      </div>

      <div className="container-page">
        <Reveal>
          <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide uppercase bg-white/5 border border-white/10 text-brand-400 px-4 py-1.5 rounded-full hover:bg-white/10 transition">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
            Built for merchandising agencies
          </span>
        </Reveal>

        <Reveal delay={100}>
          <h1 className="font-display font-extrabold text-5xl md:text-6xl leading-tight mt-6">
            <span className="text-white">Your field force, </span>
            <span className="bg-gradient-to-r from-brand-400 via-cyan-accent to-brand-400 bg-clip-text text-transparent animated-gradient">
              fully accounted for.
            </span>
          </h1>
        </Reveal>

        <Reveal delay={200}>
          <p className="max-w-2xl mx-auto text-white/60 mt-6 text-lg">
            Biometric attendance, route scheduling, and real-time compliance analytics —
            purpose-built for Tri-M Global Logistics & Trading Inc. teams that need to prove
            field force deployment to every principal.
          </p>
        </Reveal>

        <Reveal delay={300}>
          <div className="flex items-center justify-center gap-4 mt-8">
            <a
              href="/login"
              className="bg-brand-500 hover:bg-brand-600 hover:scale-105 hover:shadow-lg hover:shadow-brand-500/30 transition text-white font-semibold px-6 py-3 rounded-lg"
            >
              Start free 14-day trial →
            </a>
            <a
              href="#demo"
              className="bg-white/5 hover:bg-white/10 hover:scale-105 border border-white/10 transition text-white font-semibold px-6 py-3 rounded-lg"
            >
              Watch 2-min demo
            </a>
          </div>

          <p className="text-white/40 text-sm mt-4">
            No credit card required · Cancel anytime · PDPA-compliant
          </p>
        </Reveal>

        <Reveal delay={400}>
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mt-14">
            {[
              ['80,000+', 'Merchandisers tracked'],
              ['950+', 'Agencies & principals'],
              ['99.4%', 'Route compliance rate']
            ].map(([stat, label]) => (
              <div
                key={label}
                className="bg-white/5 border border-white/10 rounded-xl py-5 hover:border-brand-500/50 hover:-translate-y-1 hover:bg-white/[0.07] transition-all cursor-default"
              >
                <div className="text-2xl font-bold text-white">{stat}</div>
                <div className="text-xs text-white/50 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
