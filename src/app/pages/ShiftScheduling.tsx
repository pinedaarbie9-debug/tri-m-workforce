// src/app/pages/ShiftScheduling.tsx
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  Search,
  X,
  Check,
  Sparkles,
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
import { AutoScheduleDialog } from "../components/AutoScheduleDialog";
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
  start_time?: string; // "HH:mm"
  end_time?: string; // "HH:mm"
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
  shift_start?: string;
  shift_end?: string;
}
interface EmployeeOption {
  id: string;
  employee_code: string;
  full_name: string;
  job_title?: string | null;
}

const iconFor = (type: string) =>
  type === "day" ? Sun : type === "evening" ? Sunset : Moon;

// 🔒 Default na oras kada pumili ng type (pwede pa ring baguhin ng user)
const DEFAULT_TIMES: Record<string, { start_time: string; end_time: string }> = {
  day: { start_time: "08:00", end_time: "17:00" },
  evening: { start_time: "16:00", end_time: "00:30" },
  night: { start_time: "22:00", end_time: "06:00" },
  rotating: { start_time: "08:00", end_time: "17:00" },
};

const emptyShiftForm = {
  type: "day",
  name: "",
  color: "#f59e0b",
  start_time: DEFAULT_TIMES.day.start_time,
  end_time: DEFAULT_TIMES.day.end_time,
};
const emptyAssignForm = { employee_id: "", shift_id: "" };

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// "HH:mm:ss" -> "HH:mm" (para sa display)
const hhmm = (t?: string) => (t ? t.slice(0, 5) : "");

// 🔒 Petsa ngayon (YYYY-MM-DD). Ang ngayon mismo ay pwede pa; bawal ang bago nito.
const todayKeyNow = () => format(new Date(), "yyyy-MM-dd");
const isPastKey = (key: string) => key < todayKeyNow();

// Pinakaunang ID muna (E001, E002, ...). Numeric ang pagkukumpara kaya tama rin ang E2 bago E10.
const byCode = (a: { employee_code?: string }, b: { employee_code?: string }) =>
  (a.employee_code ?? "").localeCompare(b.employee_code ?? "", undefined, {
    numeric: true,
    sensitivity: "base",
  });

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

const inputCls =
  "w-full px-4 py-3 rounded-xl border border-border bg-input-background text-base focus:outline-none focus:ring-2 focus:ring-primary/30";

