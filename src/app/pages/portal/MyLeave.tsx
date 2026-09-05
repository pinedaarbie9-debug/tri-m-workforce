import { useState, useEffect, useCallback } from "react";
import { Palmtree, Plus, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { api } from "../../../lib/api";

const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
  pending:   { label: "Pending",   className: "bg-amber-100 text-amber-700 border-amber-200",   icon: Clock },
  approved:  { label: "Approved",  className: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  rejected:  { label: "Rejected",  className: "bg-red-100 text-red-700 border-red-200",         icon: XCircle },
  cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-500 border-gray-200",      icon: XCircle },
};

const emptyForm = { leave_type: "annual", start_date: "", end_date: "", reason: "" };

export function MyLeavePage() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMyLeaveRequests();
      setLeaves(data);
    } catch (err: any) {
      console.error("Failed to fetch leave requests:", err);
      setError(err.message ?? "Failed to load your leave requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.start_date || !form.end_date) {
      setFormError("Kailangan ng start date at end date.");
      return;
    }
    if (new Date(form.end_date) < new Date(form.start_date)) {
      setFormError("Hindi pwedeng mauna ang end date sa start date.");
      return;
    }
    setSaving(true);
    try {
      await api.createMyLeaveRequest(form);
      setShowModal(false);
      setForm(emptyForm);
      fetchLeaves();
    } catch (err: any) {
      setFormError(err.message ?? "Nabigo ang pag-submit ng leave request.");
    } finally {
      setSaving(false);
    }
  }

  const summary = {
    pending: leaves.filter((l) => l.status === "pending").length,
    approved: leaves.filter((l) => l.status === "approved").length,
    total_days: leaves.filter((l) => l.status === "approved").reduce((a, l) => a + l.days_count, 0),
  };

  return (
    <div className="p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-indigo-700 p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Palmtree className="w-7 h-7" /> My Leave</h1>
            <p className="text-white/70 text-sm mt-1">Sariling leave requests at balanse</p>
          </div>
          <div className="flex gap-3">
            {[
              { label: "Pending", value: summary.pending },
              { label: "Approved", value: summary.approved },
              { label: "Days Used", value: summary.total_days },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 rounded-xl px-4 py-2 border border-white/20 text-center">
                <p className="text-white/60 text-xs">{s.label}</p>
                <p className="text-white font-bold text-xl">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="flex justify-end">
        <button
          onClick={() => { setForm(emptyForm); setFormError(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 text-sm bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Request
        </button>
      </div>

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
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Leave Type</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Duration</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Days</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reason</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leaves.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">Wala ka pang leave request.</td></tr>
                )}
                {leaves.map((leave) => {
                  const cfg = statusConfig[leave.status] ?? statusConfig.pending;
                  const Icon = cfg.icon;
                  return (
                    <tr key={leave.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-4 text-sm text-foreground capitalize">{leave.leave_type.replace("_", " ")}</td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">{leave.start_date} → {leave.end_date}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-foreground">{leave.days_count}d</td>
                      <td className="px-5 py-4 text-sm text-muted-foreground max-w-[200px] truncate">{leave.reason ?? "—"}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.className}`}>
                          <Icon className="w-3 h-3" /> {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Leave Request</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">{formError}</div>}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Leave Type</label>
              <select value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="annual">Annual</option>
                <option value="sick">Sick</option>
                <option value="maternity">Maternity</option>
                <option value="paternity">Paternity</option>
                <option value="unpaid">Unpaid</option>
                <option value="emergency">Emergency</option>
                <option value="compensatory">Compensatory</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Start Date</label>
                <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">End Date</label>
                <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Reason</label>
              <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" rows={3} placeholder="Optional" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted/50 transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {saving ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}