import { useState, useEffect, useCallback } from "react";
import { CalendarDays, Plus, Sun, Moon, Sunset, RefreshCw, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { format, startOfWeek, addDays, isToday } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { api } from "../../lib/api";

interface ShiftType {
  id: string;
  type: string;
  name: string;
  color: string;
}

interface Assignment {
  id: string;
  date: string;
  employee_id: string;
  employee_name: string;
  department_name: string | null;
  shift_id: string;
  shift_name: string;
  shift_type: string;
  shift_color: string;
}

const iconFor = (type: string) => (type === "day" ? Sun : type === "evening" ? Sunset : Moon);

const emptyShiftForm = { type: "day", name: "", color: "#f59e0b" };
const emptyAssignForm = { employee_id: "", shift_id: "" };

export function ShiftSchedulingPage() {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreateShiftModal, setShowCreateShiftModal] = useState(false);
  const [shiftForm, setShiftForm] = useState(emptyShiftForm);
  const [savingShift, setSavingShift] = useState(false);

  const [assignDate, setAssignDate] = useState<string | null>(null);
  const [assignForm, setAssignForm] = useState(emptyAssignForm);
  const [savingAssign, setSavingAssign] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const from = format(weekStart, "yyyy-MM-dd");
  const to = format(addDays(weekStart, 6), "yyyy-MM-dd");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [types, assigns, emps] = await Promise.all([
        api.getShiftTypes(),
        api.getEmployeeShifts(from, to),
        api.getEmployees(),
      ]);
      setShiftTypes(types);
      setAssignments(assigns);
      setEmployees(emps);
    } catch (err: any) {
      console.error("Failed to fetch shift data:", err);
      setError(err.message ?? "Failed to load shifts");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const weekData: Record<string, Assignment[]> = {};
  for (const day of weekDays) {
    const key = format(day, "yyyy-MM-dd");
    weekData[key] = assignments.filter((a) => a.date.slice(0, 10) === key);
  }

  async function handleCreateShift(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!shiftForm.name.trim()) {
      setFormError("Kailangan ng pangalan ng shift.");
      return;
    }
    setSavingShift(true);
    try {
      await api.createShiftType(shiftForm);
      setShowCreateShiftModal(false);
      setShiftForm(emptyShiftForm);
      fetchAll();
    } catch (err: any) {
      setFormError(err.message ?? "Nabigo ang paggawa ng shift.");
    } finally {
      setSavingShift(false);
    }
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!assignForm.employee_id || !assignForm.shift_id || !assignDate) {
      setFormError("Piliin ang empleyado at shift.");
      return;
    }
    setSavingAssign(true);
    try {
      await api.assignShift({ ...assignForm, date: assignDate });
      setAssignDate(null);
      setAssignForm(emptyAssignForm);
      fetchAll();
    } catch (err: any) {
      setFormError(err.message ?? "Nabigo ang pag-assign ng shift.");
    } finally {
      setSavingAssign(false);
    }
  }

  const shiftCounts = shiftTypes.map((st) => ({
    ...st,
    count: assignments.filter((a) => a.shift_id === st.id).length,
  }));

  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-indigo-700 p-6 text-white shadow-lg"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarDays className="w-7 h-7" /> Shift Scheduling</h1>
            <p className="text-white/70 text-sm mt-1">Manage and assign employee shifts for the week</p>
          </div>
          <button
            onClick={() => { setShiftForm(emptyShiftForm); setFormError(null); setShowCreateShiftModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-white/15 backdrop-blur-sm text-white rounded-xl border border-white/30 hover:bg-white/25 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Create Shift
          </button>
        </div>
      </motion.div>

      {shiftTypes.length === 0 && !loading && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          Wala pang shift type. I-click ang "Create Shift" para makagawa ng una (hal. Day, Evening, Night).
        </div>
      )}

      <div className="flex items-center gap-4 flex-wrap">
        {shiftTypes.map((st) => {
          const Icon = iconFor(st.type);
          return (
            <div key={st.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border" style={{ backgroundColor: `${st.color}20`, borderColor: `${st.color}50` }}>
              <Icon className="w-3.5 h-3.5" style={{ color: st.color }} />
              <span className="text-xs font-medium" style={{ color: st.color }}>{st.name}</span>
            </div>
          );
        })}
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <button onClick={() => setWeekStart((d) => addDays(d, -7))} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <p className="font-semibold text-foreground">
              {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
            </p>
            <p className="text-xs text-muted-foreground">Weekly Schedule</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => fetchAll()} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={() => setWeekStart((d) => addDays(d, 7))} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading schedule...
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-red-700">Failed to load: {error}</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="grid grid-cols-7 min-w-[900px]">
              {weekDays.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const today = isToday(day);
                return (
                  <div key={key} className="border-r border-border last:border-r-0">
                    <div className={`p-3 text-center border-b border-border ${today ? "bg-primary/5" : ""}`}>
                      <p className="text-xs font-semibold text-muted-foreground uppercase">{format(day, "EEE")}</p>
                      <p className={`text-lg font-bold mt-0.5 ${today ? "text-primary" : "text-foreground"}`}>{format(day, "d")}</p>
                      {today && <div className="w-1.5 h-1.5 bg-primary rounded-full mx-auto mt-1" />}
                    </div>
                    <div className="p-2 space-y-1.5 min-h-[280px]">
                      {(weekData[key] ?? []).map((block) => {
                        const Icon = iconFor(block.shift_type);
                        return (
                          <div key={block.id} className="rounded-lg p-2 border" style={{ backgroundColor: `${block.shift_color}20`, borderColor: `${block.shift_color}50` }}>
                            <div className="flex items-center gap-1 mb-1">
                              <Icon className="w-3 h-3" style={{ color: block.shift_color }} />
                              <span className="text-[10px] font-semibold" style={{ color: block.shift_color }}>{block.shift_name}</span>
                            </div>
                            <p className="text-[11px] font-medium leading-tight" style={{ color: block.shift_color }}>{block.employee_name.split(" ")[0]}</p>
                            <p className="text-[10px] opacity-60" style={{ color: block.shift_color }}>{block.department_name ?? "—"}</p>
                          </div>
                        );
                      })}
                      <button
                        onClick={() => { setAssignForm(emptyAssignForm); setFormError(null); setAssignDate(key); }}
                        disabled={shiftTypes.length === 0}
                        className="w-full text-center py-1 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {shiftCounts.map((st, i) => {
          const Icon = iconFor(st.type);
          return (
            <motion.div key={st.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl p-4 shadow-sm border border-border"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${st.color}20` }}>
                  <Icon className="w-5 h-5" style={{ color: st.color }} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{st.name}</p>
                  <p className="font-bold text-foreground text-lg">{st.count}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">employees assigned this week</p>
            </motion.div>
          );
        })}
      </div>

      {/* Create Shift Modal */}
      <Dialog open={showCreateShiftModal} onOpenChange={setShowCreateShiftModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Create Shift</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateShift} className="space-y-4">
            {formError && <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">{formError}</div>}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Shift Name</label>
              <input value={shiftForm.name} onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. Day Shift" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Type</label>
              <select value={shiftForm.type} onChange={(e) => setShiftForm({ ...shiftForm, type: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="day">Day</option>
                <option value="evening">Evening</option>
                <option value="night">Night</option>
                <option value="rotating">Rotating</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowCreateShiftModal(false)} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted/50 transition-colors">Cancel</button>
              <button type="submit" disabled={savingShift} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {savingShift ? "Saving..." : "Create Shift"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Employee Modal */}
      <Dialog open={Boolean(assignDate)} onOpenChange={() => setAssignDate(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Assign Shift — {assignDate}</DialogTitle></DialogHeader>
          <form onSubmit={handleAssign} className="space-y-4">
            {formError && <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">{formError}</div>}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Employee</label>
              <select value={assignForm.employee_id} onChange={(e) => setAssignForm({ ...assignForm, employee_id: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">Piliin ang empleyado</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Shift</label>
              <select value={assignForm.shift_id} onChange={(e) => setAssignForm({ ...assignForm, shift_id: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">Piliin ang shift</option>
                {shiftTypes.map((st) => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAssignDate(null)} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted/50 transition-colors">Cancel</button>
              <button type="submit" disabled={savingAssign} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {savingAssign ? "Saving..." : "Assign"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}