// ============================================================
// 🔎 Searchable employee picker — pangalan AT Employee ID ang hinahanap
// ============================================================
function EmployeeCombobox({
  employees,
  value,
  onChange,
  assignedIds,
}: {
  employees: EmployeeOption[];
  value: string;
  onChange: (id: string) => void;
  assignedIds: Set<string>;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = employees.find((e) => e.id === value) ?? null;

  const results = useMemo(() => {
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return employees;
    return employees.filter((e) => {
      const hay = `${e.full_name ?? ""} ${e.employee_code ?? ""}`.toLowerCase();
      return tokens.every((t) => hay.includes(t));
    });
  }, [employees, query]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function pick(emp: EmployeeOption) {
    onChange(emp.id);
    setQuery("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault(); // huwag i-submit ang form
      if (results[active]) pick(results[active]);
    }
  }

  // Napili na: ipakita ang pangalan + ID, may X para palitan
  if (selected) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl border border-primary/40 bg-primary/5">
        <div className="w-11 h-11 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center shrink-0">
          {initials(selected.full_name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-foreground truncate">{selected.full_name}</p>
          <p className="text-sm text-muted-foreground font-mono">{selected.employee_code}</p>
        </div>
        <button
          type="button"
          onClick={() => onChange("")}
          className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-muted transition-colors shrink-0"
          title="Change employee"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type name or Employee ID (e.g. karen, E033)"
          className={`${inputCls} pl-11`}
          autoComplete="off"
        />
      </div>

      <div
        ref={listRef}
        className="max-h-72 overflow-y-auto rounded-xl border border-border divide-y divide-border bg-card"
      >
        {results.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No employee found for "{query}".
          </p>
        )}
        {results.map((emp, i) => (
          <button
            type="button"
            key={emp.id}
            data-idx={i}
            onClick={() => pick(emp)}
            onMouseEnter={() => setActive(i)}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors ${
              i === active ? "bg-primary/10" : "hover:bg-muted/50"
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
              {initials(emp.full_name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-medium text-foreground truncate">{emp.full_name}</p>
              <p className="text-sm text-muted-foreground truncate">
                <span className="font-mono">{emp.employee_code}</span>
                {emp.job_title ? ` · ${emp.job_title}` : ""}
              </p>
            </div>
            {assignedIds.has(emp.id) && (
              <span className="text-xs font-medium px-2 py-1 rounded-md bg-amber-100 text-amber-700 shrink-0">
                Already assigned
              </span>
            )}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {results.length} of {employees.length} employees · ↑ ↓ to move, Enter to select
      </p>
    </div>
  );
}

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

  // Listahan ng lahat ng naka-assign sa isang araw (para sa "+N more")
  const [dayView, setDayView] = useState<string | null>(null);
  const [dayQuery, setDayQuery] = useState("");

  // 🆕 Auto-schedule dialog
  const [autoOpen, setAutoOpen] = useState(false);

  // 🔒 Date range: buong buwan (kasama ang leading/trailing days para sa grid)
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const from = format(gridStart, "yyyy-MM-dd");
  const to = format(gridEnd, "yyyy-MM-dd");

  // 🆕 Default range ng auto-schedule: simula ngayon (o simula ng buwan kung future na),
  // hanggang katapusan ng buwan. Hindi na magsisimula sa petsang lumipas na.
  const todayKey = todayKeyNow();
  const monthStartKey = format(monthStart, "yyyy-MM-dd");
  const monthEndKey = format(monthEnd, "yyyy-MM-dd");
  const autoFrom = monthStartKey < todayKey ? todayKey : monthStartKey;
  const autoTo = monthEndKey < autoFrom ? autoFrom : monthEndKey;

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

  // 🔒 Employees naka-sort ayon sa Employee ID (E001 muna) + lookup ng code per id
  const sortedEmployees: EmployeeOption[] = useMemo(
    () => [...employees].sort(byCode),
    [employees]
  );
  const empById = useMemo(() => {
    const m: Record<string, EmployeeOption> = {};
    for (const e of employees) m[e.id] = e;
    return m;
  }, [employees]);

  // 🔒 Group assignments by date (naka-sort ayon sa Employee ID)
  const codeOf = (a: Assignment) => empById[a.employee_id]?.employee_code ?? "";
  const assignmentsByDate: Record<string, Assignment[]> = {};
  for (const a of assignments) {
    const key = a.date.slice(0, 10);
    if (!assignmentsByDate[key]) assignmentsByDate[key] = [];
    assignmentsByDate[key].push(a);
  }
  for (const key of Object.keys(assignmentsByDate)) {
    assignmentsByDate[key].sort((a, b) => byCode({ employee_code: codeOf(a) }, { employee_code: codeOf(b) }));
  }

  // 🔒 Kapag nagpalit ng type, ilagay ang default na oras
  function handleTypeChange(type: string) {
    const t = DEFAULT_TIMES[type] ?? DEFAULT_TIMES.day;
    setShiftForm((f) => ({ ...f, type, start_time: t.start_time, end_time: t.end_time }));
  }

  async function handleCreateShift(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!shiftForm.name.trim()) {
      setFormError("Shift name is required.");
      return;
    }
    if (!TIME_RE.test(shiftForm.start_time) || !TIME_RE.test(shiftForm.end_time)) {
      setFormError("Start time and end time are required.");
      return;
    }
    if (shiftForm.start_time === shiftForm.end_time) {
      setFormError("Start time and end time must not be the same.");
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
    // 🔒 Bawal mag-schedule sa petsang lumipas na
    if (isPastKey(assignDate)) {
      setFormError("You can't schedule a shift on a past date.");
      return;
    }
    setSavingAssign(true);
    try {
      await api.assignShift({ ...assignForm, date: assignDate });
      setAssignDate(null);
      setAssignForm(emptyAssignForm);
      fetchAll();
    } catch (err: any) {
      // Kasama dito ang 409 na mensahe ng 6-day rule
      setFormError(err.message ?? "Failed to assign shift.");
    } finally {
      setSavingAssign(false);
    }
  }

  function openAssign(key: string) {
    // 🔒 Huwag buksan ang assign dialog para sa nakaraang araw
    if (isPastKey(key)) return;
    setAssignForm(emptyAssignForm);
    setFormError(null);
    setAssignDate(key);
  }

  // 🔒 Shift counts for current month
  const shiftCounts = shiftTypes.map((st) => ({
    ...st,
    count: assignments.filter((a) => a.shift_id === st.id).length,
  }));

  const monthLabel = format(currentMonth, "MMMM yyyy");

  const assignedIdsForDate = new Set(
    (assignDate ? assignmentsByDate[assignDate] ?? [] : []).map((a) => a.employee_id)
  );

  const dayList = useMemo(() => {
    if (!dayView) return [];
    const list = assignmentsByDate[dayView] ?? [];
    const tokens = dayQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return list;
    return list.filter((a) => {
      const hay = `${a.employee_name} ${codeOf(a)} ${a.shift_name}`.toLowerCase();
      return tokens.every((t) => hay.includes(t));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayView, dayQuery, assignments, empById]);

  const MAX_CHIPS = 3;

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-indigo-700 p-6 sm:p-8 text-white shadow-lg"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <CalendarDays className="w-7 h-7 sm:w-8 sm:h-8" /> Shift Scheduling
            </h1>
            <p className="text-white/80 text-sm sm:text-base mt-1.5">
              Monthly view — manage and assign employee shifts
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0 self-start">
            <button
              onClick={() => setAutoOpen(true)}
              disabled={shiftTypes.length === 0}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-white text-primary rounded-xl hover:bg-white/90 disabled:opacity-60 transition-colors text-base font-semibold"
              title={shiftTypes.length === 0 ? "Create a shift first" : "Auto-schedule shifts"}
            >
              <Sparkles className="w-5 h-5" /> Auto-schedule
            </button>
            <button
              onClick={() => {
                setShiftForm(emptyShiftForm);
                setFormError(null);
                setShowCreateShiftModal(true);
              }}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-white/15 backdrop-blur-sm text-white rounded-xl border border-white/30 hover:bg-white/25 transition-colors text-base font-semibold"
            >
              <Plus className="w-5 h-5" /> Create Shift
            </button>
          </div>
        </div>
      </motion.div>

      {/* Legend */}
      {shiftTypes.length > 0 && (
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          {shiftTypes.map((st) => {
            const Icon = iconFor(st.type);
            const hasTimes =
              st.start_time && st.end_time && hhmm(st.start_time) !== hhmm(st.end_time);
            return (
              <div
                key={st.id}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border"
                style={{
                  backgroundColor: `${st.color}20`,
                  borderColor: `${st.color}50`,
                }}
              >
                <Icon className="w-5 h-5" style={{ color: st.color }} />
                <span className="text-sm sm:text-base font-semibold" style={{ color: st.color }}>
                  {st.name}
                  {hasTimes ? ` · ${hhmm(st.start_time)}–${hhmm(st.end_time)}` : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {shiftTypes.length === 0 && !loading && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-base text-amber-700">
          No shift types yet. Click "Create Shift" to add one (e.g. Day, Evening, Night).
        </div>
      )}

      {/* Monthly Calendar */}
      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        {/* Month Navigation */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border">
          <button
            onClick={() => setCurrentMonth((m) => addMonths(m, -1))}
            className="w-11 h-11 rounded-xl flex items-center justify-center hover:bg-muted transition-colors"
            title="Previous month"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="text-center min-w-0">
            <p className="font-bold text-foreground text-xl sm:text-2xl truncate">{monthLabel}</p>
            <p className="text-sm text-muted-foreground">Monthly Schedule</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentMonth(startOfMonth(new Date()))}
              className="px-4 h-11 rounded-xl text-sm sm:text-base font-semibold hover:bg-muted transition-colors"
              title="Today"
            >
              Today
            </button>
            <button
              onClick={() => fetchAll()}
              className="w-11 h-11 rounded-xl flex items-center justify-center hover:bg-muted transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              className="w-11 h-11 rounded-xl flex items-center justify-center hover:bg-muted transition-colors"
              title="Next month"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground text-base">
            <Loader2 className="w-6 h-6 mr-2 animate-spin" /> Loading schedule...
          </div>
        ) : error ? (
          <div className="p-5 text-base text-red-700">Failed to load: {error}</div>
        ) : (
          <div className="overflow-x-auto">
            {/* Day-of-week header */}
            <div className="grid grid-cols-7 min-w-[1050px] border-b border-border bg-muted/30">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div
                  key={d}
                  className="p-3 text-center text-sm font-bold text-muted-foreground uppercase tracking-wide"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 min-w-[1050px]">
              {calendarDays.map((d) => {
                const key = format(d, "yyyy-MM-dd");
                const inMonth = isSameMonth(d, currentMonth);
                const today = isToday(d);
                const past = isPastKey(key);
                const holiday = PH_HOLIDAYS_2026[key];
                const dayAssignments = assignmentsByDate[key] ?? [];

                return (
                  <div
                    key={key}
                    className={`border-r border-b border-border last:border-r-0 min-h-[210px] ${
                      !inMonth ? "bg-muted/20 opacity-60" : ""
                    } ${today ? "bg-primary/5" : ""} ${holiday ? "bg-red-50" : ""} ${
                      past && inMonth && !holiday ? "bg-muted/10" : ""
                    }`}
                  >
                    <div className="p-2.5">
                      {/* Date number */}
                      <div className="flex items-center justify-between mb-1.5">
                        <p
                          className={`text-lg font-bold leading-none ${
                            today
                              ? "text-primary"
                              : holiday
                              ? "text-red-600"
                              : inMonth
                              ? past
                                ? "text-muted-foreground"
                                : "text-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {format(d, "d")}
                        </p>
                        <div className="flex items-center gap-1.5">
                          {today && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                          {holiday && <Star className="w-4 h-4 text-red-500 fill-red-500" />}
                        </div>
                      </div>

                      {/* Holiday name */}
                      {holiday && (
                        <p className="text-xs font-semibold text-red-600 leading-tight mb-1.5 truncate">
                          {holiday.name}
                        </p>
                      )}

                      {/* Assignments */}
                      <div className="space-y-1.5">
                        {dayAssignments.slice(0, MAX_CHIPS).map((block) => {
                          const Icon = iconFor(block.shift_type);
                          const code = empById[block.employee_id]?.employee_code;
                          const hasTimes =
                            block.shift_start &&
                            block.shift_end &&
                            hhmm(block.shift_start) !== hhmm(block.shift_end);
                          return (
                            <div
                              key={block.id}
                              className="rounded-lg px-2 py-1.5 border"
                              style={{
                                backgroundColor: `${block.shift_color}20`,
                                borderColor: `${block.shift_color}50`,
                              }}
                              title={`${block.employee_name}${code ? ` (${code})` : ""} · ${block.shift_name}${
                                hasTimes ? ` ${hhmm(block.shift_start)}–${hhmm(block.shift_end)}` : ""
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <Icon
                                  className="w-4 h-4 shrink-0"
                                  style={{ color: block.shift_color }}
                                />
                                <span
                                  className="text-sm font-semibold truncate"
                                  style={{ color: block.shift_color }}
                                >
                                  {block.employee_name}
                                </span>
                              </div>
                              <p
                                className="text-xs leading-tight mt-0.5 opacity-90 truncate"
                                style={{ color: block.shift_color }}
                              >
                                {code && <span className="font-mono font-semibold">{code}</span>}
                                {code && hasTimes ? " · " : ""}
                                {hasTimes ? `${hhmm(block.shift_start)}–${hhmm(block.shift_end)}` : ""}
                              </p>
                            </div>
                          );
                        })}
                        {dayAssignments.length > MAX_CHIPS && (
                          <button
                            onClick={() => {
                              setDayQuery("");
                              setDayView(key);
                            }}
                            className="w-full text-left text-sm font-semibold text-primary hover:underline py-0.5"
                          >
                            +{dayAssignments.length - MAX_CHIPS} more — view all
                          </button>
                        )}
                      </div>

                      {/* Add button — nakatago sa mga nakaraang araw */}
                      {inMonth && shiftTypes.length > 0 && !past && (
                        <button
                          onClick={() => openAssign(key)}
                          className="w-full flex items-center justify-center py-1.5 mt-2 rounded-lg border border-dashed border-border text-base text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-colors"
                          title="Assign shift"
                        >
                          <Plus className="w-4 h-4" />
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
                className="bg-card rounded-2xl p-5 shadow-sm border border-border"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${st.color}20` }}
                  >
                    <Icon className="w-7 h-7" style={{ color: st.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-base text-muted-foreground truncate">{st.name}</p>
                    <p className="font-bold text-foreground text-3xl leading-tight">{st.count}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-3">employees assigned this month</p>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Philippine Holidays Legend */}
      <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-red-500 fill-red-500" />
          <h3 className="text-lg font-semibold text-foreground">Philippine Holidays 2026</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5 text-sm sm:text-base">
          {Object.entries(PH_HOLIDAYS_2026).map(([date, info]) => (
            <div key={date} className="flex items-center gap-3">
              <span className="text-red-600 font-mono shrink-0">
                {format(new Date(`${date}T00:00:00`), "MMM d")}
              </span>
              <span className="text-muted-foreground">{info.name}</span>
              {info.type === "regular" && (
                <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-1 rounded-md font-medium">
                  Regular
                </span>
              )}
              {info.type === "special" && (
                <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-md font-medium">
                  Special
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Create Shift Dialog */}
      <Dialog open={showCreateShiftModal} onOpenChange={setShowCreateShiftModal}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Create Shift</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateShift} className="space-y-5">
            {formError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-base text-destructive">
                {formError}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-base font-medium text-foreground">Shift Name</label>
              <input
                value={shiftForm.name}
                onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                className={inputCls}
                placeholder="e.g. Day Shift"
              />
            </div>
            <div className="space-y-2">
              <label className="text-base font-medium text-foreground">Type</label>
              <select
                value={shiftForm.type}
                onChange={(e) => handleTypeChange(e.target.value)}
                className={inputCls}
              >
                <option value="day">Day</option>
                <option value="evening">Evening</option>
                <option value="night">Night</option>
                <option value="rotating">Rotating</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-base font-medium text-foreground">Start Time</label>
                <input
                  type="time"
                  value={shiftForm.start_time}
                  onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })}
                  required
                  className={inputCls}
                />
              </div>
              <div className="space-y-2">
                <label className="text-base font-medium text-foreground">End Time</label>
                <input
                  type="time"
                  value={shiftForm.end_time}
                  onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })}
                  required
                  className={inputCls}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              If the end time is earlier than the start time, the shift ends the next day
              (overnight shift).
            </p>
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateShiftModal(false)}
                className="px-5 py-3 text-base rounded-xl border border-border hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingShift}
                className="px-5 py-3 text-base font-semibold bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                {savingShift ? "Saving..." : "Create Shift"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Shift Dialog */}
      <Dialog open={Boolean(assignDate)} onOpenChange={() => setAssignDate(null)}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Assign Shift
              {assignDate && (
                <span className="block text-base font-normal text-muted-foreground mt-0.5">
                  {format(new Date(`${assignDate}T00:00:00`), "EEEE, MMMM d, yyyy")}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAssign} className="space-y-5">
            {formError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-base text-destructive">
                {formError}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-base font-medium text-foreground">Employee</label>
              <EmployeeCombobox
                employees={sortedEmployees}
                value={assignForm.employee_id}
                onChange={(id) => setAssignForm((f) => ({ ...f, employee_id: id }))}
                assignedIds={assignedIdsForDate}
              />
            </div>

            <div className="space-y-2">
              <label className="text-base font-medium text-foreground">Shift</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {shiftTypes.map((st) => {
                  const Icon = iconFor(st.type);
                  const hasTimes =
                    st.start_time && st.end_time && hhmm(st.start_time) !== hhmm(st.end_time);
                  const on = assignForm.shift_id === st.id;
                  return (
                    <button
                      type="button"
                      key={st.id}
                      onClick={() => setAssignForm((f) => ({ ...f, shift_id: st.id }))}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-colors ${
                        on ? "" : "border-border hover:bg-muted/40"
                      }`}
                      style={on ? { borderColor: st.color, backgroundColor: `${st.color}18` } : undefined}
                    >
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${st.color}25` }}
                      >
                        <Icon className="w-6 h-6" style={{ color: st.color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold text-foreground truncate">{st.name}</p>
                        {hasTimes && (
                          <p className="text-sm text-muted-foreground">
                            {hhmm(st.start_time)}–{hhmm(st.end_time)}
                          </p>
                        )}
                      </div>
                      {on && <Check className="w-5 h-5 shrink-0" style={{ color: st.color }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAssignDate(null)}
                className="px-5 py-3 text-base rounded-xl border border-border hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingAssign}
                className="px-5 py-3 text-base font-semibold bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                {savingAssign ? "Saving..." : "Assign"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Day detail — lahat ng naka-assign sa isang araw */}
      <Dialog open={Boolean(dayView)} onOpenChange={() => setDayView(null)}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {dayView ? format(new Date(`${dayView}T00:00:00`), "EEEE, MMMM d, yyyy") : ""}
              <span className="block text-base font-normal text-muted-foreground mt-0.5">
                {dayView ? (assignmentsByDate[dayView] ?? []).length : 0} employees assigned
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                value={dayQuery}
                onChange={(e) => setDayQuery(e.target.value)}
                placeholder="Search name, Employee ID or shift"
                className={`${inputCls} pl-11`}
              />
            </div>
            <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-border divide-y divide-border">
              {dayList.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">No results.</p>
              )}
              {dayList.map((a) => {
                const Icon = iconFor(a.shift_type);
                const hasTimes =
                  a.shift_start && a.shift_end && hhmm(a.shift_start) !== hhmm(a.shift_end);
                return (
                  <div key={a.id} className="flex items-center gap-3 px-3.5 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-medium text-foreground truncate">{a.employee_name}</p>
                      <p className="text-sm text-muted-foreground font-mono">{codeOf(a)}</p>
                    </div>
                    <span
                      className="inline-flex items-center gap-1.5 text-sm font-semibold px-2.5 py-1 rounded-lg border shrink-0"
                      style={{
                        color: a.shift_color,
                        backgroundColor: `${a.shift_color}20`,
                        borderColor: `${a.shift_color}50`,
                      }}
                    >
                      <Icon className="w-4 h-4" />
                      {hasTimes ? `${hhmm(a.shift_start)}–${hhmm(a.shift_end)}` : a.shift_name}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Nakatago ang "Assign employee" kung nakaraang araw na */}
            {dayView && !isPastKey(dayView) && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const key = dayView;
                    setDayView(null);
                    if (key) openAssign(key);
                  }}
                  className="flex items-center gap-2 px-5 py-3 text-base font-semibold bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-5 h-5" /> Assign employee
                </button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 🆕 Auto-schedule Dialog (preview muna bago i-save) */}
      <AutoScheduleDialog
        open={autoOpen}
        onClose={() => setAutoOpen(false)}
        shiftTypes={shiftTypes}
        defaultFrom={autoFrom}
        defaultTo={autoTo}
        onApplied={fetchAll}
      />
    </div>
  );
}