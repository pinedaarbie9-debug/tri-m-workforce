import { NavLink, useLocation } from "react-router";
import {
  LayoutDashboard,
  Clock,
  Palmtree,
  CalendarDays,
  UserCircle,
  Bell,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../components/ui/utils";
import logo from "../../assets/tri-m-logo.png";

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "My Dashboard", icon: LayoutDashboard, path: "/portal" },
  { label: "My Attendance", icon: Clock, path: "/portal/attendance" },
  { label: "My Leave", icon: Palmtree, path: "/portal/leave" },
  { label: "My Schedule", icon: CalendarDays, path: "/portal/schedule" },
  { label: "My Profile", icon: UserCircle, path: "/portal/profile" },
  { label: "Notifications", icon: Bell, path: "/portal/notifications" },
];

interface EmployeeSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function EmployeeSidebar({ collapsed, onToggle }: EmployeeSidebarProps) {
  const location = useLocation();

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="relative flex flex-col h-full bg-sidebar border-r border-sidebar-border overflow-hidden"
      style={{ flexShrink: 0 }}
    >
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
                <p className="text-sidebar-foreground text-xs whitespace-nowrap">Employee Portal</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-3 space-y-1 scrollbar-thin">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.path === "/portal"
              ? location.pathname === "/portal"
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
              </div>
            </NavLink>
          );
        })}
      </div>

      <button
        onClick={onToggle}
        className="absolute top-1/2 -right-3 w-6 h-6 rounded-full bg-sidebar-primary text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-10"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </motion.aside>
  );
}