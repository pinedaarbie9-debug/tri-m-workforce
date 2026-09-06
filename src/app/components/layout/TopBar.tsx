import { useState, useRef, useEffect, useMemo } from "react";
import { Search, Bell, ChevronDown, LogOut, User, Settings, FileText } from "lucide-react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "./NotificationsContext";
import { ThemeToggle } from "./ThemeToggle";
import { api } from "../../../lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";

// Parehong listahan ng reports gaya ng ginamit sa SearchResults.tsx —
// panatilihing magkatugma kung magdadagdag ka pa ng bagong report type doon.
const REPORT_ITEMS = [
  { key: "attendance-summary", name: "Attendance Summary" },
  { key: "headcount", name: "Headcount Report" },
  { key: "leave-summary", name: "Leave Summary" },
  { key: "overtime", name: "Overtime Report" },
  { key: "timesheet", name: "Timesheet Report" },
  { key: "audit-export", name: "Audit Export" },
];

const MAX_SUGGESTIONS = 5;

export function TopBar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const [searchValue, setSearchValue] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  const trimmedQuery = searchValue.trim();
  const lowerQuery = trimmedQuery.toLowerCase();

  // Kinukuha lang ang listahan ng employees kapag may laman na ang search box.
  // React Query mismo ang nag-cache nito kaya hindi paulit-ulit tatawag sa API.
  const { data: employees } = useQuery<any[]>({
    queryKey: ["employees"],
    queryFn: api.getEmployees,
    enabled: trimmedQuery.length > 0,
  });

  const suggestedEmployees = useMemo(() => {
    if (!employees || !lowerQuery) return [];
    return employees
      .filter((e: any) => {
        const haystack = [
          e.full_name,
          e.first_name,
          e.last_name,
          e.email,
          e.job_title,
          e.position,
          e.department?.name,
          e.department_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(lowerQuery);
      })
      .slice(0, MAX_SUGGESTIONS);
  }, [employees, lowerQuery]);

  const suggestedReports = useMemo(() => {
    if (!lowerQuery) return [];
    return REPORT_ITEMS.filter((r) => r.name.toLowerCase().includes(lowerQuery)).slice(0, MAX_SUGGESTIONS);
  }, [lowerQuery]);

  const hasSuggestions = suggestedEmployees.length > 0 || suggestedReports.length > 0;

  // Isara ang dropdown pag nag-click sa labas nito.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = user?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() ?? "U";

  // "Settings" ay para lang sa admin, base sa MODULE_ROLES["/settings"]
  // sa src/app/config/permissions.ts — hindi natin i-hardcode ulit dito,
  // pero simpleng string check muna para maiwasang mag-import ng buong
  // permissions module sa TopBar.
  const isAdmin = user?.role === "admin";

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  function goToFullResults(q: string) {
    setIsDropdownOpen(false);
    navigate(`/search?q=${encodeURIComponent(q)}`);
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && trimmedQuery.length > 0) {
      goToFullResults(trimmedQuery);
    } else if (e.key === "Escape") {
      setIsDropdownOpen(false);
    }
  }

  function handleEmployeeClick(id: string) {
    setIsDropdownOpen(false);
    setSearchValue("");
    navigate(`/employees/${id}`);
  }

  function handleReportClick() {
    setIsDropdownOpen(false);
    setSearchValue("");
    navigate("/reports");
  }

  return (
    <header className="h-16 bg-card border-b border-border flex items-center px-6 gap-4 shrink-0 shadow-sm">
      {/* Search */}
      <div ref={searchWrapperRef} className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={searchValue}
          onChange={(e) => {
            setSearchValue(e.target.value);
            setIsDropdownOpen(e.target.value.trim().length > 0);
          }}
          onFocus={() => setIsDropdownOpen(trimmedQuery.length > 0)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search employees, shifts, reports..."
          className="w-full pl-9 pr-4 py-2 text-sm bg-muted/40 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
        />

        {/* Autocomplete dropdown */}
        {isDropdownOpen && trimmedQuery.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50 max-h-96 overflow-y-auto">
            {!hasSuggestions && (
              <div className="px-4 py-3 text-sm text-muted-foreground">
                Walang natagpuang resulta para sa "{trimmedQuery}"
              </div>
            )}

            {suggestedEmployees.length > 0 && (
              <div>
                <div className="px-4 pt-2.5 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Employees
                </div>
                {suggestedEmployees.map((e: any) => {
                  const name = e.full_name ?? `${e.first_name ?? ""} ${e.last_name ?? ""}`.trim();
                  const empInitials = name
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase();
                  return (
                    <button
                      key={e.id}
                      onClick={() => handleEmployeeClick(e.id)}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-muted/60 transition-colors text-left"
                    >
                      <Avatar className="w-7 h-7 shrink-0">
                        <AvatarImage src={e.avatar_url} />
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                          {empInitials || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">{name || "—"}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {e.job_title ?? e.position ?? "—"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {suggestedReports.length > 0 && (
              <div className="border-t border-border">
                <div className="px-4 pt-2.5 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Reports
                </div>
                {suggestedReports.map((r) => (
                  <button
                    key={r.key}
                    onClick={handleReportClick}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-muted/60 transition-colors text-left"
                  >
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <p className="text-sm text-foreground truncate">{r.name}</p>
                  </button>
                ))}
              </div>
            )}

            {hasSuggestions && (
              <button
                onClick={() => goToFullResults(trimmedQuery)}
                className="w-full px-4 py-2.5 text-sm text-primary hover:bg-muted/60 transition-colors text-left border-t border-border font-medium"
              >
                Tingnan lahat ng resulta para sa "{trimmedQuery}"
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {/* Dark / Light mode toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <button
          onClick={() => navigate("/notifications")}
          className="relative w-9 h-9 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
        >
          <Bell className="w-4.5 h-4.5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
          )}
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-border" />

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 hover:bg-muted/60 rounded-lg px-2 py-1.5 transition-colors">
              <Avatar className="w-8 h-8">
                <AvatarImage src={(user as any)?.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium text-foreground leading-tight">{user?.full_name ?? "User"}</p>
                <p className="text-xs text-muted-foreground leading-tight capitalize">
                  {user?.role?.replace("_", " ") ?? "—"}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium">{user?.full_name}</p>
                <p className="text-xs font-normal text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/profile")}>
              <User className="w-4 h-4 mr-2" /> My Profile
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Settings className="w-4 h-4 mr-2" /> Settings
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}