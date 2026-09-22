// src/app/pages/LeaveManagement.tsx
import { useState, useEffect, useCallback } from "react";
import {
  Search, Plus, CheckCircle2, XCircle, Clock, Filter,
  ChevronLeft, ChevronRight, Loader2, X, FileText, Download,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "../../lib/api";
import { PasswordPrompt } from "../components/PasswordPrompt";
import type { LeaveRequest, LeaveStatus, LeaveType } from "../../types";

const statusConfig: Record<
  LeaveStatus,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
  cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-500 border-gray-200", icon: XCircle },
};

const leaveTypeColors: Record<LeaveType, string> = {
  annual: "bg-blue-100 text-blue-700",
  sick: "bg-red-100 text-red-700",
  maternity: "bg-pink-100 text-pink-700",
  paternity: "bg-indigo-100 text-indigo-700",
  unpaid: "bg-gray-100 text-gray-600",
  emergency: "bg-orange-100 text-orange-700",
  compensatory: "bg-purple-100 text-purple-700",
};

const leaveTypeOptions: LeaveType[] = [
  "annual", "sick", "maternity", "paternity", "unpaid", "emergency", "compensatory",
];

const POLL_MS = 15000;

interface AttachmentData {
  data: string;
  name: string;
  type: string;
  size: number;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"];

function NewLeaveRequestModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [employeeId, setEmployeeId] = useState("");
  const [leaveType, setLeaveType] = useState<LeaveType>("annual");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [attachment, setAttachment] = useState<AttachmentData | null>(null);

