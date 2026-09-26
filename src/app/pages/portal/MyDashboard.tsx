import { useState, useEffect, useCallback } from "react";
import { LayoutDashboard, Clock, Palmtree, CalendarDays, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { format, startOfWeek, addDays } from "date-fns";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../../lib/api";

export function MyDashboardPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const from = format(weekStart, "yyyy-MM-dd");
      const to = format(addDays(weekStart, 6), "yyyy-MM-dd");
      const [prof, leaveData, sched] = await Promise.all([
        api.getMyProfile(),
        api.getMyLeaveRequests(),
        api.getMySchedule(from, to),
      ]);
      setProfile(prof);
      setLeaves(leaveData);
      setSchedule(sched);
    } catch (err: any) {
      console.error("Failed to load dashboard:", err);
      setError(err.message ?? "Failed to load your dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const pendingLeaves = leaves.filter((l) => l.status === "pending").length;
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const todayShift = schedule.find((s) => s.date?.slice(0, 10) === todayKey);

  return (
    <div className="p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-indigo-700 p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <LayoutDashboard className="w-7 h-7" /> Kumusta, {user?.full_name ?? "!"}
        </h1>
        <p className="text-white/70 text-sm mt-1">Narito ang buod ng iyong linggo</p>
      </motion.div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading...
        </div>
      )}
      {!loading && error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-card rounded-2xl p-5 border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <Palmtree className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-sm text-muted-foreground">Pending Leave Requests</p>
            </div>
            <p className="text-3xl font-bold text-foreground">{pendingLeaves}</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-card rounded-2xl p-5 border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-sm text-muted-foreground">Shift Ngayong Araw</p>
            </div>
            <p className="text-xl font-bold text-foreground">{todayShift ? todayShift.shift_name : "Walang naka-schedule"}</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-card rounded-2xl p-5 border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-sm text-muted-foreground">Job Title</p>
            </div>
            <p className="text-xl font-bold text-foreground">{profile?.job_title ?? "—"}</p>
          </motion.div>
        </div>
      )}
    </div>
  );
}