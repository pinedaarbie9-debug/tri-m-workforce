// src/app/pages/Dashboard.tsx
import { useState, useEffect, useCallback } from "react";
import {
  Users, Clock, Palmtree, TrendingUp, TrendingDown, UserPlus,
  AlertTriangle, Timer, Percent, ArrowRight, CheckCircle2, Loader2,
} from "lucide-react";
import { motion } from "motion/react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import { format } from "date-fns";
import { api } from "../../lib/api";

interface StatCardProps {
  label: string; value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number; trendLabel?: string; color: string; delay?: number;
}
function StatCard({ label, value, icon: Icon, trend, trendLabel, color, delay = 0 }: StatCardProps) {
  const isPositive = (trend ?? 0) >= 0;
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.35 }}
      className="bg-card rounded-2xl p-5 shadow-sm border border-border hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
          {trend !== undefined && (
            <div className="mt-2 flex items-center gap-1">
              {isPositive ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> : <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
              <span className={`text-xs font-medium ${isPositive ? "text-emerald-600" : "text-red-500"}`}>{isPositive ? "+" : ""}{trend}%</span>
              {trendLabel && <span className="text-xs text-muted-foreground">{trendLabel}</span>}
            </div>
          )}
        </div>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15`, color }}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );
}

const statusStyle: Record<string, { label: string; className: string; icon: React.ComponentType<{ className?: string }> }> = {
  check_in:  { label: "Checked In",  className: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  check_out: { label: "Checked Out", className: "bg-blue-100 text-blue-700",       icon: CheckCircle2 },
};

const POLL_MS = 20000;

export function DashboardPage() {
  const { user } = useAuth();
  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<any>(null);
  const [shiftDistribution, setShiftDistribution] = useState<{ name: string; value: number; color: string }[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const fetchDashboardStats = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const [statsRes, activityRes, shiftRes] = await Promise.all([
        api.getDashboardStats(),
        api.getRecentActivity(),
        api.getShiftDistribution(),
      ]);
      setStats(statsRes);
      setRecentActivity(activityRes);
      setShiftDistribution(shiftRes);
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setError(err.message ?? "Failed to load dashboard data");
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
    const interval = setInterval(() => fetchDashboardStats(false), POLL_MS);
    return () => clearInterval(interval);
  }, [fetchDashboardStats]);

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">Failed to load dashboard: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Banner */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-indigo-700 p-6 text-white shadow-lg">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-white/70 text-sm">{format(now, "EEEE, MMMM d, yyyy")}</p>
            <h1 className="text-2xl font-bold mt-1">{greeting}, {user?.full_name?.split(" ")[0] ?? "there"} 👋</h1>
            <p className="text-white/70 text-sm mt-1">Automated Report Generation · Real-Time HR Monitoring · Support Evaluation · Cloud-Based</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
              <p className="text-white/60 text-xs">Today&apos;s Attendance</p>
              <p className="text-white font-bold text-2xl">{loading ? "…" : `${stats?.attendanceRate ?? 0}%`}</p>
            </div>
            <div className="text-right bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
              <p className="text-white/60 text-xs">Active Employees</p>
              <p className="text-white font-bold text-2xl">{loading ? "…" : stats?.totalEmployees ?? 0}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading dashboard...
        </div>
      )}

      {!loading && stats && (
        <>
          {/* Stats Row 1 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Employees" value={stats.totalEmployees} icon={Users} color="#7c3aed" delay={0.05} />
            <StatCard label="Present Today" value={stats.presentToday} icon={Clock} color="#06b6d4" delay={0.1} />
            <StatCard label="On Leave" value={stats.onLeaveToday} icon={Palmtree} color="#f59e0b" delay={0.15} />
            <StatCard label="New Hires" value={stats.newHires} icon={UserPlus} color="#10b981" delay={0.2} />
          </div>

          {/* Stats Row 2 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Avg. Work Hours" value={`${stats.avgWorkHours}h`} icon={Timer} color="#8b5cf6" delay={0.25} />
            <StatCard label="Pending Leaves" value={stats.pendingLeaves} icon={AlertTriangle} color="#ef4444" delay={0.3} />
            <StatCard label="Overtime Hours" value={`${stats.monthOvertimeHours}h`} icon={Clock} color="#06b6d4" delay={0.35} />
            <StatCard label="Attendance Rate" value={`${stats.attendanceRate}%`} icon={Percent} color="#10b981" delay={0.4} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
              className="lg:col-span-2 bg-card rounded-2xl p-5 shadow-sm border border-border">
              <div className="mb-4">
                <h3 className="font-semibold text-foreground">Monthly Attendance Trend</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Present vs absent employees per month</p>
              </div>
              {(!stats.monthlyTrend || stats.monthlyTrend.length === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-10">Walang sapat na attendance data pa para sa trend.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={stats.monthlyTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.15} /><stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }} labelStyle={{ fontWeight: 600 }} />
                    <Area type="monotone" dataKey="present" stroke="#7c3aed" strokeWidth={2} fill="url(#colorPresent)" name="Present %" />
                    <Area type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} fill="url(#colorAbsent)" name="Absent %" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              className="bg-card rounded-2xl p-5 shadow-sm border border-border">
              <div className="mb-4">
                <h3 className="font-semibold text-foreground">Shift Distribution</h3>
                <p className="text-xs text-muted-foreground mt-0.5">By shift type today</p>
              </div>
              {shiftDistribution.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">Walang naka-schedule na shift ngayong araw.</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={shiftDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                        {shiftDistribution.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-2">
                    {shiftDistribution.map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-muted-foreground text-xs">{item.name}</span>
                        </div>
                        <span className="font-semibold text-foreground text-xs">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          </div>

          {/* Recent Activity */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
            className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
            <div className="flex items-center justify-between p-5 pb-0">
              <div>
                <h3 className="font-semibold text-foreground">Recent Activity</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Today&apos;s workforce activity log</p>
              </div>
              <button className="text-xs text-primary font-medium flex items-center gap-1 hover:gap-2 transition-all">
                View All <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Employee</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Department</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Action</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Time</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentActivity.length === 0 && (
                    <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">Walang recent activity na nakita.</td></tr>
                  )}
                  {recentActivity.map((item) => {
                    const style = statusStyle[item.type] ?? statusStyle.check_in;
                    const Icon = style.icon;
                    const empName = item.employee?.full_name ?? "Unknown";
                    return (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                              {empName.split(" ").map((n: string) => n[0]).join("")}
                            </div>
                            <span className="text-sm font-medium text-foreground">{empName}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-muted-foreground">{item.employee?.department?.name ?? "—"}</td>
                        <td className="px-5 py-3.5 text-sm text-foreground capitalize">{item.method} {item.type.replace("_", " ")}</td>
                        <td className="px-5 py-3.5 text-sm text-muted-foreground font-mono">{format(new Date(item.timestamp), "h:mm a")}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${style.className}`}>
                            <Icon className="w-3 h-3" /> {style.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
