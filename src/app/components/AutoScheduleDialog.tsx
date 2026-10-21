import { useEffect, useState } from "react";
import { api, type AutoScheduleResult } from "../../lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
  shiftTypes: any[];
  defaultFrom: string; // YYYY-MM-DD
  defaultTo: string; // YYYY-MM-DD
  onApplied: () => void; // i-refetch ang calendar
}

// 🔒 Petsa ngayon (YYYY-MM-DD, local time). Ang ngayon mismo ay pwede pa; bawal ang bago nito.
function todayKey() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function AutoScheduleDialog({ open, onClose, shiftTypes, defaultFrom, defaultTo, onApplied }: Props) {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [shiftId, setShiftId] = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState(5);
  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState<any[]>([]);
  const [preview, setPreview] = useState<AutoScheduleResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const today = todayKey();

  useEffect(() => {
    if (!open) return;
    // 🔒 Hindi pwedeng magsimula sa petsang lumipas na
    const safeFrom = defaultFrom < todayKey() ? todayKey() : defaultFrom;
    const safeTo = defaultTo < safeFrom ? safeFrom : defaultTo;
    setFrom(safeFrom);
    setTo(safeTo);
    setPreview(null);
    setError("");
    api.getDepartments().then(setDepartments).catch(() => setDepartments([]));
  }, [open, defaultFrom, defaultTo]);

  useEffect(() => {
    if (!shiftId && shiftTypes.length > 0) setShiftId(shiftTypes[0].id);
  }, [shiftTypes, shiftId]);

  // Kapag nagbago ang settings, invalid na ang lumang preview
  useEffect(() => setPreview(null), [from, to, shiftId, daysPerWeek, departmentId]);

  if (!open) return null;

  // 🔒 Validation ng petsa
  const fromIsPast = Boolean(from) && from < today;
  const toBeforeFrom = Boolean(from) && Boolean(to) && to < from;
  const dateProblem = !from || !to
    ? "Pumili ng From at To na petsa."
    : fromIsPast
    ? "Hindi pwedeng mag-schedule sa petsang lumipas na. Ang pinakamaagang simula ay ngayong araw."
    : toBeforeFrom
    ? "Ang To ay hindi pwedeng mas maaga kaysa From."
    : "";

  const handleFromChange = (value: string) => {
    setFrom(value);
    // Siguraduhing hindi mas maaga ang To kaysa From
    if (value && to && to < value) setTo(value);
  };

  const payload = (mode: "preview" | "apply") => ({
    from,
    to,
    shift_id: shiftId,
    days_per_week: daysPerWeek,
    department_id: departmentId || undefined,
    mode,
  });

  const runPreview = async () => {
    if (dateProblem) {
      setError(dateProblem);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setPreview(await api.autoScheduleShifts(payload("preview")));
    } catch (e: any) {
      setError(e.message ?? "Preview failed.");
    } finally {
      setLoading(false);
    }
  };

  const runApply = async () => {
    if (dateProblem) {
      setError(dateProblem);
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.autoScheduleShifts(payload("apply"));
      onApplied();
      onClose();
    } catch (e: any) {
      setError(e.message ?? "Failed to save schedule.");
    } finally {
      setLoading(false);
    }
  };

  const field = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground";
  const label = "block text-xs font-medium text-muted-foreground mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium text-foreground">Auto-schedule</h2>
            <p className="text-sm text-muted-foreground">
              Rules-based. Walang employee na lalampas sa 6 na sunod-sunod na araw. Nilalaktawan ang approved leave.
              Ngayong araw at susunod na mga araw lang ang pwedeng i-schedule.
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={label}>From</label>
            <input
              type="date"
              className={field}
              value={from}
              min={today}
              onChange={(e) => handleFromChange(e.target.value)}
            />
          </div>
          <div>
            <label className={label}>To</label>
            <input
              type="date"
              className={field}
              value={to}
              min={from && from > today ? from : today}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div>
            <label className={label}>Shift</label>
            <select className={field} value={shiftId} onChange={(e) => setShiftId(e.target.value)}>
              {shiftTypes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.start_time}–{s.end_time})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Working days per week</label>
            <select className={field} value={daysPerWeek} onChange={(e) => setDaysPerWeek(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Department (optional)</label>
            <select className={field} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        {(error || dateProblem) && (
          <div className="rounded-lg border border-red-300 bg-red-50 text-red-700 px-3 py-2 text-sm">
            {error || dateProblem}
          </div>
        )}

        {preview && (
          <div className="space-y-3">
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-foreground">
              {preview.summary.assignments} shifts para sa {preview.summary.employees} employees
              {preview.summary.skipped_on_leave > 0 && ` · ${preview.summary.skipped_on_leave} araw na naka-leave (nilaktawan)`}
              {preview.summary.skipped_max_consecutive > 0 && ` · ${preview.summary.skipped_max_consecutive} nilaktawan dahil sa 6-day limit`}
            </div>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs text-muted-foreground sticky top-0">
                  <tr>
                    <th className="px-3 py-2">Employee</th>
                    <th className="px-3 py-2">Department</th>
                    <th className="px-3 py-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(preview.assignments ?? []).slice(0, 200).map((a, i) => (
                    <tr key={`${a.employee_id}-${a.date}-${i}`}>
                      <td className="px-3 py-1.5">{a.employee_name}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{a.department_name ?? "—"}</td>
                      <td className="px-3 py-1.5">{a.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(preview.assignments?.length ?? 0) > 200 && (
              <p className="text-xs text-muted-foreground">
                Unang 200 lang ang ipinapakita; lahat ay ise-save kapag Apply.
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm">Cancel</button>
          <button
            onClick={runPreview}
            disabled={loading || !shiftId || Boolean(dateProblem)}
            className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-50"
          >
            {loading && !preview ? "Working…" : "Preview"}
          </button>
          <button
            onClick={runApply}
            disabled={loading || !preview || preview.summary.assignments === 0 || Boolean(dateProblem)}
            className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}