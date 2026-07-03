import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import Reveal from './Reveal'

const data = [
  { month: 'Jan', coverage: 82, attendance: 76 },
  { month: 'Feb', coverage: 85, attendance: 79 },
  { month: 'Mar', coverage: 84, attendance: 82 },
  { month: 'Apr', coverage: 88, attendance: 86 },
  { month: 'May', coverage: 90, attendance: 88 },
  { month: 'Jun', coverage: 93, attendance: 90 },
  { month: 'Jul', coverage: 95, attendance: 92 }
]

const bullets = [
  'Per-store and per-account compliance dashboards',
  'Tardiness and AWOL heatmaps by territory',
  'Manpower utilization vs. deployment targets',
  'Exportable reports for principal billing'
]

export default function AnalyticsSection() {
  return (
    <section id="analytics" className="py-20">
      <div className="container-page grid md:grid-cols-2 gap-12 items-center">
        <Reveal>
          <div>
            <span className="text-cyan-accent text-sm font-semibold uppercase tracking-wide">Analytics</span>
            <h2 className="font-display font-extrabold text-4xl text-white mt-3 leading-tight">
              Prove coverage <br />
              <span className="text-cyan-accent">to every principal.</span>
            </h2>
            <p className="text-white/50 mt-5">
              Show clients exactly where their merchandisers were, when they arrived, and how long
              they stayed — backed by biometric and GPS data, not paper logs.
            </p>
            <ul className="mt-6 space-y-3">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-2 text-white/70 text-sm hover:text-white transition-colors">
                  <span className="text-green-400 mt-0.5">✓</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal delay={150}>
          <div className="bg-base-900 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-colors duration-300">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-semibold text-white text-sm">Route Coverage & Attendance</h4>
                <p className="text-xs text-white/40">January — July 2025</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data}>
                <XAxis dataKey="month" stroke="#ffffff30" fontSize={10} />
                <YAxis stroke="#ffffff30" fontSize={10} domain={[70, 100]} />
                <Tooltip contentStyle={{ background: '#151529', border: 'none', borderRadius: 8 }} />
                <Line type="monotone" dataKey="coverage" stroke="#4CC9F0" strokeWidth={2} dot={false} animationDuration={1200} />
                <Line type="monotone" dataKey="attendance" stroke="#8B93FF" strokeWidth={2} dot={false} animationDuration={1200} animationBegin={200} />
              </LineChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-3 gap-4 mt-4 text-center">
              <div>
                <div className="text-xl font-bold text-white">92.4%</div>
                <div className="text-xs text-white/40">Avg Route Coverage</div>
              </div>
              <div>
                <div className="text-xl font-bold text-white">₱240K</div>
                <div className="text-xs text-white/40">Billing Hours Recovered</div>
              </div>
              <div>
                <div className="text-xl font-bold text-white">↓ 71%</div>
                <div className="text-xs text-white/40">AWOL Rate</div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
