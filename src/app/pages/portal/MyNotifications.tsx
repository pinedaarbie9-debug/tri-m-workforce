// src/app/pages/portal/MyNotifications.tsx
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Bell,
  Loader2,
  CheckCircle2,
  XCircle,
  Info,
  Check,
  CheckCheck,
  Trash2,
  Filter,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "../../../lib/api";
import { useNotifications } from "../../components/layout/NotificationsContext";

type FilterType = "all" | "unread";

export function MyNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const { refreshUnreadCount } = useNotifications();

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

  // 🔒 Filtered notifications
  const filteredNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((n) => !n.is_read);
    }
    return notifications;
  }, [notifications, filter]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  // 🔒 Mark single notification as read
  async function handleMarkRead(id: string) {
    setActionInProgress(id);
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      await refreshUnreadCount();
    } catch (err: any) {
      console.error("Failed to mark as read:", err);
      alert(err.message ?? "Failed to mark as read");
    } finally {
      setActionInProgress(null);
    }
  }

  // 🔒 Mark all notifications as read
  async function handleMarkAllRead() {
    if (unreadCount === 0) return;
    setActionInProgress("all");
    try {
      await api.markNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      await refreshUnreadCount();
    } catch (err: any) {
      console.error("Failed to mark all as read:", err);
      alert(err.message ?? "Failed to mark all as read");
    } finally {
      setActionInProgress(null);
    }
  }

  // 🔒 Delete notification
  async function handleDelete(id: string) {
    if (!confirm("Delete this notification?")) return;
    setActionInProgress(id);
    try {
      await api.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      await refreshUnreadCount();
    } catch (err: any) {
      console.error("Failed to delete notification:", err);
      alert(err.message ?? "Failed to delete notification");
    } finally {
      setActionInProgress(null);
    }
  }

  function getIcon(type: string) {
    if (type === "leave_approved")
      return {
        Icon: CheckCircle2,
        bg: "bg-emerald-50 dark:bg-emerald-500/10",
        color: "text-emerald-600 dark:text-emerald-400",
      };
    if (type === "leave_rejected")
      return {
        Icon: XCircle,
        bg: "bg-red-50 dark:bg-red-500/10",
        color: "text-red-600 dark:text-red-400",
      };
    return {
      Icon: Info,
      bg: "bg-blue-50 dark:bg-blue-500/10",
      color: "text-blue-600 dark:text-blue-400",
    };
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-indigo-700 p-6 text-white shadow-lg"
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="w-7 h-7" /> Notifications
              {unreadCount > 0 && (
                <span className="bg-white/20 text-white text-sm font-semibold px-2.5 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </h1>
            <p className="text-white/70 text-sm mt-1">
              Mga update sa iyong mga leave request at system
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={actionInProgress === "all"}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {actionInProgress === "all" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCheck className="w-4 h-4" />
              )}
              Mark all as read
            </button>
          )}
        </div>
      </motion.div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 bg-muted/40 rounded-lg p-1 w-fit">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
            filter === "all"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
            filter === "unread"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading...
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Notifications list */}
      {!loading && !error && (
        <div className="space-y-3">
          {filteredNotifications.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 text-muted-foreground"
            >
              <Bell className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">
                {filter === "unread"
                  ? "Walang unread notification."
                  : "Walang bagong notification."}
              </p>
            </motion.div>
          )}

          <AnimatePresence>
            {filteredNotifications.map((n) => {
              const { Icon, bg, color } = getIcon(n.type);
              const isProcessing = actionInProgress === n.id;

              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`bg-card rounded-xl p-4 border border-border shadow-sm flex items-start gap-3 transition-all ${
                    !n.is_read ? "ring-1 ring-primary/20 bg-primary/[0.02]" : ""
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${bg}`}
                  >
                    <Icon className={`w-4.5 h-4.5 ${color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    {n.title && (
                      <p className="text-sm font-medium text-foreground">
                        {n.title}
                      </p>
                    )}
                    <p className="text-sm text-foreground/90 break-words">
                      {n.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {!n.is_read && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        disabled={isProcessing}
                        title="Mark as read"
                        className="p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition-colors disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(n.id)}
                      disabled={isProcessing}
                      title="Delete notification"
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 dark:text-red-400 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0 ml-1" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}