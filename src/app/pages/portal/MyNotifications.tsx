import { useState, useEffect, useCallback } from "react";
import { Bell, Loader2, CheckCircle2, XCircle, Info } from "lucide-react";
import { motion } from "motion/react";
import { api } from "../../../lib/api";

export function MyNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMyNotifications();
      setNotifications(data);
    } catch (err: any) {
      console.error("Failed to fetch notifications:", err);
      setError(err.message ?? "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  function getIcon(type: string) {
    if (type === "leave_approved") return { Icon: CheckCircle2, bg: "bg-emerald-50", color: "text-emerald-600" };
    if (type === "leave_rejected") return { Icon: XCircle, bg: "bg-red-50", color: "text-red-600" };
    return { Icon: Info, bg: "bg-blue-50", color: "text-blue-600" };
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-indigo-700 p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="w-7 h-7" /> Notifications</h1>
        <p className="text-white/70 text-sm mt-1">Mga update sa iyong mga leave request</p>
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
        <div className="space-y-3">
          {notifications.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-10">Walang bagong notification.</p>
          )}
          {notifications.map((n) => {
            const { Icon, bg, color } = getIcon(n.type);
            return (
              <motion.div key={n.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`bg-card rounded-xl p-4 border border-border shadow-sm flex items-start gap-3 ${!n.is_read ? "ring-1 ring-primary/20" : ""}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
                  <Icon className={`w-4.5 h-4.5 ${color}`} />
                </div>
                <div className="flex-1">
                  {n.title && <p className="text-sm font-medium text-foreground">{n.title}</p>}
                  <p className="text-sm text-foreground/90">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </div>
                {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}