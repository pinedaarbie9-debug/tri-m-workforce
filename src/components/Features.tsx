import Reveal from './Reveal'

const features = [
  {
    icon: '🔒',
    title: 'Biometric Authentication',
    desc: 'Fingerprint and face ID check-in at every outlet. No buddy punching, no proxy — each merchandiser\'s identity is verified on-site.'
  },
  {
    icon: '⏱️',
    title: 'Field Attendance Tracking',
    desc: 'Real-time clock-in/out with GPS geo-tagging per store or territory. Know exactly where your merchandisers are, at all times.'
  },
  {
    icon: '🗓️',
    title: 'Route & Shift Scheduling',
    desc: 'Plan store coverage by area, account, or brand. Auto-assign merchandisers to routes based on territory and availability.'
  },
  {
    icon: '📄',
    title: 'Leave Management',
    desc: 'Self-service leave filing with multi-level client approval workflows. Balance tracking across regular, SL, VL, and emergency leave.'
  },
  {
    icon: '🕒',
    title: 'Timesheet Management',
    desc: 'Auto-generated timesheets from biometric and GPS data. Exportable for principal billing and payroll in one click.'
  },
  {
    icon: '📊',
    title: 'Merchandising Analytics',
    desc: 'Route coverage rates, store visit compliance, tardiness heatmaps, and manpower utilization — by account, region, or principal.'
  }
]

export default function Features() {
  return (
    <section id="features" className="py-20">
      <Reveal>
        <div className="container-page text-center mb-14">
          <span className="text-brand-400 text-sm font-semibold uppercase tracking-wide">Platform</span>
          <h2 className="font-display font-extrabold text-4xl md:text-5xl text-white mt-3">
            Built for how <span className="text-white/40">merchandising works.</span>
          </h2>
        </div>
      </Reveal>

      <div className="container-page grid md:grid-cols-3 gap-6">
        {features.map((f, i) => (
          <Reveal key={f.title} delay={i * 80}>
            <div className="group bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-brand-500/40 hover:-translate-y-2 hover:shadow-xl hover:shadow-brand-500/10 hover:bg-white/[0.07] transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-brand-500/20 flex items-center justify-center text-lg mb-4 group-hover:scale-110 group-hover:bg-brand-500/30 transition-transform duration-300">
                {f.icon}
              </div>
              <h3 className="font-semibold text-white text-lg mb-2">{f.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
