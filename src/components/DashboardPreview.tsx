import { LineChart, Line, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import Reveal from './Reveal'

const weekly = [
  { day: 'Mon', value: 230 },
  { day: 'Tue', value: 232 },
  { day: 'Wed', value: 228 },
  { day: 'Thu', value: 233 },
  { day: 'Fri', value: 235 },
  { day: 'Sat', value: 226 },
  { day: 'Sun', value: 150 }
]

const checkins = [
  { name: 'Juan Dela Cruz', time: '7:58 AM', store: 'SM North', status: 'On time' },
  { name: 'Lisa Mendoza', time: '8:10 AM', store: 'Robinsons', status: 'On time' },
  { name: 'Carlo Reyes', time: '9:45 AM', store: 'Puregold', status: 'Late' }
]

export default function DashboardPreview() {
  return (
    <section className="pb-20">
      <div className="container-page">
        <Reveal delay={150}>
          <div className="bg-base-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl hover:border-white/20 transition-colors duration-500">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
              <span className="w-3 h-3 rounded-full bg-red-500/70" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <span className="w-3 h-3 rounded-full bg-green-500/70" />
              <span className="mx-auto text-xs text-white/40 bg-white/5 px-3 py-1 rounded-full">
                app.tri-mworkforce.ph/dashboard
              </span>
            </div>

            <div className="p-6 grid md:grid-cols-3 gap-4">
              <StatCard label="Deployed Today" value="226" sub="97% route coverage" subColor="text-green-400" icon="👥" />
              <StatCard label="Absent / AWOL" value="7" sub="3 unexcused" subColor="text-amber-400" icon="📅" />
              <StatCard label="Pending Leaves" value="4" sub="Needs approval" subColor="text-brand-400" icon="🔔" />
            </div>

            <div className="px-6 pb-6 grid md:grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors">
                <h4 className="font-semibold text-white text-sm">Weekly Attendance</h4>
                <p className="text-xs text-white/40 mb-2">Past 7 days</p>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={weekly}>
                    <XAxis dataKey="day" stroke="#ffffff30" fontSize={10} />
                    <YAxis stroke="#ffffff30" fontSize={10} />
                    <Line type="monotone" dataKey="value" stroke="#8B93FF" strokeWidth={2} dot={false} animationDuration={1200} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors">
                <h4 className="font-semibold text-white text-sm mb-3">Recent Check-ins</h4>
                <div className="space-y-3">
                  {checkins.map((c) => (
                    <div key={c.name} className="flex items-center justify-between text-sm hover:bg-white/5 -mx-2 px-2 py-1 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-brand-500/30 flex items-center justify-center text-xs text-brand-300">
                          {c.name[0]}
                        </span>
                        <div>
                          <div className="text-white">{c.name}</div>
                          <div className="text-white/40 text-xs">{c.time} · {c.store}</div>
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          c.status === 'On time'
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function StatCard({
  label,
  value,
  sub,
  subColor,
  icon
}: {
  label: string
  value: string
  sub: string
  subColor: string
  icon: string
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-brand-500/40 hover:-translate-y-1 transition-all duration-300">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/50">{label}</span>
        <span className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">{icon}</span>
      </div>
      <div className="text-3xl font-bold text-white mt-2">{value}</div>
      <div className={`text-xs mt-1 ${subColor}`}>{sub}</div>
    </div>
  )
}
