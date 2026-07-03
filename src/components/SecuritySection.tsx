import Reveal from './Reveal'

const stats = [
  ['🔒', 'Fingerprint Scan', '0.001% false accept rate'],
  ['🛡️', 'Liveness Detection', 'Anti-spoofing AI'],
  ['⚡', '< 0.5s Verify', 'Sub-second response'],
  ['🔐', 'AES-256 Encrypted', 'Data at rest & in transit']
]

export default function SecuritySection() {
  return (
    <section className="py-20">
      <div className="container-page">
        <Reveal>
          <div className="bg-brand-900/40 bg-gradient-to-br from-brand-600/20 to-transparent border border-white/10 rounded-3xl p-10 grid md:grid-cols-2 gap-10 items-center hover:border-white/20 transition-colors duration-500">
            <div>
              <span className="text-brand-400 text-sm font-semibold uppercase tracking-wide">Security</span>
              <h2 className="font-display font-extrabold text-4xl text-white mt-3 leading-tight">
                No proxy check-ins. <br />
                <span className="text-brand-400">Ever again.</span>
              </h2>
              <p className="text-white/50 mt-5">
                Merchandising agencies lose billable hours to buddy punching every single day. Our
                biometric engine with liveness detection makes it physically impossible —
                protecting Tri-M Global Logistics & Trading Inc.'s revenue and its clients' trust.
              </p>
              <a href="#features" className="inline-block mt-6 text-brand-400 font-semibold text-sm hover:text-brand-300 hover:translate-x-1 transition-all">
                Explore biometric features →
              </a>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {stats.map(([icon, title, sub], i) => (
                <Reveal key={title} delay={i * 80}>
                  <div className="bg-base-900/60 border border-white/10 rounded-xl p-5 hover:border-brand-500/40 hover:-translate-y-1 hover:bg-base-900/90 transition-all duration-300">
                    <div className="text-lg mb-2">{icon}</div>
                    <div className="font-semibold text-white text-sm">{title}</div>
                    <div className="text-white/40 text-xs mt-1">{sub}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
