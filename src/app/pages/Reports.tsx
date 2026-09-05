import { useState, useEffect, useCallback } from "react";
import { FileText, Download, RefreshCw, CheckCircle2, Clock, AlertCircle, BarChart3, Users, CalendarDays, FileSpreadsheet } from "lucide-react";
import { motion } from "motion/react";
import { api, exportToCsv } from "../../lib/api";

interface GeneratedReport {
  id: string;
  name: string;
  type: string;
  generated_at: string;
  generated_by: string;
  status: "ready" | "generating" | "failed";
  size: string;
}

const reportTemplates = [
  { id: "attendance-summary", label: "Attendance Summary", icon: Clock, desc: "Daily/monthly attendance overview", color: "text-purple-600 bg-purple-50", type: "Attendance", fetcher: () => api.getAttendanceSummaryReport() },
  { id: "headcount", label: "Headcount Report", icon: Users, desc: "Employee count by department", color: "text-blue-600 bg-blue-50", type: "Headcount", fetcher: () => api.getHeadcountReport() },
  { id: "leave-summary", label: "Leave Summary", icon: CalendarDays, desc: "Leave utilization and balances", color: "text-emerald-600 bg-emerald-50", type: "Leave", fetcher: () => api.getLeaveSummaryReport() },
  { id: "timesheet", label: "Timesheet Report", icon: FileSpreadsheet, desc: "Work hours and overtime", color: "text-amber-600 bg-amber-50", type: "Timesheet", fetcher: () => api.getTimesheetReport() },
  { id: "overtime", label: "Overtime Analysis", icon: BarChart3, desc: "Performance and trend data", color: "text-red-600 bg-red-50", type: "Overtime", fetcher: () => api.getOvertimeReport() },
  { id: "audit-export", label: "Audit Log Export", icon: FileText, desc: "System activity and changes", color: "text-gray-600 bg-gray-50", type: "Audit", fetcher: () => api.getAuditExportReport() },
];

const statusConfig = {
  ready:      { label: "Ready",      className: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  generating: { label: "Generating", className: "bg-blue-100 text-blue-700",       icon: RefreshCw },
  failed:     { label: "Failed",     className: "bg-red-100 text-red-700",         icon: AlertCircle },
};

const typeColors: Record<string, string> = {
  Attendance: "bg-purple-100 text-purple-700",
  Headcount:  "bg-blue-100 text-blue-700",
  Leave:      "bg-emerald-100 text-emerald-700",
  Overtime:   "bg-orange-100 text-orange-700",
  Timesheet:  "bg-amber-100 text-amber-700",
  Audit:      "bg-gray-100 text-gray-700",
};

export function ReportsPage() {
  const [generating, setGenerating] = useState<string | null>(null);
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [summary, setSummary] = useState({ totalReports: 6, ready: 0 });
  const [currentUserName, setCurrentUserName] = useState("System");

  const loadSummary = useCallback(async () => {
    try {
      const data = await api.getReportsSummary();
      setSummary(data);
    } catch (err) {
      console.error("Failed to load reports summary", err);
    }
  }, []);

  useEffect(() => {
    loadSummary();
    api.me().then((user) => setCurrentUserName(user?.full_name ?? "System")).catch(() => {});
  }, [loadSummary]);

  async function handleGenerate(tpl: typeof reportTemplates[number]) {
    setGenerating(tpl.id);
    try {
      const data = await tpl.fetcher();
      const rows = data.rows ?? [];
      const sizeKB = rows.length ? (JSON.stringify(rows).length / 1024).toFixed(1) : "0";

      // IMPORTANT: a successful fetch that returns 0 rows is NOT a failure —
      // it just means there's no data yet for that period (e.g. no attendance
      // logged this month, no audit events, etc). Only a thrown error
      // (network/server/SQL issue, caught below) should count as "failed".
      const newReport: GeneratedReport = {
        id: `${tpl.id}-${Date.now()}`,
        name: `${tpl.label} — ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
        type: tpl.type,
        generated_at: new Date().toISOString().slice(0, 16).replace("T", " "),
        generated_by: currentUserName,
        status: "ready",
        size: rows.length ? `${sizeKB} KB` : "0 KB (no data)",
      };
      setReports((prev) => [newReport, ...prev]);

      if (rows.length) {
        exportToCsv(`${tpl.id}-${Date.now()}`, rows);
      } else {
        // Walang laman ang resulta — huwag mag-export ng blangkong CSV file,
        // sapat na yung entry sa Recent Reports na nagsasabing "0 KB (no data)".
        console.info(`${tpl.label}: generated successfully but no rows found for this period.`);
      }
    } catch (err) {
      console.error(`Failed to generate ${tpl.id}`, err);
      setReports((prev) => [
        {
          id: `${tpl.id}-${Date.now()}`,
          name: `${tpl.label} (failed)`,
          type: tpl.type,
          generated_at: new Date().toISOString().slice(0, 16).replace("T", " "),
          generated_by: currentUserName,
          status: "failed",
          size: "—",
        },
        ...prev,
      ]);
    } finally {
      setGenerating(null);
      loadSummary();
    }
  }

  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-indigo-700 p-6 text-white shadow-lg"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="w-7 h-7" /> Reports</h1>
            <p className="text-white/70 text-sm mt-1">Generate and download workforce reports</p>
          </div>
          <div className="flex gap-3">
            {[
              { label: "Total Reports", value: summary.totalReports },
              { label: "Ready", value: summary.ready },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 rounded-xl px-4 py-2 border border-white/20 text-center">
                <p className="text-white/60 text-xs">{s.label}</p>
                <p className="text-white font-bold text-xl">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <div>
        <h2 className="font-semibold text-foreground mb-3">Generate New Report</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {reportTemplates.map((tpl, i) => (
            <motion.button
              key={tpl.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => handleGenerate(tpl)}
              disabled={generating === tpl.id}
              className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all text-left disabled:opacity-60"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tpl.color}`}>
                {generating === tpl.id
                  ? <RefreshCw className="w-5 h-5 animate-spin" />
                  : <tpl.icon className="w-5 h-5" />
                }
              </div>
              <div>
                <p className="font-medium text-sm text-foreground">{tpl.label}</p>
                <p className="text-xs text-muted-foreground">{tpl.desc}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-foreground mb-3">Recent Reports</h2>
        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Report Name</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Generated At</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">By</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Size</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reports.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-sm text-muted-foreground">
                      No reports generated yet this session.
                    </td>
                  </tr>
                )}
                {reports.map((report) => {
                  const cfg = statusConfig[report.status];
                  const Icon = cfg.icon;
                  return (
                    <tr key={report.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-4 text-sm font-medium text-foreground max-w-[280px] truncate">{report.name}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[report.type] ?? "bg-gray-100 text-gray-700"}`}>{report.type}</span>
                      </td>
                      <td className="px-5 py-4 text-sm text-muted-foreground font-mono">{report.generated_at}</td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">{report.generated_by}</td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">{report.size}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-4" />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}