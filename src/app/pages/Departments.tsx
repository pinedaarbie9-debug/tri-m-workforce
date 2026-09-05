import { useState, useEffect, useCallback } from "react";
import { Building2, Search, Plus, MoreHorizontal, Edit2, Trash2, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { api } from "../../lib/api";

interface Department {
  id: string;
  name: string;
  code: string;
  manager: string | null;
  head_count: number;
  color: string;
}

const COLOR_OPTIONS = ["#7c3aed", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6"];

const emptyForm = { name: "", code: "", manager: "", color: COLOR_OPTIONS[0] };

export function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDepartments();
      setDepartments(data);
    } catch (err: any) {
      console.error("Failed to fetch departments:", err);
      setError(err.message ?? "Failed to load departments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const filtered = departments.filter(
    (d) => !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.code.toLowerCase().includes(search.toLowerCase())
  );

  async function handleAddDepartment(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim() || !form.code.trim()) {
      setFormError("Kailangan ng name at code.");
      return;
    }
    setSaving(true);
    try {
      await api.createDepartment(form);
      setShowAddModal(false);
      setForm(emptyForm);
      fetchDepartments();
    } catch (err: any) {
      setFormError(err.message ?? "Nabigo ang pag-add ng department.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-indigo-700 p-6 text-white shadow-lg"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="w-7 h-7" /> Departments</h1>
            <p className="text-white/70 text-sm mt-1">Manage organizational structure and departments</p>
          </div>
          <div className="flex gap-3">
            {[
              { label: "Departments", value: departments.length },
              { label: "Total Staff", value: departments.reduce((a, d) => a + Number(d.head_count), 0) },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 rounded-xl px-4 py-2 border border-white/20 text-center">
                <p className="text-white/60 text-xs">{s.label}</p>
                <p className="text-white font-bold text-xl">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search departments..." className="w-full pl-9 pr-4 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40" />
        </div>
        <button
          onClick={() => { setForm(emptyForm); setFormError(null); setShowAddModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 text-sm bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Department
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading departments...
        </div>
      )}
      {!loading && error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">Failed to load departments: {error}</div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length === 0 && (
            <p className="col-span-full text-center text-sm text-muted-foreground py-10">Walang department na nahanap.</p>
          )}
          {filtered.map((dept, i) => (
            <motion.div
              key={dept.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl p-5 shadow-sm border border-border hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${dept.color}15` }}>
                    <Building2 className="w-5 h-5" style={{ color: dept.color }} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{dept.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{dept.code}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
                      <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem><Edit2 className="w-3.5 h-3.5 mr-2" /> Edit</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive focus:text-destructive"><Trash2 className="w-3.5 h-3.5 mr-2" /> Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-4">
                <div className="bg-muted/40 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground">Employees</p>
                  <p className="font-bold text-foreground text-lg mt-0.5">{dept.head_count}</p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white" style={{ backgroundColor: dept.color }}>
                    {dept.manager ? dept.manager.split(" ").map((n) => n[0]).join("") : "—"}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Manager</p>
                    <p className="text-sm font-medium text-foreground">{dept.manager ?? "Walang naka-assign"}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Department</DialogTitle></DialogHeader>
          <form onSubmit={handleAddDepartment} className="space-y-4">
            {formError && (
              <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">{formError}</div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Department Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="e.g. Marketing"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Code</label>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="e.g. MKT"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Manager (optional)</label>
              <input
                value={form.manager}
                onChange={(e) => setForm({ ...form, manager: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="e.g. Juan Dela Cruz"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Color</label>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted/50 transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {saving ? "Saving..." : "Add Department"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}