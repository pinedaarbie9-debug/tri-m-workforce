// src/app/pages/Analytics.tsx
// Totoong data na ito (GET /api/analytics). Wala nang hardcoded na numero.
import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, Users, Clock, Loader2, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import { api, type AnalyticsResponse } from "../../lib/api";

type Period = "quarter" | "half" | "year";

const DEPT_COLORS = ["#7c3aed", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];
const LEAVE_COLORS = ["#7c3aed", "#ef4444", "#f59e0b", "#ec4899", "#06b6d4", "#10b981", "#94a3b8"];
const UNASSIGNED_COLOR = "#64748b";

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid rgba(148,163,184,0.3)",
  fontSize: 14,
  backgroundColor: "rgba(15,15,25,0.95)",
  color: "#fff",
} as const;

const gridStroke = "rgba(148,163,184,0.25)";

const fmt = (n: number | null | undefined, suffix = "") =>
  n === null || n === undefined ? "—" : `${n.toFixed(1)}${suffix}`;

// "+1.8% vs last period" o "No prior data"
function trendText(cur: number | null, prev: number | null, unit: string) {
  if (cur === null || prev === null) return { text: "No prior data", tone: "muted" as const };
  const d = Math.round((cur - prev) * 10) / 10;
  if (d === 0) return { text: `No change vs last period`, tone: "muted" as const };
  return {
    text: `${d > 0 ? "+" : ""}${d}${unit} vs last period`,
    tone: d > 0 ? ("up" as const) : ("down" as const),
  };
}

const toneClass = { up: "text-emerald-500", down: "text-red-500", muted: "text-muted-foreground" };

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[260px] flex items-center justify-center text-center text-base text-muted-foreground px-6">
      {children}
    </div>
  );
}

