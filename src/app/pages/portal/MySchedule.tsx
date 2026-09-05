import { useState, useEffect, useCallback } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, Sun, Sunset, Moon } from "lucide-react";
import { motion } from "motion/react";
import { format, startOfWeek, addDays, isToday } from "date-fns";
import { api } from "../../../lib/api";

const iconFor = (type: string) => (type === "day" ? Sun : type === "evening" ? Sunset : Moon);

export function MySchedulePage() {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const from = format(weekStart, "yyyy-MM-dd");
  const to = format(addDays(weekStart, 6), "yyyy-MM-dd");

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMySchedule(from, to);
      setAssignments(data);
    } catch (err: any) {
      console.error("Failed to fetch schedule:", err);
      setError(err.message ?? "Failed to load your schedule");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  return (
    <div className="p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-indigo-700 p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarDays className="w-7 h-7" /> My Schedule</h1>
        <p className="text-white/70 text-sm mt-1">Sariling shift schedule para sa linggong ito</p>
      </motion.div>

      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <button onClick={() => setWeekStart((d) => addDays(d, -7))} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <p className="font-semibold text-foreground">{format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}</p>
            <p className="text-xs text-muted-foreground">Weekly Schedule</p>
          </div>
          <button onClick={() => setWeekStart((d) => addDays(d, 7))} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading...
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-red-700">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="grid grid-cols-7 min-w-[700px]">
              {weekDays.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const today = isToday(day);
                const dayAssignments = assignments.filter((a) => a.date?.slice(0, 10) === key);
                return (
                  <div key={key} className="border-r border-border last:border-r-0">
                    <div className={`p-3 text-center border-b border-border ${today ? "bg-primary/5" : ""}`}>
                      <p className="text-xs font-semibold text-muted-foreground uppercase">{format(day, "EEE")}</p>
                      <p className={`text-lg font-bold mt-0.5 ${today ? "text-primary" : "text-foreground"}`}>{format(day, "d")}</p>
                      {today && <div className="w-1.5 h-1.5 bg-primary rounded-full mx-auto mt-1" />}
                    </div>
                    <div className="p-2 space-y-1.5 min-h-[140px]">
                      {dayAssignments.length === 0 && (
                        <p className="text-[11px] text-muted-foreground text-center pt-4">Walang shift</p>
                      )}
                      {dayAssignments.map((a) => {
                        const Icon = iconFor(a.shift_type);
                        return (
                          <div key={a.id} className="rounded-lg p-2 border" style={{ backgroundColor: `${a.shift_color}20`, borderColor: `${a.shift_color}50` }}>
                            <div className="flex items-center gap-1">
                              <Icon className="w-3 h-3" style={{ color: a.shift_color }} />
                              <span className="text-[11px] font-semibold" style={{ color: a.shift_color }}>{a.shift_name}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}