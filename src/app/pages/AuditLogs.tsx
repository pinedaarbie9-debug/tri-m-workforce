// src/app/pages/AuditLogs.tsx
import { useState, useEffect, useCallback } from "react";
import { ClipboardList, Search, Download, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { api, exportToCsv } from "../../lib/api";
import type { AuditLog, AuditAction } from "../../types";

const actionConfig: Record<string, { label: string; className: string }> = {
  create: { label: "Create", className: "bg-emerald-100 text-emerald-700" },
  update: { label: "Update", className: "bg-blue-100 text-blue-700" },
  delete: { label: "Delete", className: "bg-red-100 text-red-700" },
  login:  { label: "Login",  className: "bg-purple-100 text-purple-700" },
  logout: { label: "Logout", className: "bg-gray-100 text-gray-600" },
  export: { label: "Export", className: "bg-amber-100 text-amber-700" },
  import: { label: "Import", className: "bg-cyan-100 text-cyan-700" },
};

const fallbackActionConfig = { label: "Unknown", className: "bg-gray-100 text-gray-500" };

function getActionConfig(action: unknown) {
  if (typeof action === "string" && actionConfig[action]) return actionConfig[action];
  return fallbackActionConfig;
}

function buildDescription(log: any): string {
  const action = getActionConfig(log?.action).label;
  const moduleName = log?.module ?? "system";
  if (log?.action === "login") return "Successful login";
  if (log?.action === "logout") return "User logged out";
  if (log?.record_id) return `${action}d record in ${moduleName} (#${String(log.record_id).slice(0, 8)})`;
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

  const fetchLogs = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const data = await api.getAuditLogs();
      // Defensive: siguraduhing array talaga ang natanggap, at laging may fallback values ang bawat field
      const safeData = Array.isArray(data) ? data : [];
      setLogs(safeData);
    } catch (err: any) {
      console.error("Failed to fetch audit logs:", err);
      setError(err?.message ?? "Failed to load audit logs");
      setLogs([]); // huwag panatilihin ang stale/corrupt na data
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

  // Kung may binago tayo (search/filter) at lumabas tayo sa valid page range, ibalik sa page 1
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  function handleExport() {
    exportToCsv(
      "audit_logs",
      filtered.map((log) => ({
        user: getUserName(log),
        email: getUserEmail(log),
        action: log?.action ?? "",
        module: log?.module ?? "",
        description: buildDescription(log),
        ip_address: log?.ip_address ?? "",
        timestamp: log?.created_at ? new Date(log.created_at).toLocaleString() : "",
      }))
    );
  }

  return (
    <div className="p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-indigo-700 p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardList className="w-7 h-7" /> Audit Logs</h1>
            <p className="text-white/70 text-sm mt-1">Complete history of system changes and user activity</p>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-2 border border-white/20 text-center">
            <p className="text-white/60 text-xs">Total Entries</p>
            <p className="text-white font-bold text-xl">{logs.length}</p>
          </div>
        </div>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search logs..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40" />
        </div>
        <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none">
          <option value="all">All Actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="login">Login</option>
          <option value="logout">Logout</option>
          <option value="export">Export</option>
          <option value="import">Import</option>
        </select>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 text-sm border border-border rounded-xl bg-card hover:bg-muted/50 transition-colors"><Download className="w-4 h-4" /> Export</button>
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
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">User</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Action</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Module</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">IP Address</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">Walang audit log na nahanap.</td></tr>
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
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                            {nameInitials}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{getUserName(log)}</p>
                            <p className="text-xs text-muted-foreground">{getUserEmail(log)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cfg.className}`}>{cfg.label}</span>
                      </td>
                      <td className="px-5 py-4 text-sm text-foreground font-medium">{log.module ?? "—"}</td>
                      <td className="px-5 py-4 text-sm text-muted-foreground max-w-[280px] truncate">{buildDescription(log)}</td>
                      <td className="px-5 py-4 text-sm text-muted-foreground font-mono">{log.ip_address ?? "—"}</td>
                      <td className="px-5 py-4 text-sm text-muted-foreground font-mono whitespace-nowrap">
                        {log.created_at ? new Date(log.created_at).toLocaleString() : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length === 0 ? 0 : (page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length} logs
            </p>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted disabled:opacity-40 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${p === page ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"}`}>{p}</button>
              ))}
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted disabled:opacity-40 transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}