export function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("quarter");
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [labels, setLabels] = useState<Record<Period, string>>({ quarter: "Quarter", half: "Half", year: "Year" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getAnalytics(period)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        // Itabi ang label (Q4 / H2 / 2026) para lumabas sa toggle kahit hindi pa napipili
        setLabels((l) => ({ ...l, [period]: res.label }));
      })
      .catch((err: any) => {
        if (!cancelled) setError(err.message ?? "Failed to load analytics.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period, tick]);

  // Itakda ang tamang label sa lahat ng toggle kahit una pa lang (ayon sa kasalukuyang petsa)
  useEffect(() => {
    const now = new Date();
    const m = now.getMonth(); // 0-11
    setLabels({
      quarter: `Q${Math.floor(m / 3) + 1}`,
      half: m < 6 ? "H1" : "H2",
      year: String(now.getFullYear()),
    });
  }, []);

  const k = data?.kpis;
  const attTrend = k ? trendText(k.attendance_rate, k.attendance_rate_prev, "%") : null;
  const hrsTrend = k ? trendText(k.avg_hours_week, k.avg_hours_week_prev, "h") : null;

  const kpis = k
    ? [
        {
          label: "Avg Tenure",
          value: fmt(k.avg_tenure_years, " yrs"),
          sub: `${k.active_employees} active employees`,
          tone: "muted" as const,
          icon: Users,
          color: "#7c3aed",
        },
        {
          label: "Turnover Rate",
          value: fmt(k.turnover_rate, "%"),
          sub: `${k.separated_employees} of ${k.total_employees} employees (all-time)`,
          tone: "muted" as const,
          icon: TrendingUp,
          color: "#10b981",
        },
        {
          label: "Avg Hours/Week",
          value: fmt(k.avg_hours_week, "h"),
          sub: hrsTrend!.text,
          tone: hrsTrend!.tone,
          icon: Clock,
          color: "#06b6d4",
        },
        {
          label: "Attendance Rate",
          value: fmt(k.attendance_rate, "%"),
          sub: attTrend!.text,
          tone: attTrend!.tone,
          icon: BarChart3,
          color: "#f59e0b",
        },
      ]
    : [];

  const attHasData = data?.attendance_by_month.some((m) => m.rate !== null) ?? false;
  const otHasData = data?.overtime_trend.some((w) => w.hours > 0) ?? false;
  const leaveTotal = data?.leave_distribution.reduce((n, x) => n + x.value, 0) ?? 0;

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-indigo-700 p-6 sm:p-8 text-white shadow-lg"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <BarChart3 className="w-7 h-7 sm:w-8 sm:h-8" /> Workforce Analytics
            </h1>
            <p className="text-white/80 text-sm sm:text-base mt-1.5">
              Live data from your workforce records
              {data ? ` · ${data.range_text}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start shrink-0">
            <div className="flex items-center gap-1 bg-white/10 rounded-xl p-1 border border-white/20">
              {(["quarter", "half", "year"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    period === p ? "bg-white text-primary" : "text-white/80 hover:text-white"
                  }`}
                >
                  {labels[p]}
                </button>
              ))}
            </div>
            <button
              onClick={() => setTick((t) => t + 1)}
              className="w-11 h-11 rounded-xl flex items-center justify-center bg-white/10 border border-white/20 hover:bg-white/20 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </motion.div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-base text-red-700">
          Failed to load analytics: {error}
        </div>
      )}

      {loading && !data && (
        <div className="flex items-center justify-center py-24 text-muted-foreground text-base">
          <Loader2 className="w-6 h-6 mr-2 animate-spin" /> Loading analytics...
        </div>
      )}

      {data && (
        <div className={`space-y-5 sm:space-y-6 transition-opacity ${loading ? "opacity-60" : ""}`}>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi, i) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-2xl p-5 shadow-sm border border-border"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground uppercase truncate">{kpi.label}</p>
                    <p className="text-3xl font-bold mt-1.5 text-foreground truncate">{kpi.value}</p>
                    <p className={`text-sm font-medium mt-1.5 ${toneClass[kpi.tone]}`}>{kpi.sub}</p>
                  </div>
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${kpi.color}20` }}
                  >
                    <kpi.icon className="w-6 h-6" style={{ color: kpi.color }} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Headcount + Attendance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
              <h3 className="text-lg font-semibold text-foreground">Headcount by Department</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Active employees · {data.kpis.active_employees} total
              </p>
              {data.headcount_by_dept.length === 0 ? (
                <EmptyState>No active employees yet.</EmptyState>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.headcount_by_dept} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis dataKey="dept" interval={0} tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 13, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(148,163,184,0.1)" }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Employees">
                      {data.headcount_by_dept.map((entry, index) => (
                        <Cell
                          key={entry.dept}
                          fill={entry.dept === "Unassigned" ? UNASSIGNED_COLOR : DEPT_COLORS[index % DEPT_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
              <h3 className="text-lg font-semibold text-foreground">Monthly Attendance Rate</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Scheduled days attended (finished days only, approved leave excluded)
              </p>
              {!attHasData ? (
                <EmptyState>
                  No scheduled shifts with finished days in this period yet. The rate appears once shifts are assigned
                  and the day has closed.
                </EmptyState>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={data.attendance_by_month} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis dataKey="month" tick={{ fontSize: 13, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 13, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v: any, _n: any, item: any) =>
                        v === null || v === undefined
                          ? ["No data", "Rate"]
                          : [`${v}% (${item.payload.attended}/${item.payload.scheduled} days)`, "Rate"]
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="rate"
                      stroke="#7c3aed"
                      strokeWidth={2.5}
                      fill="url(#attGrad)"
                      name="Attendance %"
                      connectNulls={false}
                      dot={{ r: 4, fill: "#7c3aed" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Leave + Overtime */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
              <h3 className="text-lg font-semibold text-foreground">Leave Distribution</h3>
              <p className="text-sm text-muted-foreground mb-4">Approved leave days in this period</p>
              {leaveTotal === 0 ? (
                <EmptyState>No approved leave in this period.</EmptyState>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={data.leave_distribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                      >
                        {data.leave_distribution.map((entry, index) => (
                          <Cell key={entry.name} fill={LEAVE_COLORS[index % LEAVE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v} days`, "Leave"]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-3">
                    {data.leave_distribution.map((item, index) => (
                      <div key={item.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: LEAVE_COLORS[index % LEAVE_COLORS.length] }}
                          />
                          <span className="text-muted-foreground truncate capitalize">
                            {String(item.name).replace(/_/g, " ")}
                          </span>
                        </div>
                        <span className="font-semibold text-foreground shrink-0">
                          {item.value} {item.value === 1 ? "day" : "days"}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="lg:col-span-2 bg-card rounded-2xl p-5 shadow-sm border border-border">
              <h3 className="text-lg font-semibold text-foreground">Weekly Overtime Hours</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Total overtime across all employees · week starting (last 12 weeks)
              </p>
              {!otHasData ? (
                <EmptyState>No overtime recorded in this period.</EmptyState>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={data.overtime_trend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis dataKey="week" tick={{ fontSize: 13, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 13, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v}h`, "Overtime"]} />
                    <Line
                      type="monotone"
                      dataKey="hours"
                      stroke="#06b6d4"
                      strokeWidth={2.5}
                      dot={{ fill: "#06b6d4", r: 4 }}
                      name="Hours"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}