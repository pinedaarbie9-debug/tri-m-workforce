import Reveal from './Reveal'

export default function CTA() {
  return (
    <section className="py-20">
      <div className="container-page">
        <Reveal>
          <div className="bg-brand-gradient animated-gradient rounded-3xl text-center py-16 px-6 hover:shadow-2xl hover:shadow-brand-500/20 transition-shadow duration-500">
            <h2 className="font-display font-extrabold text-3xl md:text-4xl text-white">
              Stop losing billable hours to ghost attendance.
            </h2>
            <p className="text-white/80 mt-4 max-w-xl mx-auto">
              Join 950+ merchandising agencies already running tighter operations with
              Tri-M Global Logistics & Trading Inc.'s Workforce360. Setup takes less than a day.
            </p>
            <div className="flex items-center justify-center gap-4 mt-8">
              <a href="/login" className="bg-white text-brand-600 font-semibold px-6 py-3 rounded-lg hover:scale-105 hover:shadow-lg transition-transform">
                Start free 14-day trial →
              </a>
              <a href="#demo" className="bg-white/20 text-white font-semibold px-6 py-3 rounded-lg hover:bg-white/30 hover:scale-105 transition">
                Schedule a demo
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
