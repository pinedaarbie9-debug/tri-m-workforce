import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import { useDashboardData } from '../hooks/useDashboardData'

export default function DashboardPage() {
  const { user } = useAuth()
  const { deployedToday, absentAwol, pendingLeaves, recentCheckins, loading, error } =
    useDashboardData()
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-base-950 text-white">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <span className="font-display font-bold text-lg">
          Tri-M<span className="text-brand-400">Workforce</span>
        </span>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-white/50">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-1.5 rounded-lg transition"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="container-page py-8">
        <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
        <p className="text-white/40 text-sm mb-8">Field force overview — today</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg p-4 mb-6">
            Could not load live data: {error}. Make sure your Supabase schema and .env are
            configured (see README.md).
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Stat label="Deployed Today" value={loading ? '—' : deployedToday} icon="👥" />
          <Stat label="Absent / AWOL" value={loading ? '—' : absentAwol} icon="📅" />
          <Stat label="Pending Leaves" value={loading ? '—' : pendingLeaves} icon="🔔" />
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="font-semibold mb-4">Recent Check-ins</h3>
          {loading ? (
            <p className="text-white/40 text-sm">Loading...</p>
          ) : recentCheckins.length === 0 ? (
            <p className="text-white/40 text-sm">
              No attendance logs yet. Insert rows into `attendance_logs` in Supabase to see them
              here.
            </p>
          ) : (
            <div className="space-y-3">
              {recentCheckins.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{c.merchandiser_name}</div>
                    <div className="text-white/40 text-xs">
                      {new Date(c.check_in_time).toLocaleTimeString()} · {c.store_name}
                    </div>
                  </div>
                  <span className="text-xs bg-white/5 px-2 py-1 rounded-full capitalize">
                    {c.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function Stat({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/50">{label}</span>
        <span>{icon}</span>
      </div>
      <div className="text-3xl font-bold mt-2">{value}</div>
    </div>
  )
}
