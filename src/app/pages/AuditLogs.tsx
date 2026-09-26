// src/app/pages/AuditLogs.tsx
import { useState, useEffect, useCallback } from "react";
import { ClipboardList, Search, Download, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { PasswordPrompt } from "../components/PasswordPrompt";
import { api, exportToCsv } from "../../lib/api";

const actionConfig: Record<string, { label: string; className: string }> = {
  create: { label: "Create", className: "bg-emerald-100 text-emerald-700" },
  update: { label: "Update", className: "bg-blue-100 text-blue-700" },
  delete: { label: "Delete", className: "bg-red-100 text-red-700" },
  login:  { label: "Login",  className: "bg-purple-100 text-purple-700" },
  logout: { label: "Logout", className: "bg-gray-100 text-gray-600" },
  export: { label: "Export", className: "bg-amber-100 text-amber-700" },
  import: { label: "Import", className: "bg-cyan-100 text-cyan-700" },
  enable_mfa: { label: "Enable MFA", className: "bg-emerald-100 text-emerald-700" },
  disable_mfa: { label: "Disable MFA", className: "bg-red-100 text-red-700" },
  verify_password: { label: "Verify Password", className: "bg-indigo-100 text-indigo-700" },
  verify_password_failed: { label: "Verify Failed", className: "bg-red-100 text-red-700" },
};

const fallbackActionConfig = { label: "Unknown", className: "bg-gray-100 text-gray-500" };

const roleBadgeConfig: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  hr_manager: "bg-blue-100 text-blue-700",
  supervisor: "bg-amber-100 text-amber-700",
  employee: "bg-gray-100 text-gray-600",
};
const roleLabels: Record<string, string> = {
  admin: "Admin",
  hr_manager: "HR Manager",
  supervisor: "Supervisor",
  employee: "Employee",
};

function getActionConfig(action: unknown) {
  if (typeof action === "string" && actionConfig[action]) return actionConfig[action];
  return fallbackActionConfig;
}

function getRecordLabel(log: any): string | null {
  const snapshot = log?.new_values ?? log?.old_values;
  if (!snapshot || typeof snapshot !== "object") return null;
  return (
    snapshot.full_name ??
    snapshot.name ??
    snapshot.employee_code ??
    snapshot.email ??
    snapshot.key ??
    null
  );
}

function buildDescription(log: any): string {
  const action = getActionConfig(log?.action).label;
  const moduleName = log?.module ?? "system";
  if (log?.action === "login") return "Successful login";
  if (log?.action === "logout") return "User logged out";
  if (log?.action === "enable_mfa") return "Enabled two-factor authentication";
  if (log?.action === "disable_mfa") return "Disabled two-factor authentication";
  if (log?.action === "verify_password") return "Verified password for sensitive action";
  if (log?.action === "verify_password_failed") return "Failed password verification";

  const name = getRecordLabel(log);
  const shortId = log?.record_id ? `#${String(log.record_id).slice(0, 8)}` : null;

  if (name && shortId) return `${action}d "${name}" in ${moduleName} (${shortId})`;
  if (name) return `${action}d "${name}" in ${moduleName}`;
  if (shortId) return `${action}d record in ${moduleName} (${shortId})`;
  return `${action}d in ${moduleName}`;
}

const POLL_MS = 20000;

