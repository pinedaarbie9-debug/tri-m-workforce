// src/app/pages/portal/MyLeave.tsx
import { useState, useEffect, useCallback } from "react";
import {
  Palmtree,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { api } from "../../../lib/api";

const statusConfig: Record<
  string,
  { label: string; className: string; icon: any }
> = {
  pending: {
    label: "Pending",
    className: "bg-amber-100 text-amber-700 border-amber-200",
    icon: Clock,
  },
  approved: {
    label: "Approved",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-700 border-red-200",
    icon: XCircle,
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-gray-100 text-gray-500 border-gray-200",
    icon: XCircle,
  },
};

interface AttachmentData {
  data: string;
  name: string;
  type: string;
  size: number;
}

type LeaveType =
  | "annual"
  | "sick"
  | "maternity"
  | "paternity"
  | "unpaid"
  | "emergency"
  | "compensatory";

const emptyForm: {
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason: string;
} = {
  leave_type: "annual",
  start_date: "",
  end_date: "",
  reason: "",
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export function MyLeavePage() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [myProfile, setMyProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<AttachmentData | null>(null);

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

  const fetchMyProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const data = await api.getMyProfile();
      setMyProfile(data);
    } catch (err: any) {
      console.error("Failed to fetch profile:", err);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaves();
    fetchMyProfile();
  }, [fetchLeaves, fetchMyProfile]);

  const isRegular =
    myProfile?.employment_type === "regular" &&
    myProfile?.status === "active";

  const employmentLabel = String(myProfile?.employment_type ?? "")
    .replace("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setAttachment(null);
      return;
    }

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
      setAttachment({
        data: base64,
        name: file.name,
        type: file.type,
        size: file.size,
      });
    };
    reader.onerror = () => {
      setFormError("Failed to read file.");
      setAttachment(null);
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveAttachment() {
    setAttachment(null);
    const input = document.getElementById(
      "my-leave-attachment"
    ) as HTMLInputElement;
    if (input) input.value = "";
  }

  // 🔒 Open modal — WALANG password
  function openModal() {
    setForm(emptyForm);
    setFormError(null);
    setAttachment(null);
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!isRegular) {
      setFormError(
        `Only regular employees can file leave requests. Your employment type is "${employmentLabel}".`
      );
      return;
    }

    if (!form.start_date || !form.end_date) {
      setFormError("Kailangan ng start date at end date.");
      return;
    }
    if (new Date(form.end_date) < new Date(form.start_date)) {
      setFormError("Hindi pwedeng mauna ang end date sa start date.");
      return;
    }

    if (!form.reason.trim()) {
      setFormError("Reason is required.");
      return;
    }
    if (form.reason.trim().length < 10) {
      setFormError("Reason must be at least 10 characters.");
      return;
    }

    if (!attachment) {
      setFormError(
        "Attachment (proof) is required. Please upload a PDF, JPG, PNG, or WebP file."
      );
      return;
    }

    setSaving(true);
    try {
      await api.createMyLeaveRequest({
        leave_type: form.leave_type,
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason.trim(),
        attachment: attachment,
      });
      setShowModal(false);
      setForm(emptyForm);
      setAttachment(null);
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
    total_days: leaves
      .filter((l) => l.status === "approved")
      .reduce((a, l) => a + l.days_count, 0),
  };

  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-indigo-700 p-6 text-white shadow-lg"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Palmtree className="w-7 h-7" /> My Leave
            </h1>
            <p className="text-white/70 text-sm mt-1">
              Sariling leave requests at balanse
            </p>
          </div>
          <div className="flex gap-3">
            {[
              { label: "Pending", value: summary.pending },
              { label: "Approved", value: summary.approved },
              { label: "Days Used", value: summary.total_days },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white/10 rounded-xl px-4 py-2 border border-white/20 text-center"
              >
                <p className="text-white/60 text-xs">{s.label}</p>
                <p className="text-white font-bold text-xl">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {!profileLoading && !isRegular && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <p className="font-medium">
            ⚠️ Hindi ka pwedeng mag-file ng leave request.
          </p>
          <p className="mt-1 text-xs">
            Regular employees lang ang pwedeng mag-file ng leave. Ang iyong
            employment type ay <strong>{employmentLabel}</strong>. Kung may
            katanungan, makipag-ugnayan sa HR.
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={openModal}
          disabled={!isRegular}
          title={
            !isRegular
              ? `Regular employees only. Your type: ${employmentLabel}`
              : "New leave request"
          }
          className="flex items-center gap-2 px-4 py-2.5 text-sm bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
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
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">
                      Wala ka pang leave request.
                    </td>
                  </tr>
                )}
                {leaves.map((leave) => {
                  const cfg = statusConfig[leave.status] ?? statusConfig.pending;
                  const Icon = cfg.icon;
                  return (
                    <tr key={leave.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-4 text-sm text-foreground capitalize">
                        {leave.leave_type.replace("_", " ")}
                      </td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">
                        {leave.start_date} → {leave.end_date}
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-foreground">
                        {leave.days_count}d
                      </td>
                      <td className="px-5 py-4 text-sm text-muted-foreground max-w-[200px] truncate" title={leave.reason ?? ""}>
                        {leave.reason ?? "—"}
                      </td>
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
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Leave Request</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                {formError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Leave Type <span className="text-destructive">*</span>
              </label>
              <select
                value={form.leave_type}
                onChange={(e) =>
                  setForm({ ...form, leave_type: e.target.value as LeaveType })
                }
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
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
                <label className="text-sm font-medium text-foreground">
                  Start Date <span className="text-destructive">*</span>
                </label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  End Date <span className="text-destructive">*</span>
                </label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Reason <span className="text-destructive">*</span>
              </label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                required
                minLength={10}
                maxLength={500}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                rows={3}
                placeholder="Ilagay ang dahilan ng leave (minimum 10 characters)..."
              />
              <p className="text-[10px] text-muted-foreground">
                {form.reason.length}/500 characters (minimum 10)
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Attachment (Proof) <span className="text-destructive">*</span>
              </label>

              {!attachment ? (
                <div>
                  <input
                    id="my-leave-attachment"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={handleFileChange}
                    required
                    className="w-full px-3 py-2 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary file:text-white hover:file:bg-primary/90 file:cursor-pointer"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    PDF, JPG, PNG, WebP — max 5MB{" "}
                    <span className="text-destructive">*Required</span>
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 p-2.5 bg-muted/30 border border-border rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-primary uppercase">
                        {attachment.name.split(".").pop()?.slice(0, 4) ?? "FILE"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{attachment.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {(attachment.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveAttachment}
                    className="w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center shrink-0 transition-colors"
                    title="Remove attachment"
                  >
                    <X className="w-3 h-3 text-red-600" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !isRegular}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                {saving ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}