  useEffect(() => {
    api.getEmployees()
      .then((data) => {
        const eligible = data.filter((e: any) => e.employment_type === "regular" && e.status === "active");
        setEmployees(eligible);
      })
      .catch((err) => setFormError(err.message ?? "Failed to load employees"))
      .finally(() => setLoadingEmployees(false));
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) { setAttachment(null); return; }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setFormError("Only PDF, JPG, PNG, or WebP files are allowed.");
      e.target.value = "";
      setAttachment(null);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFormError("File too large. Maximum size is 5MB.");
      e.target.value = "";
      setAttachment(null);
      return;
    }
    setFormError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      setAttachment({ data: base64, name: file.name, type: file.type, size: file.size });
    };
    reader.onerror = () => { setFormError("Failed to read file."); setAttachment(null); };
    reader.readAsDataURL(file);
  }

  function handleRemoveAttachment() {
    setAttachment(null);
    const input = document.getElementById("leave-attachment") as HTMLInputElement;
    if (input) input.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!employeeId) return setFormError("Please select an employee.");
    if (!startDate || !endDate) return setFormError("Please complete the start and end dates.");
    if (new Date(endDate) < new Date(startDate)) return setFormError("Invalid date range.");
    if (!reason.trim()) return setFormError("Reason is required.");
    if (reason.trim().length < 10) return setFormError("Reason must be at least 10 characters.");
    if (!attachment) return setFormError("Attachment (proof) is required. Please upload a PDF, JPG, PNG, or WebP file.");

    setSubmitting(true);
    try {
      await api.createLeaveRequest({
        employee_id: employeeId, leave_type: leaveType, start_date: startDate, end_date: endDate,
        reason: reason.trim(), attachment: attachment,
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setFormError(err.message ?? "Failed to create leave request");
    } finally {
      setSubmitting(false);
    }
  }

  const noEligible = !loadingEmployees && employees.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-card rounded-2xl shadow-xl border border-border overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="font-semibold text-foreground">New Leave Request</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">{formError}</div>}
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Employee <span className="text-destructive">*</span> <span className="text-muted-foreground/60">(Regular + Active only)</span>
            </label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} disabled={loadingEmployees || noEligible} required
              className="mt-1 w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60">
              <option value="">{loadingEmployees ? "Loading..." : noEligible ? "No eligible employees" : "Select employee"}</option>
              {employees.map((emp) => (<option key={emp.id} value={emp.id}>{emp.full_name}</option>))}
            </select>
            {noEligible && <p className="text-[10px] text-amber-600 mt-1">Walang regular at active employees na pwedeng i-file ng leave.</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Leave Type <span className="text-destructive">*</span></label>
            <select value={leaveType} onChange={(e) => setLeaveType(e.target.value as LeaveType)} required
              className="mt-1 w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 capitalize">
              {leaveTypeOptions.map((t) => (<option key={t} value={t} className="capitalize">{t}</option>))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Start Date <span className="text-destructive">*</span></label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required
                className="mt-1 w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">End Date <span className="text-destructive">*</span></label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required
                className="mt-1 w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Reason <span className="text-destructive">*</span></label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} required minLength={10} maxLength={500}
              className="mt-1 w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              placeholder="Ilagay ang dahilan ng leave (minimum 10 characters)..." />
            <p className="text-[10px] text-muted-foreground mt-1">{reason.length}/500 characters (minimum 10)</p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Attachment (Proof) <span className="text-destructive">*</span></label>
            {!attachment ? (
              <div className="mt-1">
                <input id="leave-attachment" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileChange} required
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary file:text-white hover:file:bg-primary/90 file:cursor-pointer" />
                <p className="text-[10px] text-muted-foreground mt-1">PDF, JPG, PNG, WebP — max 5MB <span className="text-destructive">*Required</span></p>
              </div>
            ) : (
              <div className="mt-1 flex items-center justify-between gap-2 p-2.5 bg-muted/30 border border-border rounded-lg">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-primary uppercase">{attachment.name.split(".").pop()?.slice(0, 4) ?? "FILE"}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{attachment.name}</p>
                    <p className="text-[10px] text-muted-foreground">{(attachment.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button type="button" onClick={handleRemoveAttachment}
                  className="w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center shrink-0 transition-colors" title="Remove attachment">
                  <X className="w-3 h-3 text-red-600" />
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted/50 transition-colors">Cancel</button>
            <button type="submit" disabled={submitting || noEligible}
              className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60">
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Submit Request
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export function LeaveManagementPage() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | "all">("all");
  const [page, setPage] = useState(1);
  const perPage = 5;

  const [showNewRequestModal, setShowNewRequestModal] = useState(false);

  // 🔒 Password prompt — DOWNLOAD lang
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [pendingDownload, setPendingDownload] = useState<(() => Promise<void>) | null>(null);

  const fetchLeaves = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const data = await api.getLeaveRequests();
      setLeaves(data);
    } catch (err: any) {
      console.error("Failed to fetch leave requests:", err);
      setError(err.message ?? "Failed to load leave requests");
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  // 🔒 Approve — WALANG password
  async function handleApprove(id: string) {
    try {
      await api.updateLeaveStatus(id, "approved");
      fetchLeaves(false);
    } catch (err) {
      console.error("Failed to approve leave:", err);
    }
  }

  // 🔒 Reject — WALANG password
  async function handleReject(id: string) {
    try {
      await api.updateLeaveStatus(id, "rejected");
      fetchLeaves(false);
    } catch (err) {
      console.error("Failed to reject leave:", err);
    }
  }

  // 🔒 Download attachment — MAY password
  function handleDownloadAttachment(id: string, filename: string) {
    setPendingDownload(() => async () => {
      try {
        const result = await api.getLeaveAttachment(id);
        const byteChars = atob(result.data);
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: result.type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.name || filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err: any) {
        alert(err.message ?? "Failed to download attachment");
      }
    });
    setShowPasswordPrompt(true);
  }

  // 🔒 New Request — WALANG password
  function handleNewRequestClick() {
    setShowNewRequestModal(true);
  }

  useEffect(() => {
    fetchLeaves();
    const interval = setInterval(() => fetchLeaves(false), POLL_MS);
    return () => clearInterval(interval);
  }, [fetchLeaves]);

  const getEmpName = (l: any) => l.employee?.full_name ?? "Unknown";
  const getDeptName = (l: any) => l.employee?.department?.name ?? "—";

  const filtered = leaves.filter((l) => {
    const matchSearch = !search || getEmpName(l).toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));

  const summary = {
    pending: leaves.filter((l) => l.status === "pending").length,
    approved: leaves.filter((l) => l.status === "approved").length,
    rejected: leaves.filter((l) => l.status === "rejected").length,
    total_days: leaves.filter((l) => l.status === "approved").reduce((a, l) => a + l.days_count, 0),
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-indigo-700 p-5 sm:p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold">Leave Management</h1>
            <p className="text-white/70 text-xs sm:text-sm mt-1">Review and manage employee leave requests</p>
          </div>
          <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3 shrink-0">
            {[
              { label: "Pending", value: summary.pending, color: "bg-amber-400/20 border-amber-400/30" },
              { label: "Approved", value: summary.approved, color: "bg-emerald-400/20 border-emerald-400/30" },
              { label: "Total Days Off", value: summary.total_days, color: "bg-white/10 border-white/20" },
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
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as LeaveStatus | "all"); setPage(1); }}
            className="col-span-2 sm:col-span-1 px-3 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 text-sm border border-border rounded-xl bg-card hover:bg-muted/50 transition-colors">
            <Filter className="w-4 h-4" /> <span className="hidden sm:inline">Filter</span>
          </button>
          <button onClick={handleNewRequestClick}
            className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> New Request
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading leave requests...
        </div>
      )}
      {!loading && error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">Failed to load leave requests: {error}</div>
      )}

      {!loading && !error && (
        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 sm:px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Employee</th>
                  <th className="text-left px-4 sm:px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Leave Type</th>
                  <th className="text-left px-4 sm:px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Duration</th>
                  <th className="text-left px-4 sm:px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Days</th>
                  <th className="text-left px-4 sm:px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Reason</th>
                  <th className="text-left px-4 sm:px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Proof</th>
                  <th className="text-left px-4 sm:px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Applied On</th>
                  <th className="text-left px-4 sm:px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Status</th>
                  <th className="px-4 sm:px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.length === 0 && (
                  <tr><td colSpan={9} className="px-5 py-10 text-center text-sm text-muted-foreground">No leave requests found.</td></tr>
                )}
                {paginated.map((leave) => {
                  const cfg = statusConfig[leave.status];
                  const Icon = cfg.icon;
                  const empName = getEmpName(leave);
                  return (
                    <tr key={leave.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 sm:px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
                            {empName.split(" ").map((n: string) => n[0]).join("")}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground whitespace-nowrap">{empName}</p>
                            <p className="text-xs text-muted-foreground whitespace-nowrap">{getDeptName(leave)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-5 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize whitespace-nowrap ${leaveTypeColors[leave.leave_type]}`}>
                          {leave.leave_type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 sm:px-5 py-4 text-sm text-muted-foreground whitespace-nowrap">{leave.start_date} → {leave.end_date}</td>
                      <td className="px-4 sm:px-5 py-4 text-sm font-semibold text-foreground whitespace-nowrap">{leave.days_count}d</td>
                      <td className="px-4 sm:px-5 py-4 text-sm text-muted-foreground max-w-[160px] truncate" title={leave.reason ?? ""}>{leave.reason ?? "—"}</td>
                      <td className="px-4 sm:px-5 py-4">
                        {(leave as any).attachment_name ? (
                          <button onClick={() => handleDownloadAttachment(leave.id, (leave as any).attachment_name)}
                            className="flex items-center gap-1 text-xs text-primary hover:underline whitespace-nowrap" title={(leave as any).attachment_name}>
                            <FileText className="w-3 h-3" />
                            <Download className="w-3 h-3" />
                            <span className="max-w-[100px] truncate">{(leave as any).attachment_name}</span>
                          </button>
                        ) : (<span className="text-xs text-muted-foreground">—</span>)}
                      </td>
                      <td className="px-4 sm:px-5 py-4 text-sm text-muted-foreground whitespace-nowrap">{leave.created_at?.slice(0, 10)}</td>
                      <td className="px-4 sm:px-5 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${cfg.className}`}>
                          <Icon className="w-3 h-3" /> {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 sm:px-5 py-4">
                        {leave.status === "pending" && (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleApprove(leave.id)} className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center hover:bg-emerald-200 transition-colors" title="Approve">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            </button>
                            <button onClick={() => handleReject(leave.id)} className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center hover:bg-red-200 transition-colors" title="Reject">
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length === 0 ? 0 : (page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length} requests
            </p>
            <div className="flex items-center gap-1 flex-wrap justify-center">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted disabled:opacity-40 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((p) => (
                <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${p === page ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"}`}>{p}</button>
              ))}
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted disabled:opacity-40 transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showNewRequestModal && (
          <NewLeaveRequestModal onClose={() => setShowNewRequestModal(false)} onCreated={() => fetchLeaves(false)} />
        )}
      </AnimatePresence>

      {/* 🔒 Password Prompt — DOWNLOAD lang */}
      <PasswordPrompt
        open={showPasswordPrompt}
        title="Download Attachment"
        description="Enter the file export password to download the proof file."
        onClose={() => { setShowPasswordPrompt(false); setPendingDownload(null); }}
        onSuccess={async () => { if (pendingDownload) await pendingDownload(); }}
      />
    </div>
  );
}