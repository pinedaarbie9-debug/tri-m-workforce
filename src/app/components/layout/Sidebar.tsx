import { NavLink, useLocation } from "react-router";
import {
  LayoutDashboard,
  Users,
  Clock,
  Fingerprint,
  CalendarDays,
  Palmtree,
  FileSpreadsheet,
  BarChart3,
  FileText,
  Settings,
  ShieldCheck,
  ClipboardList,
  Bell,
  ChevronLeft,
  ChevronRight,
  Building2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../components/ui/utils";
import { useNotifications } from "./NotificationsContext";
import { useAuth } from "../../context/AuthContext";
import { canAccess } from "../../config/permissions";
import logo from "../../assets/tri-m-logo.png";

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", icon: LayoutDashboard, path: "/" }],
  },
  {
    title: "Workforce",
    items: [
      { label: "Employees", icon: Users, path: "/employees" },
      { label: "Departments", icon: Building2, path: "/departments" },
      { label: "Attendance", icon: Clock, path: "/attendance" },
      { label: "Biometric Auth", icon: Fingerprint, path: "/biometric" },
    ],
  },
  {
    title: "Scheduling",
    items: [
      { label: "Shift Scheduling", icon: CalendarDays, path: "/shifts" },
      { label: "Leave Management", icon: Palmtree, path: "/leave" },
      { label: "Timesheets", icon: FileSpreadsheet, path: "/timesheets" },
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Analytics", icon: BarChart3, path: "/analytics" },
      { label: "Reports", icon: FileText, path: "/reports" },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Notifications", icon: Bell, path: "/notifications" },
      { label: "User Management", icon: ShieldCheck, path: "/users" },
      { label: "Audit Logs", icon: ClipboardList, path: "/audit" },
      { label: "Settings", icon: Settings, path: "/settings" },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { unreadCount } = useNotifications();
  const { user } = useAuth();

  // BAGO: i-filter muna ang bawat group base sa role ng naka-login na user
  // gamit ang canAccess() helper (mula sa config/permissions.ts). Kung
  // maubos ang items ng isang group (walang natirang pwedeng makita ang
  // role na ito), itinatago rin ang buong group title para hindi lumabas
  // ang isang blangkong section header.
  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccess(item.path, user?.role)),
  })).filter((group) => group.items.length > 0);

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="relative flex flex-col h-full bg-sidebar border-r border-sidebar-border overflow-hidden"
      style={{ flexShrink: 0 }}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={logo}
            alt="Tri-M Global Logistics & Trading Inc."
            className="shrink-0 w-9 h-9 rounded-xl object-contain bg-white p-1"
          />
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <p className="text-white font-semibold text-sm leading-tight whitespace-nowrap">Tri-M Global</p>
                <p className="text-sidebar-foreground text-xs whitespace-nowrap">Logistics & Trading Inc.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation — gumagamit na ng visibleGroups sa halip na NAV_GROUPS */}
      <div className="flex-1 overflow-y-auto py-3 space-y-1 scrollbar-thin">
        {visibleGroups.map((group) => (
          <div key={group.title} className="mb-1">
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50"
                >
                  {group.title}
                </motion.p>
              )}
            </AnimatePresence>
            {group.items.map((item) => {
              const isActive =
                item.path === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.path);

              return (
                <NavLink key={item.path} to={item.path} className="block px-3">
                  <div
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group relative",
                      collapsed ? "justify-center" : "",
                      isActive
                        ? "bg-sidebar-accent text-white"
                        : "text-sidebar-foreground hover:bg-sidebar-border/50 hover:text-white"
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-sidebar-primary rounded-r-full" />
                    )}
                    <item.icon
                      className={cn(
                        "shrink-0 w-4 h-4",
                        isActive ? "text-sidebar-primary" : "text-sidebar-foreground/70 group-hover:text-white"
                      )}
                    />
                    <AnimatePresence initial={false}>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -8 }}
                          transition={{ duration: 0.15 }}
                          className="text-sm font-medium whitespace-nowrap flex-1"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {!collapsed && item.path === "/notifications" && unreadCount > 0 && (
                      <span className="bg-sidebar-primary text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute top-1/2 -right-3 w-6 h-6 rounded-full bg-sidebar-primary text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-10"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </motion.aside>
  );
}