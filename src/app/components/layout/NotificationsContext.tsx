import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "../../../lib/api";

interface NotificationsContextValue {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const { count } = await api.getUnreadNotificationCount();
      setUnreadCount(count);
    } catch (err) {
      console.error("Failed to fetch unread count:", err);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    await api.markNotificationsRead();
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [refreshUnreadCount]);

  return (
    <NotificationsContext.Provider value={{ unreadCount, refreshUnreadCount, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}