export function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const perPage = 7;

  // 🔒 Password prompt state
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const fetchLogs = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const data = await api.getAuditLogs();
      const safeData = Array.isArray(data) ? data : [];
      setLogs(safeData);
    } catch (err: any) {
      console.error("Failed to fetch audit logs:", err);
      setError(err?.message ?? "Failed to load audit logs");
      setLogs([]);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(() => fetchLogs(false), POLL_MS);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const getUserName = (l: any) => l?.user?.full_name ?? "System";
  const getUserEmail = (l: any) => l?.user?.email ?? "—";
  const getUserRole = (l: any) => l?.user?.role ?? null;

  const filtered = logs.filter((log) => {
    if (!log) return false;
    const desc = buildDescription(log);
    const matchSearch =
      !search ||
      getUserName(log).toLowerCase().includes(search.toLowerCase()) ||
      (log.module ?? "").toLowerCase().includes(search.toLowerCase()) ||
      desc.toLowerCase().includes(search.toLowerCase());
    const matchAction = actionFilter === "all" || log.action === actionFilter;
    return matchSearch && matchAction;
  });

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  function handleExport() {
    // 🔒 Hilingin ang password bago mag-export
    setPendingAction(() => () => {
      exportToCsv(
        "audit_logs",
        filtered.map((log) => ({
          user: getUserName(log),
          email: getUserEmail(log),
          role: getUserRole(log) ?? "",
          action: log?.action ?? "",
          module: log?.module ?? "",
          record_name: getRecordLabel(log) ?? "",
          record_id: log?.record_id ?? "",
          description: buildDescription(log),
          ip_address: log?.ip_address ?? "",
          timestamp: log?.created_at ? new Date(log.created_at).toLocaleString() : "",
        }))
      );
    });
    setShowPasswordPrompt(true);
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-indigo-700 p-5 sm:p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="w-6 h-6 sm:w-7 sm:h-7" /> Audit Logs
            </h1>
            <p className="text-white/70 text-xs sm:text-sm mt-1">Complete history of system changes and user activity</p>
          </div>
          <div className="bg-white/10 rounded-xl px-3 py-2 sm:px-4 border border-white/20 text-center shrink-0 self-start">
            <p className="text-white/60 text-[10px] sm:text-xs">Total Entries</p>
            <p className="text-white font-bold text-lg sm:text-xl">{logs.length}</p>
          </div>
        </div>
      </motion.div>

      <div className="flex flex-col gap-3">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search logs..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40" />
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3">
          <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="col-span-2 sm:col-span-1 px-3 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="all">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="login">Login</option>
            <option value="logout">Logout</option>
            <option value="enable_mfa">Enable MFA</option>
            <option value="disable_mfa">Disable MFA</option>
            <option value="verify_password">Verify Password</option>
            <option value="verify_password_failed">Verify Failed</option>
            <option value="export">Export</option>
            <option value="import">Import</option>
          </select>
          <button onClick={handleExport} className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 text-sm border border-border rounded-xl bg-card hover:bg-muted/50 transition-colors">
            <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading audit logs...
        </div>
      )}
      {!loading && error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">Failed to load audit logs: {error}</div>
      )}

      {!loading && !error && (
        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 sm:px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">User</th>
                  <th className="text-left px-4 sm:px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Action</th>
                  <th className="text-left px-4 sm:px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Module</th>
                  <th className="text-left px-4 sm:px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Description</th>
                  <th className="text-left px-4 sm:px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">IP Address</th>
                  <th className="text-left px-4 sm:px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">No audit logs found.</td></tr>
                )}
                {paginated.map((log, idx) => {
                  if (!log) return null;
                  const cfg = getActionConfig(log.action);
                  const nameInitials = getUserName(log)
                    .split(" ")
                    .filter(Boolean)
                    .map((n: string) => n[0])
                    .join("") || "?";
                  return (
                    <tr key={log.id ?? idx} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 sm:px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
                            {nameInitials}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium text-foreground whitespace-nowrap">{getUserName(log)}</p>
                              {getUserRole(log) && (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${roleBadgeConfig[getUserRole(log)] ?? "bg-gray-100 text-gray-500"}`}>
                                  {roleLabels[getUserRole(log)] ?? getUserRole(log)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{getUserEmail(log)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-5 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize whitespace-nowrap ${cfg.className}`}>{cfg.label}</span>
                      </td>
                      <td className="px-4 sm:px-5 py-4 text-sm text-foreground font-medium whitespace-nowrap">{log.module ?? "—"}</td>
                      <td className="px-4 sm:px-5 py-4 text-sm text-muted-foreground max-w-[280px] truncate" title={buildDescription(log)}>
                        {buildDescription(log)}
                      </td>
                      <td className="px-4 sm:px-5 py-4 text-sm text-muted-foreground font-mono whitespace-nowrap">{log.ip_address ?? "—"}</td>
                      <td className="px-4 sm:px-5 py-4 text-sm text-muted-foreground font-mono whitespace-nowrap">
                        {log.created_at ? new Date(log.created_at).toLocaleString() : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length === 0 ? 0 : (page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length} logs
            </p>
            <div className="flex items-center gap-1 flex-wrap justify-center">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted disabled:opacity-40 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((p) => (
                <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${p === page ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"}`}>{p}</button>
              ))}
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted disabled:opacity-40 transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      )}

      {/* 🔒 Password Prompt */}
      <PasswordPrompt
        open={showPasswordPrompt}
        title="Export Audit Logs"
        description="Enter your password to download the audit logs."
        onClose={() => {
          setShowPasswordPrompt(false);
          setPendingAction(null);
        }}
        onSuccess={async () => {
          if (pendingAction) await pendingAction();
        }}
      />
    </div>
  );
}