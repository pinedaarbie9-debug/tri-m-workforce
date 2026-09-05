import { useState, useEffect, useCallback } from "react";
import { Bell, CheckCircle2, Clock, CalendarDays, AlertCircle, Info, Check, Trash2, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { api } from "../../lib/api";
import { useNotifications } from "../components/layout/NotificationsContext";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
  is_read?: boolean;
}

const typeConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  leave_request:    { icon: CalendarDays, color: "text-blue-600",   bg: "bg-blue-50" },
  leave_approved:   { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
  leave_rejected:   { icon: AlertCircle,  color: "text-red-600",    bg: "bg-red-50" },
  shift_assigned:   { icon: Clock,        color: "text-amber-600",  bg: "bg-amber-50" },
  timesheet_due:    { icon: Clock,        color: "text-orange-600", bg: "bg-orange-50" },
  attendance_alert: { icon: AlertCircle,  color: "text-red-600",    bg: "bg-red-50" },
  system:           { icon: Info,         color: "text-gray-600",   bg: "bg-gray-50" },
  announcement:     { icon: Bell,         color: "text-purple-600", bg: "bg-purple-50" },
};

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const { refreshUnreadCount } = useNotifications();

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getNotifications();
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

  const filtered = filter === "unread" ? notifications.filter((n) => !n.is_read) : notifications;
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    try {
      await api.markNotificationRead(id);
      refreshUnreadCount();
    } catch (err: any) {
      console.error("Failed to mark as read:", err);
      fetchNotifications();
    }
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await api.markNotificationsRead();
      refreshUnreadCount();
    } catch (err: any) {
      console.error("Failed to mark all as read:", err);
      fetchNotifications();
    }
  }

  async function deleteNotification(id: string) {
    const wasUnread = notifications.find((n) => n.id === id)?.is_read === false;
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await api.deleteNotification(id);
      if (wasUnread) refreshUnreadCount();
    } catch (err: any) {
      console.error("Failed to delete notification:", err);
      fetchNotifications();
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-indigo-700 p-6 text-white shadow-lg"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="w-7 h-7" /> Notifications</h1>
            <p className="text-white/70 text-sm mt-1">Stay updated on workforce activities</p>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-2 border border-white/20 text-center">
            <p className="text-white/60 text-xs">Unread</p>
            <p className="text-white font-bold text-xl">{unreadCount}</p>
          </div>
        </div>
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
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
                {(["all", "unread"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${filter === f ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {f === "all" ? `All (${notifications.length})` : `Unread (${unreadCount})`}
                  </button>
                ))}
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-xl transition-colors"
              >
                <Check className="w-4 h-4" /> Mark all as read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="space-y-2">
            {filtered.map((notif, i) => {
              const cfg = typeConfig[notif.type] ?? typeConfig.system;
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`flex items-start gap-4 p-4 rounded-2xl border transition-all group ${
                    notif.is_read ? "bg-card border-border" : "bg-primary/5 border-primary/20"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                    <Icon className={`w-5 h-5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {notif.title}
                          {!notif.is_read && (
                            <span className="ml-2 inline-block w-2 h-2 bg-primary rounded-full align-middle" />
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{notif.message}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notif.is_read && (
                          <button
                            onClick={() => markRead(notif.id)}
                            title="Mark as read"
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
                          >
                            <Check className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notif.id)}
                          title="Delete"
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(notif.created_at).toLocaleString()}</p>
                  </div>
                </motion.div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No notifications</p>
                <p className="text-sm">You&apos;re all caught up!</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}