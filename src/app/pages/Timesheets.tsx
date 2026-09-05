import { useState, useEffect, useCallback } from "react";
import { FileSpreadsheet, Search, CheckCircle2, Clock, Send, ChevronLeft, ChevronRight, XCircle, Loader2, Plus } from "lucide-react";
import { motion } from "motion/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { api } from "../../lib/api";
import type { TimesheetStatus } from "../../types";

interface TimesheetRow {
  id: string;
  employee_name: string;
  employee_code: string;
  department: string | null;
  period_start: string;
  period_end: string;
  total_regular_hours: number;
  total_overtime_hours: number;
  status: TimesheetStatus;
  submitted_at?: string;
}

const statusConfig: Record<TimesheetStatus, { label: string; className: string; icon: React.ComponentType<{ className?: string }> }> = {
  draft:     { label: "Draft",     className: "bg-gray-100 text-gray-600 border-gray-200",         icon: Clock },
  submitted: { label: "Submitted", className: "bg-blue-100 text-blue-700 border-blue-200",         icon: Send },
  approved:  { label: "Approved",  className: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  rejected:  { label: "Rejected",  className: "bg-red-100 text-red-700 border-red-200",            icon: XCircle },
};

const emptyForm = { employee_id: "", period_start: "", period_end: "" };

export function TimesheetsPage() {
  const [timesheets, setTimesheets] = useState<TimesheetRow[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TimesheetStatus | "all">("all");
  const [page, setPage] = useState(1);
  const perPage = 6;

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ts, emps] = await Promise.all([api.getTimesheets(), api.getEmployees()]);
      setTimesheets(ts);
      setEmployees(emps);
    } catch (err: any) {
      console.error("Failed to fetch timesheets:", err);
      setError(err.message ?? "Failed to load timesheets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filtered = timesheets.filter((t) => {
    const matchSearch = !search || t.employee_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));

  const totalRegular = timesheets.reduce((a, t) => a + Number(t.total_regular_hours ?? 0), 0);
  const totalOvertime = timesheets.reduce((a, t) => a + Number(t.total_overtime_hours ?? 0), 0);
  const pending = timesheets.filter((t) => t.status === "submitted").length;

  function openGenerateModal() {
    setForm(emptyForm);
    setFormError(null);
    setShowGenerateModal(true);
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.employee_id || !form.period_start || !form.period_end) {
      setFormError("Kailangan ng employee, period start, at period end.");
      return;
    }
    setSaving(true);
    try {
      await api.generateTimesheet(form);
      setShowGenerateModal(false);
      fetchAll();
    } catch (err: any) {
      setFormError(err.message ?? "Nabigo ang paggawa ng timesheet.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDecision(id: string, status: "approved" | "rejected") {
    try {
      await api.updateTimesheetStatus(id, status);
      fetchAll();
    } catch (err: any) {
      alert(err.message ?? "Nabigo ang pag-update ng status.");
    }
  }

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
            <h1 className="text-2xl font-bold flex items-center gap-2"><FileSpreadsheet className="w-7 h-7" /> Timesheet Management</h1>
            <p className="text-white/70 text-sm mt-1">Track, review and approve employee timesheets</p>
          </div>
          <div className="flex gap-3">
            {[
              { label: "Regular Hours", value: `${totalRegular.toFixed(1)}h` },
              { label: "Overtime Hours", value: `${totalOvertime.toFixed(1)}h` },
              { label: "Pending Review", value: pending },
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
          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading timesheets...
        </div>
      )}
      {!loading && error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">Failed to load timesheets: {error}</div>
      )}

      {!loading && !error && (
        <>
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search employees..."
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as TimesheetStatus | "all"); setPage(1); }}
              className="px-3 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <button
              onClick={openGenerateModal}
              className="flex items-center gap-2 px-4 py-2.5 text-sm bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" /> Generate Timesheet
            </button>
          </div>

          {/* Table */}
          <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Employee</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Period</th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Regular</th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Overtime</th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Submitted</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="px-5 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginated.length === 0 && (
                    <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-muted-foreground">Walang timesheet na nahanap.</td></tr>
                  )}
                  {paginated.map((ts) => {
                    const cfg = statusConfig[ts.status];
                    const Icon = cfg.icon;
                    const totalHours = Number(ts.total_regular_hours ?? 0) + Number(ts.total_overtime_hours ?? 0);
                    return (
                      <tr key={ts.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                              {ts.employee_name.split(" ").map((n) => n[0]).join("")}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{ts.employee_name}</p>
                              <p className="text-xs text-muted-foreground">{ts.department ?? "—"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-muted-foreground">{ts.period_start?.slice(0, 10)} – {ts.period_end?.slice(0, 10)}</td>
                        <td className="px-5 py-4 text-sm text-right font-medium text-foreground">{Number(ts.total_regular_hours ?? 0).toFixed(1)}h</td>
                        <td className="px-5 py-4 text-sm text-right font-medium text-orange-600">
                          {Number(ts.total_overtime_hours ?? 0) > 0 ? `+${Number(ts.total_overtime_hours).toFixed(1)}h` : "—"}
                        </td>
                        <td className="px-5 py-4 text-sm text-right font-bold text-foreground">{totalHours.toFixed(1)}h</td>
                        <td className="px-5 py-4 text-sm text-muted-foreground">{ts.submitted_at?.slice(0, 10) ?? "—"}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.className}`}>
                            <Icon className="w-3 h-3" /> {cfg.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {ts.status === "submitted" && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDecision(ts.id, "approved")}
                                className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center hover:bg-emerald-200 transition-colors"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              </button>
                              <button
                                onClick={() => handleDecision(ts.id, "rejected")}
                                className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center hover:bg-red-200 transition-colors"
                              >
                                <XCircle className="w-3.5 h-3.5 text-red-600" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Showing {filtered.length === 0 ? 0 : (page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length} timesheets
              </p>
              <div className="flex items-center gap-1">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted disabled:opacity-40 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${p === page ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"}`}>{p}</button>
                ))}
                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted disabled:opacity-40 transition-colors"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Generate Timesheet Modal */}
      <Dialog open={showGenerateModal} onOpenChange={setShowGenerateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Generate Timesheet</DialogTitle></DialogHeader>
          <form onSubmit={handleGenerate} className="space-y-4">
            {formError && (
              <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">{formError}</div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Employee</label>
              <select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">Piliin ang empleyado</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Period Start</label>
                <input type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Period End</label>
                <input type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Awtomatikong kukunin ang regular at overtime hours mula sa attendance records ng empleyado sa loob ng napiling period.</p>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowGenerateModal(false)} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted/50 transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {saving ? "Generating..." : "Generate"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}