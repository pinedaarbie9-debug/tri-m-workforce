import { useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon, User, FileText } from "lucide-react";
import { api } from "../../lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";

// Listahan ng mga static reports na meron sa /reports page — ginagamit
// lang natin ito para ma-filter sa search, hindi ito galing sa backend.
const REPORT_ITEMS = [
  { key: "attendance-summary", name: "Attendance Summary", path: "/reports" },
  { key: "headcount", name: "Headcount Report", path: "/reports" },
  { key: "leave-summary", name: "Leave Summary", path: "/reports" },
  { key: "overtime", name: "Overtime Report", path: "/reports" },
  { key: "timesheet", name: "Timesheet Report", path: "/reports" },
  { key: "audit-export", name: "Audit Export", path: "/reports" },
];

export function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = (searchParams.get("q") ?? "").trim();
  const lowerQuery = query.toLowerCase();

  const { data: employees, isLoading: employeesLoading } = useQuery<any[]>({
    queryKey: ["employees"],
    queryFn: api.getEmployees,
    enabled: query.length > 0,
  });

  const matchedEmployees = useMemo(() => {
    if (!employees || !lowerQuery) return [];
    return employees.filter((e: any) => {
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
    });
  }, [employees, lowerQuery]);

  const matchedReports = useMemo(() => {
    if (!lowerQuery) return [];
    return REPORT_ITEMS.filter((r) => r.name.toLowerCase().includes(lowerQuery));
  }, [lowerQuery]);

  const hasResults = matchedEmployees.length > 0 || matchedReports.length > 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-medium text-foreground flex items-center gap-2">
          <SearchIcon className="w-5 h-5 text-muted-foreground" />
          Search results for "{query}"
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {employeesLoading
            ? "Naghahanap..."
            : `${matchedEmployees.length + matchedReports.length} resulta natagpuan`}
        </p>
      </div>

      {!query && (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
          I-type ang isang keyword sa search bar sa taas.
        </div>
      )}

      {query && !employeesLoading && !hasResults && (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
          Walang natagpuang resulta para sa "{query}".
        </div>
      )}

      {/* Employees section */}
      {matchedEmployees.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="text-sm font-medium text-foreground">Employees ({matchedEmployees.length})</h2>
          </div>
          <div className="divide-y divide-border">
            {matchedEmployees.map((e: any) => {
              const name = e.full_name ?? `${e.first_name ?? ""} ${e.last_name ?? ""}`.trim();
              const initials = name
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase();
              return (
                <button
                  key={e.id}
                  onClick={() => navigate(`/employees/${e.id}`)}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={e.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {initials || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{name || "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {e.job_title ?? e.position ?? "—"} · {e.department?.name ?? e.department_name ?? "No department"}
                    </p>
                  </div>
                  <Badge variant="secondary" className="capitalize shrink-0">
                    {e.status ?? "active"}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Reports section */}
      {matchedReports.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="text-sm font-medium text-foreground">Reports ({matchedReports.length})</h2>
          </div>
          <div className="divide-y divide-border">
            {matchedReports.map((r) => (
              <button
                key={r.key}
                onClick={() => navigate(r.path)}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-accent-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">{r.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}