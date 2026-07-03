import Reveal from './Reveal'

const testimonials = [
  {
    quote:
      'Workforce360 eliminated ghost attendance across all our accounts. Our principals now get real-time compliance reports.',
    name: 'Maria Santos',
    role: 'Operations Head, Tri-M Global Logistics & Trading Inc.'
  },
  {
    quote:
      'We manage 400+ merchandisers across Luzon. Route scheduling used to take two days — now it takes minutes.',
    name: 'James Reyes',
    role: 'General Manager, Tri-M Global Logistics & Trading Inc.'
  },
  {
    quote:
      'The per-principal dashboard is a game changer. Our clients can see store coverage in real time.',
    name: 'Ana Gomez',
    role: 'CEO, Tri-M Global Logistics & Trading Inc.'
  }
]

export default function Testimonials() {
  return (
    <section id="customers" className="py-20 text-center">
      <div className="container-page">
        <Reveal>
          <span className="text-brand-400 text-sm font-semibold uppercase tracking-wide">Testimonials</span>
          <h2 className="font-display font-extrabold text-4xl md:text-5xl text-white mt-3">
            Loved by HR teams <span className="text-white/40">across the country.</span>
          </h2>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-6 mt-14 text-left">
          {testimonials.map((t, i) => (
            <Reveal key={t.name} delay={i * 100}>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:-translate-y-2 hover:border-white/20 hover:shadow-xl hover:shadow-black/20 transition-all duration-300">
                <div className="text-amber-400 text-sm mb-3">★★★★★</div>
                <p className="text-white/70 text-sm leading-relaxed">"{t.quote}"</p>
                <div className="mt-5 flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-brand-500/30 flex items-center justify-center text-xs text-brand-300">
                    {t.name[0]}
                  </span>
                  <div>
                    <div className="text-white text-sm font-semibold">{t.name}</div>
                    <div className="text-white/40 text-xs">{t.role}</div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
