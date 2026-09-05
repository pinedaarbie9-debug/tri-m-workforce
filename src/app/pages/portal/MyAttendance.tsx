import { useState, useEffect, useCallback } from "react";
import { Clock, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { motion } from "motion/react";
import { api } from "../../../lib/api";

const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
  present:  { label: "Present",  className: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  absent:   { label: "Absent",   className: "bg-red-100 text-red-700 border-red-200",             icon: XCircle },
  late:     { label: "Late",     className: "bg-amber-100 text-amber-700 border-amber-200",       icon: AlertCircle },
  half_day: { label: "Half Day", className: "bg-blue-100 text-blue-700 border-blue-200",           icon: Clock },
  on_leave: { label: "On Leave", className: "bg-purple-100 text-purple-700 border-purple-200",     icon: Clock },
  holiday:  { label: "Holiday",  className: "bg-gray-100 text-gray-600 border-gray-200",           icon: Clock },
};

export function MyAttendancePage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMyAttendance();
      setRecords(data);
    } catch (err: any) {
      console.error("Failed to fetch attendance:", err);
      setError(err.message ?? "Failed to load your attendance");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const summary = {
    present: records.filter((r) => r.status === "present").length,
    absent: records.filter((r) => r.status === "absent").length,
    late: records.filter((r) => r.status === "late").length,
  };

  return (
    <div className="p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-indigo-700 p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Clock className="w-7 h-7" /> My Attendance</h1>
            <p className="text-white/70 text-sm mt-1">Kasaysayan ng iyong pagpasok</p>
          </div>
          <div className="flex gap-3">
            {[
              { label: "Present", value: summary.present },
              { label: "Absent", value: summary.absent },
              { label: "Late", value: summary.late },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 rounded-xl px-4 py-2 border border-white/20 text-center">
                <p className="text-white/60 text-xs">{s.label}</p>
                <p className="text-white font-bold text-xl">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading...
        </div>
      )}
      {!loading && error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && (
        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Check In</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Check Out</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Work Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {records.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">Walang attendance record na nahanap.</td></tr>
                )}
                {records.map((r) => {
                  const cfg = statusConfig[r.status] ?? statusConfig.present;
                  const Icon = cfg.icon;
                  return (
                    <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-4 text-sm text-foreground font-medium">{r.date?.slice(0, 10)}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.className}`}>
                          <Icon className="w-3 h-3" /> {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-muted-foreground font-mono">{r.check_in ?? "—"}</td>
                      <td className="px-5 py-4 text-sm text-muted-foreground font-mono">{r.check_out ?? "—"}</td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">{r.work_hours ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}