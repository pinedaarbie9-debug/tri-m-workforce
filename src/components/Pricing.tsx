import Reveal from './Reveal'

const plans = [
  {
    name: 'Starter',
    price: '₱2,499',
    desc: 'For small merchandising teams',
    features: ['Up to 50 merchandisers', 'Biometric device support', 'GPS attendance & timesheets'],
    highlight: false
  },
  {
    name: 'Business',
    price: '₱5,999',
    desc: 'For multi-account agencies',
    features: ['Up to 300 merchandisers', 'Everything in Starter', 'Route & shift scheduling'],
    highlight: true
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    desc: 'For large field force deployments',
    features: ['Unlimited headcount', 'Everything in Business', 'Multi-principal dashboards'],
    highlight: false
  }
]

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 text-center">
      <div className="container-page">
        <Reveal>
          <h2 className="font-display font-extrabold text-4xl md:text-5xl text-white">
            Simple, transparent <span className="text-white/40">pricing.</span>
          </h2>
          <p className="text-white/50 mt-4 max-w-xl mx-auto">
            No hidden fees. No per-module charges. One flat price for Tri-M Global Logistics &
            Trading Inc.'s entire business.
          </p>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-6 mt-14 text-left">
          {plans.map((p, i) => (
            <Reveal key={p.name} delay={i * 100}>
              <div
                className={`relative rounded-2xl p-8 border transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${
                  p.highlight
                    ? 'bg-brand-600/10 border-brand-500 md:scale-105 hover:shadow-brand-500/20'
                    : 'bg-white/5 border-white/10 hover:border-white/20 hover:shadow-black/20'
                }`}
              >
                {p.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-xs font-semibold px-3 py-1 rounded-full animate-pulse">
                    Most popular
                  </span>
                )}
                <div className="text-brand-400 text-sm mb-2">{p.name}</div>
                <div className="text-4xl font-bold text-white">
                  {p.price}
                  {p.price !== 'Custom' && <span className="text-base text-white/40">/mo</span>}
                </div>
                <p className="text-white/40 text-sm mt-2">{p.desc}</p>
                <a
                  href="/login"
                  className={`block text-center mt-6 mb-6 py-2.5 rounded-lg font-semibold text-sm transition hover:scale-[1.03] ${
                    p.highlight
                      ? 'bg-brand-500 hover:bg-brand-600 text-white hover:shadow-lg hover:shadow-brand-500/30'
                      : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white'
                  }`}
                >
                  {p.price === 'Custom' ? 'Contact sales' : 'Start free trial'}
                </a>
                <ul className="space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-white/60">
                      <span className="text-green-400">✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
