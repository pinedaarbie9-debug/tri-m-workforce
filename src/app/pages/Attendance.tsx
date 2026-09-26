// src/app/pages/Attendance.tsx
import { useState, useEffect, useCallback } from "react";
import { Search, Download, ChevronLeft, ChevronRight, Clock, CheckCircle2, XCircle, AlertCircle, CalendarDays, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { format } from "date-fns";
import { api } from "../../lib/api";
import type { Attendance, AttendanceStatus } from "../../types";

const statusConfig: Record<AttendanceStatus, { label: string; className: string; icon: React.ComponentType<{ className?: string }> }> = {
  present:  { label: "Present",  className: "bg-emerald-100 text-emerald-700",  icon: CheckCircle2 },
  absent:   { label: "Absent",   className: "bg-red-100 text-red-700",          icon: XCircle },
  late:     { label: "Late",     className: "bg-amber-100 text-amber-700",      icon: AlertCircle },
  half_day: { label: "Half Day", className: "bg-blue-100 text-blue-700",        icon: Clock },
  on_leave: { label: "On Leave", className: "bg-purple-100 text-purple-700",    icon: CalendarDays },
  holiday:  { label: "Holiday",  className: "bg-gray-100 text-gray-600",        icon: CalendarDays },
};

const POLL_MS = 15000;

export function AttendancePage() {
  const [records, setRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | "all">("all");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [page, setPage] = useState(1);
  const perPage = 6;

  const fetchAttendance = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const data = await api.getAttendance({ date });
      setRecords(data);
    } catch (err: any) {
      console.error("Failed to fetch attendance:", err);
      setError(err.message ?? "Failed to load attendance");
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchAttendance();
    const interval = setInterval(() => fetchAttendance(false), POLL_MS);
    return () => clearInterval(interval);
  }, [fetchAttendance]);

  const getEmpName = (r: any) => r.employee?.full_name ?? "Unknown";
  const getEmpCode = (r: any) => r.employee?.employee_code ?? "—";
  const getDeptName = (r: any) => r.employee?.department?.name ?? "—";

  const filtered = records.filter((r) => {
    const matchSearch = !search || getEmpName(r).toLowerCase().includes(search.toLowerCase()) || getEmpCode(r).toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));

  const summary = {
    present: records.filter((r) => r.status === "present").length,
    absent: records.filter((r) => r.status === "absent").length,
    late: records.filter((r) => r.status === "late").length,
    on_leave: records.filter((r) => r.status === "on_leave").length,
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-indigo-700 p-5 sm:p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold">Attendance Management</h1>
            <p className="text-white/70 text-xs sm:text-sm mt-1">Track and monitor employee attendance in real-time</p>
          </div>
          <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3 shrink-0">
            {[
              { label: "Present", value: summary.present, color: "bg-emerald-400/20 border-emerald-400/30" },
              { label: "Absent", value: summary.absent, color: "bg-red-400/20 border-red-400/30" },
              { label: "Late", value: summary.late, color: "bg-amber-400/20 border-amber-400/30" },
              { label: "On Leave", value: summary.on_leave, color: "bg-white/10 border-white/20" },
            ].map((s) => (
              <div key={s.label} className={`${s.color} rounded-xl px-3 py-2 sm:px-4 border text-center`}>
                <p className="text-white/60 text-[10px] sm:text-xs">{s.label}</p>
                <p className="text-white font-bold text-lg sm:text-xl">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="flex flex-col gap-3">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search employees..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40" />
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3">
          <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setPage(1); }}
            className="px-3 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20" />
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as AttendanceStatus | "all"); setPage(1); }}
            className="px-3 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="all">All Status</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
            <option value="on_leave">On Leave</option>
            <option value="half_day">Half Day</option>
          </select>
          <button className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm border border-border rounded-xl bg-card hover:bg-muted/50 transition-colors">
            <Download className="w-4 h-4" /> <span>Export</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading attendance...
        </div>
      )}
      {!loading && error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          Failed to load attendance: {error}
        </div>
      )}

      {!loading && !error && (
        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 sm:px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Employee</th>
                  <th className="text-left px-4 sm:px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Department</th>
                  <th className="text-left px-4 sm:px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Date</th>
                  <th className="text-left px-4 sm:px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Check In</th>
                  <th className="text-left px-4 sm:px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Check Out</th>
                  <th className="text-left px-4 sm:px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Work Hours</th>
                  <th className="text-left px-4 sm:px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Overtime</th>
                  <th className="text-left px-4 sm:px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-sm text-muted-foreground">
                      No records found for this date.
                    </td>
                  </tr>
                )}
                {paginated.map((record) => {
                  const cfg = statusConfig[record.status];
                  const Icon = cfg.icon;
                  return (
                    <tr key={record.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 sm:px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
                            {getEmpName(record).split(" ").map((n: string) => n[0]).join("")}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground whitespace-nowrap">{getEmpName(record)}</p>
                            <p className="text-xs text-muted-foreground font-mono whitespace-nowrap">{getEmpCode(record)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-5 py-4 text-sm text-muted-foreground whitespace-nowrap">{getDeptName(record)}</td>
                      <td className="px-4 sm:px-5 py-4 text-sm text-muted-foreground whitespace-nowrap">{record.date}</td>
                      <td className="px-4 sm:px-5 py-4 text-sm font-mono text-foreground whitespace-nowrap">{record.check_in ?? "—"}</td>
                      <td className="px-4 sm:px-5 py-4 text-sm font-mono text-foreground whitespace-nowrap">{record.check_out ?? "—"}</td>
                      <td className="px-4 sm:px-5 py-4 text-sm text-foreground whitespace-nowrap">{record.work_hours ? `${record.work_hours}h` : "—"}</td>
                      <td className="px-4 sm:px-5 py-4 text-sm text-orange-600 font-medium whitespace-nowrap">{record.overtime_hours ? `+${record.overtime_hours}h` : "—"}</td>
                      <td className="px-4 sm:px-5 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cfg.className}`}>
                          <Icon className="w-3 h-3" /> {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length === 0 ? 0 : (page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length} records
            </p>
            <div className="flex items-center gap-1 flex-wrap justify-center">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted disabled:opacity-40 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((p) => (
                <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${p === page ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"}`}>
                  {p}
                </button>
              ))}
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted disabled:opacity-40 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}