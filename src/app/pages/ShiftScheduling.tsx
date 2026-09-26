// src/app/pages/ShiftScheduling.tsx
import { useState, useEffect, useCallback } from "react";
import {
  CalendarDays,
  Plus,
  Sun,
  Moon,
  Sunset,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Star,
} from "lucide-react";
import { motion } from "motion/react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  isToday,
  isSameMonth,
} from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { api } from "../../lib/api";

// ============================================================
// 🔒 Philippine Holidays (2026)
// ============================================================
const PH_HOLIDAYS_2026: Record<string, { name: string; type: "regular" | "special" }> = {
  // Regular Holidays
  "2026-01-01": { name: "New Year's Day", type: "regular" },
  "2026-04-09": { name: "Araw ng Kagitingan", type: "regular" },
  "2026-05-01": { name: "Labor Day", type: "regular" },
  "2026-06-12": { name: "Independence Day", type: "regular" },
  "2026-08-31": { name: "National Heroes Day", type: "regular" },
  "2026-11-30": { name: "Bonifacio Day", type: "regular" },
  "2026-12-25": { name: "Christmas Day", type: "regular" },
  "2026-12-30": { name: "Rizal Day", type: "regular" },

  // Special (Non-Working) Days
  "2026-02-25": { name: "EDSA People Power", type: "special" },
  "2026-04-02": { name: "Maundy Thursday", type: "special" },
  "2026-04-03": { name: "Good Friday", type: "special" },
  "2026-04-04": { name: "Black Saturday", type: "special" },
  "2026-08-21": { name: "Ninoy Aquino Day", type: "special" },
  "2026-11-01": { name: "All Saints' Day", type: "special" },
  "2026-11-02": { name: "All Souls' Day", type: "special" },
  "2026-12-08": { name: "Immaculate Conception", type: "special" },
  "2026-12-24": { name: "Christmas Eve", type: "special" },
  "2026-12-31": { name: "New Year's Eve", type: "special" },
};

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

const iconFor = (type: string) =>
  type === "day" ? Sun : type === "evening" ? Sunset : Moon;

const emptyShiftForm = { type: "day", name: "", color: "#f59e0b" };
const emptyAssignForm = { employee_id: "", shift_id: "" };

