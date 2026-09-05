import { useState } from "react";
import { BarChart3, TrendingUp, Users, Clock } from "lucide-react";
import { motion } from "motion/react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, RadialBarChart, RadialBar,
} from "recharts";

const headcountByDept = [
  { dept: "Engineering", count: 72, color: "#7c3aed" },
  { dept: "Sales", count: 48, color: "#06b6d4" },
  { dept: "Design", count: 24, color: "#10b981" },
  { dept: "Marketing", count: 32, color: "#f59e0b" },
  { dept: "HR", count: 18, color: "#ef4444" },
  { dept: "Finance", count: 20, color: "#8b5cf6" },
];

const attendanceByMonth = [
  { month: "Jan", rate: 92.1 },
  { month: "Feb", rate: 88.5 },
  { month: "Mar", rate: 95.3 },
  { month: "Apr", rate: 91.8 },
  { month: "May", rate: 97.2 },
  { month: "Jun", rate: 94.6 },
  { month: "Jul", rate: 96.4 },
];

const leaveDistribution = [
  { name: "Annual", value: 42, color: "#7c3aed" },
  { name: "Sick", value: 28, color: "#ef4444" },
  { name: "Emergency", value: 12, color: "#f59e0b" },
  { name: "Maternity/Paternity", value: 10, color: "#ec4899" },
  { name: "Unpaid", value: 8, color: "#94a3b8" },
];

const overtimeTrend = [
  { week: "W1", hours: 48 },
  { week: "W2", hours: 62 },
  { week: "W3", hours: 35 },
  { week: "W4", hours: 78 },
  { week: "W5", hours: 54 },
  { week: "W6", hours: 41 },
  { week: "W7", hours: 67 },
  { week: "W8", hours: 52 },
];

const retentionData = [
  { name: "Retained", value: 94, fill: "#7c3aed" },
  { name: "Turnover", value: 6, fill: "#ef4444" },
];

export function AnalyticsPage() {
  const [period, setPeriod] = useState<"quarter" | "half" | "year">("quarter");

  return (
    <div className="p-6 space-y-6">
      {/* Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-indigo-700 p-6 text-white shadow-lg"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="w-7 h-7" /> Workforce Analytics</h1>
            <p className="text-white/70 text-sm mt-1">Data-driven insights for smarter workforce decisions</p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-xl p-1 border border-white/20">
            {(["quarter", "half", "year"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${period === p ? "bg-white text-primary" : "text-white/70 hover:text-white"}`}
              >
                {p === "quarter" ? "Q3" : p === "half" ? "H1" : "2024"}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Avg Tenure", value: "3.2 yrs", trend: "+0.4", icon: Users, color: "#7c3aed" },
          { label: "Turnover Rate", value: "6%", trend: "-1.2%", icon: TrendingUp, color: "#10b981" },
          { label: "Avg Hours/Week", value: "39.4h", trend: "+0.8", icon: Clock, color: "#06b6d4" },
          { label: "Attendance Rate", value: "96.4%", trend: "+1.8%", icon: BarChart3, color: "#f59e0b" },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card rounded-2xl p-4 shadow-sm border border-border"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">{kpi.label}</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{kpi.value}</p>
                <p className="text-xs text-emerald-600 font-medium mt-1">{kpi.trend} vs last period</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${kpi.color}15` }}>
                <kpi.icon className="w-5 h-5" style={{ color: kpi.color }} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Headcount by Department */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl p-5 shadow-sm border border-border"
        >
          <h3 className="font-semibold text-foreground mb-1">Headcount by Department</h3>
          <p className="text-xs text-muted-foreground mb-4">Current employee distribution</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={headcountByDept} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="dept" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Employees">
                {headcountByDept.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Attendance Rate Trend */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-card rounded-2xl p-5 shadow-sm border border-border"
        >
          <h3 className="font-semibold text-foreground mb-1">Monthly Attendance Rate</h3>
          <p className="text-xs text-muted-foreground mb-4">Percentage of employees present</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={attendanceByMonth} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis domain={[85, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => [`${v}%`, "Rate"]} contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Area type="monotone" dataKey="rate" stroke="#7c3aed" strokeWidth={2} fill="url(#attGrad)" name="Attendance %" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Leave Distribution */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl p-5 shadow-sm border border-border"
        >
          <h3 className="font-semibold text-foreground mb-1">Leave Distribution</h3>
          <p className="text-xs text-muted-foreground mb-4">By leave type this year</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={leaveDistribution} cx="50%" cy="50%" outerRadius={70} paddingAngle={2} dataKey="value">
                {leaveDistribution.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {leaveDistribution.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
                <span className="font-semibold text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Overtime Trend */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="lg:col-span-2 bg-card rounded-2xl p-5 shadow-sm border border-border"
        >
          <h3 className="font-semibold text-foreground mb-1">Weekly Overtime Hours</h3>
          <p className="text-xs text-muted-foreground mb-4">Total overtime across all departments</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={overtimeTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => [`${v}h`, "Overtime"]} contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Line type="monotone" dataKey="hours" stroke="#06b6d4" strokeWidth={2.5} dot={{ fill: "#06b6d4", r: 4 }} name="Hours" />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
}
