import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { Trash2, RotateCcw, ArrowLeft, Loader2 } from "lucide-react";
import { api } from "../../lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";

export function RecentlyDeletedEmployeesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: deletedEmployees, isLoading } = useQuery<any[]>({
    queryKey: ["employees-trash"],
    queryFn: api.getDeletedEmployees,
  });

  async function handleRestore(id: string, name: string) {
    setErrorMsg(null);
    setRestoringId(id);
    try {
      await api.restoreEmployee(id);
      await queryClient.invalidateQueries({ queryKey: ["employees-trash"] });
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
    } catch (err: any) {
      setErrorMsg(err?.message ?? `Failed to restore ${name}.`);
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate("/employees")}
          className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-muted transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-medium text-foreground flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-muted-foreground shrink-0" />
            <span className="truncate">Recently Deleted Employees</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            These are the employees that have been deleted. You can still restore them.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{errorMsg}</div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading...
        </div>
      )}

      {!isLoading && (!deletedEmployees || deletedEmployees.length === 0) && (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
          No deleted employees right now.
        </div>
      )}

      {!isLoading && deletedEmployees && deletedEmployees.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="divide-y divide-border">
            {deletedEmployees.map((e: any) => {
              const initials = (e.full_name ?? "?")
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase();
              return (
                <div key={e.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-5 py-3.5">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="w-9 h-9 shrink-0">
                      <AvatarImage src={e.avatar_url} />
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
                        {initials || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{e.full_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {e.job_title ?? "—"} · {e.department?.name ?? "No department"} · {e.employee_code}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Deleted: {e.deleted_at ? new Date(e.deleted_at).toLocaleString() : "—"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRestore(e.id, e.full_name)}
                    disabled={restoringId === e.id}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50 shrink-0 self-start sm:self-center"
                  >
                    {restoringId === e.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5" />
                    )}
                    Restore
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}