export function ShiftSchedulingPage() {
  // 🔒 MONTHLY view state
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));

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

  // 🔒 Date range: buong buwan (kasama ang leading/trailing days para sa grid)
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const from = format(gridStart, "yyyy-MM-dd");
  const to = format(gridEnd, "yyyy-MM-dd");

  // 🔒 Generate all days sa grid (halimbawa: Sep 1-30 + leading/trailing)
  const calendarDays: Date[] = [];
  let day = gridStart;
  while (day <= gridEnd) {
    calendarDays.push(day);
    day = addDays(day, 1);
  }

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

  // 🔒 Group assignments by date
  const assignmentsByDate: Record<string, Assignment[]> = {};
  for (const a of assignments) {
    const key = a.date.slice(0, 10);
    if (!assignmentsByDate[key]) assignmentsByDate[key] = [];
    assignmentsByDate[key].push(a);
  }

  async function handleCreateShift(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!shiftForm.name.trim()) {
      setFormError("Shift name is required.");
      return;
    }
    setSavingShift(true);
    try {
      await api.createShiftType(shiftForm);
      setShowCreateShiftModal(false);
      setShiftForm(emptyShiftForm);
      fetchAll();
    } catch (err: any) {
      setFormError(err.message ?? "Failed to create shift.");
    } finally {
      setSavingShift(false);
    }
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!assignForm.employee_id || !assignForm.shift_id || !assignDate) {
      setFormError("Please select an employee and shift.");
      return;
    }
    setSavingAssign(true);
    try {
      await api.assignShift({ ...assignForm, date: assignDate });
      setAssignDate(null);
      setAssignForm(emptyAssignForm);
      fetchAll();
    } catch (err: any) {
      setFormError(err.message ?? "Failed to assign shift.");
    } finally {
      setSavingAssign(false);
    }
  }

  // 🔒 Shift counts for current month
  const shiftCounts = shiftTypes.map((st) => ({
    ...st,
    count: assignments.filter((a) => a.shift_id === st.id).length,
  }));

  const monthLabel = format(currentMonth, "MMMM yyyy");

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-indigo-700 p-5 sm:p-6 text-white shadow-lg"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <CalendarDays className="w-6 h-6 sm:w-7 sm:h-7" /> Shift Scheduling
            </h1>
            <p className="text-white/70 text-xs sm:text-sm mt-1">
              Monthly view — manage and assign employee shifts
            </p>
          </div>
          <button
            onClick={() => {
              setShiftForm(emptyShiftForm);
              setFormError(null);
              setShowCreateShiftModal(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white/15 backdrop-blur-sm text-white rounded-xl border border-white/30 hover:bg-white/25 transition-colors text-sm font-medium shrink-0 self-start"
          >
            <Plus className="w-4 h-4" /> Create Shift
          </button>
        </div>
      </motion.div>

      {/* Legend */}
      {shiftTypes.length > 0 && (
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          {shiftTypes.map((st) => {
            const Icon = iconFor(st.type);
            return (
              <div
                key={st.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
                style={{
                  backgroundColor: `${st.color}20`,
                  borderColor: `${st.color}50`,
                }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: st.color }} />
                <span
                  className="text-xs font-medium"
                  style={{ color: st.color }}
                >
                  {st.name}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {shiftTypes.length === 0 && !loading && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          No shift types yet. Click "Create Shift" to add one (e.g. Day, Evening,
          Night).
        </div>
      )}

      {/* Monthly Calendar */}
      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        {/* Month Navigation */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <button
            onClick={() => setCurrentMonth((m) => addMonths(m, -1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
            title="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center min-w-0">
            <p className="font-semibold text-foreground text-sm sm:text-base truncate">
              {monthLabel}
            </p>
            <p className="text-xs text-muted-foreground">Monthly Schedule</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentMonth(startOfMonth(new Date()))}
              className="px-3 h-8 rounded-lg text-xs font-medium hover:bg-muted transition-colors"
              title="Today"
            >
              Today
            </button>
            <button
              onClick={() => fetchAll()}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
              title="Next month"
            >
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
            {/* Day-of-week header */}
            <div className="grid grid-cols-7 min-w-[700px] border-b border-border bg-muted/30">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div
                  key={d}
                  className="p-2 text-center text-xs font-semibold text-muted-foreground uppercase"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 min-w-[700px]">
              {calendarDays.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const inMonth = isSameMonth(day, currentMonth);
                const today = isToday(day);
                const holiday = PH_HOLIDAYS_2026[key];
                const dayAssignments = assignmentsByDate[key] ?? [];

                return (
                  <div
                    key={key}
                    className={`border-r border-b border-border last:border-r-0 min-h-[120px] ${
                      !inMonth ? "bg-muted/20 opacity-60" : ""
                    } ${today ? "bg-primary/5" : ""} ${
                      holiday ? "bg-red-50" : ""
                    }`}
                  >
                    <div className="p-2">
                      {/* Date number */}
                      <div className="flex items-center justify-between mb-1">
                        <p
                          className={`text-sm font-bold ${
                            today
                              ? "text-primary"
                              : holiday
                              ? "text-red-600"
                              : inMonth
                              ? "text-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {format(day, "d")}
                        </p>
                        {today && (
                          <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                        )}
                        {holiday && (
                          <Star className="w-3 h-3 text-red-500 fill-red-500" />
                        )}
                      </div>

                      {/* Holiday name */}
                      {holiday && (
                        <p className="text-[9px] font-semibold text-red-600 leading-tight mb-1 truncate">
                          {holiday.name}
                        </p>
                      )}

                      {/* Assignments */}
                      <div className="space-y-1">
                        {dayAssignments.slice(0, 3).map((block) => {
                          const Icon = iconFor(block.shift_type);
                          return (
                            <div
                              key={block.id}
                              className="rounded-md p-1 border text-[9px]"
                              style={{
                                backgroundColor: `${block.shift_color}20`,
                                borderColor: `${block.shift_color}50`,
                              }}
                            >
                              <div className="flex items-center gap-1">
                                <Icon
                                  className="w-2.5 h-2.5 shrink-0"
                                  style={{ color: block.shift_color }}
                                />
                                <span
                                  className="font-semibold truncate"
                                  style={{ color: block.shift_color }}
                                >
                                  {block.employee_name.split(" ")[0]}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        {dayAssignments.length > 3 && (
                          <p className="text-[9px] text-muted-foreground">
                            +{dayAssignments.length - 3} more
                          </p>
                        )}
                      </div>

                      {/* Add button (hover) */}
                      {inMonth && shiftTypes.length > 0 && (
                        <button
                          onClick={() => {
                            setAssignForm(emptyAssignForm);
                            setFormError(null);
                            setAssignDate(key);
                          }}
                          className="w-full text-center py-0.5 mt-1 rounded border border-dashed border-border text-[10px] text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors opacity-0 hover:opacity-100 focus:opacity-100"
                          style={{ opacity: 0.4 }}
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Shift Counts */}
      {shiftCounts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {shiftCounts.map((st, i) => {
            const Icon = iconFor(st.type);
            return (
              <motion.div
                key={st.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-2xl p-4 shadow-sm border border-border"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${st.color}20` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: st.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">
                      {st.name}
                    </p>
                    <p className="font-bold text-foreground text-lg">
                      {st.count}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  employees assigned this month
                </p>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Philippine Holidays Legend */}
      <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-4 h-4 text-red-500 fill-red-500" />
          <h3 className="text-sm font-semibold text-foreground">
            Philippine Holidays 2026
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {Object.entries(PH_HOLIDAYS_2026).map(([date, info]) => (
            <div key={date} className="flex items-start gap-2">
              <span className="text-red-600 font-mono shrink-0">
                {format(new Date(date), "MMM d")}
              </span>
              <span className="text-muted-foreground">{info.name}</span>
              {info.type === "regular" && (
                <span className="ml-auto text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                  Regular
                </span>
              )}
              {info.type === "special" && (
                <span className="ml-auto text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                  Special
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Create Shift Dialog */}
      <Dialog open={showCreateShiftModal} onOpenChange={setShowCreateShiftModal}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Shift</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateShift} className="space-y-4">
            {formError && (
              <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                {formError}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Shift Name
              </label>
              <input
                value={shiftForm.name}
                onChange={(e) =>
                  setShiftForm({ ...shiftForm, name: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="e.g. Day Shift"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Type
              </label>
              <select
                value={shiftForm.type}
                onChange={(e) =>
                  setShiftForm({ ...shiftForm, type: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="day">Day</option>
                <option value="evening">Evening</option>
                <option value="night">Night</option>
                <option value="rotating">Rotating</option>
              </select>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateShiftModal(false)}
                className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingShift}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                {savingShift ? "Saving..." : "Create Shift"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Shift Dialog */}
      <Dialog open={Boolean(assignDate)} onOpenChange={() => setAssignDate(null)}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Shift — {assignDate}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAssign} className="space-y-4">
            {formError && (
              <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                {formError}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Employee
              </label>
              <select
                value={assignForm.employee_id}
                onChange={(e) =>
                  setAssignForm({ ...assignForm, employee_id: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select employee</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Shift
              </label>
              <select
                value={assignForm.shift_id}
                onChange={(e) =>
                  setAssignForm({ ...assignForm, shift_id: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select shift</option>
                {shiftTypes.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAssignDate(null)}
                className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingAssign}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                {savingAssign ? "Saving..." : "Assign"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}