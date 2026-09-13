import { useState, useEffect, useCallback } from "react";
import { Building2, Search, Plus, MoreHorizontal, Edit2, Trash2, Loader2, Users, X, UserMinus } from "lucide-react";
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

interface Employee {
  id: string;
  full_name: string;
  job_title: string;
  department_id: string | null;
  status: string;
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

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // BAGO — Manage Employees modal state
  const [showEmployeesModal, setShowEmployeesModal] = useState(false);
  const [employeesDept, setEmployeesDept] = useState<Department | null>(null);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeesError, setEmployeesError] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedToAssign, setSelectedToAssign] = useState("");

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

  function openEditModal(dept: Department) {
    setEditingDept(dept);
    setEditError(null);
    setEditForm({
      name: dept.name,
      code: dept.code,
      manager: dept.manager ?? "",
      color: dept.color,
    });
    setShowEditModal(true);
  }

  function closeEditModal() {
    setShowEditModal(false);
    setEditingDept(null);
  }

  async function handleEditDepartment(e: React.FormEvent) {
    e.preventDefault();
    if (!editingDept) return;
    setEditError(null);
    if (!editForm.name.trim() || !editForm.code.trim()) {
      setEditError("Kailangan ng name at code.");
      return;
    }
    setEditSaving(true);
    try {
      await api.updateDepartment(editingDept.id, editForm);
      closeEditModal();
      fetchDepartments();
    } catch (err: any) {
      setEditError(err.message ?? "Nabigo ang pag-update ng department.");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDeleteDepartment(dept: Department) {
    const confirmed = window.confirm(`Sigurado ka bang gusto mong burahin ang department na "${dept.name}"?`);
    if (!confirmed) return;

    setDeleteError(null);
    setDeletingId(dept.id);
    try {
      await api.deleteDepartment(dept.id);
      fetchDepartments();
    } catch (err: any) {
      setDeleteError(err.message ?? "Nabigo ang pag-delete ng department.");
    } finally {
      setDeletingId(null);
    }
  }

  // ==== BAGO — Manage Employees (assign / remove) ====

  async function openEmployeesModal(dept: Department) {
    setEmployeesDept(dept);
    setEmployeesError(null);
    setSelectedToAssign("");
    setShowEmployeesModal(true);
    setEmployeesLoading(true);
    try {
      const data = await api.getEmployees();
      setAllEmployees(data);
    } catch (err: any) {
      setEmployeesError(err.message ?? "Nabigo ang pagkuha ng listahan ng empleyado.");
    } finally {
      setEmployeesLoading(false);
    }
  }

  function closeEmployeesModal() {
    setShowEmployeesModal(false);
    setEmployeesDept(null);
    setAllEmployees([]);
  }

  const assignedEmployees = employeesDept
    ? allEmployees.filter((e) => e.department_id === employeesDept.id)
    : [];

  const unassignedOrOtherDeptEmployees = employeesDept
    ? allEmployees.filter((e) => e.department_id !== employeesDept.id && e.status === "active")
    : [];

  async function handleAssignEmployee() {
    if (!employeesDept || !selectedToAssign) return;
    setAssigningId(selectedToAssign);
    setEmployeesError(null);
    try {
      await api.updateEmployee(selectedToAssign, { department_id: employeesDept.id });
      const data = await api.getEmployees();
      setAllEmployees(data);
      setSelectedToAssign("");
      fetchDepartments(); // para mag-update din agad ang head_count sa cards
    } catch (err: any) {
      setEmployeesError(err.message ?? "Nabigo ang pag-assign ng empleyado.");
    } finally {
      setAssigningId(null);
    }
  }

  async function handleRemoveEmployee(emp: Employee) {
    setAssigningId(emp.id);
    setEmployeesError(null);
    try {
      await api.updateEmployee(emp.id, { department_id: null });
      const data = await api.getEmployees();
      setAllEmployees(data);
      fetchDepartments();
    } catch (err: any) {
      setEmployeesError(err.message ?? "Nabigo ang pag-alis ng empleyado sa department.");
    } finally {
      setAssigningId(null);
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
      {!loading && deleteError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{deleteError}</div>
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
                    <button
                      disabled={deletingId === dept.id}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      {deletingId === dept.id ? (
                        <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                      ) : (
                        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {/* BAGO — Manage Employees option */}
                    <DropdownMenuItem onClick={() => openEmployeesModal(dept)}>
                      <Users className="w-3.5 h-3.5 mr-2" /> Manage Employees
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openEditModal(dept)}>
                      <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => handleDeleteDepartment(dept)}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* BAGO — clickable Employees count para diretso sa Manage Employees modal */}
              <div className="mt-4">
                <button
                  onClick={() => openEmployeesModal(dept)}
                  className="w-full bg-muted/40 rounded-xl p-3 text-center hover:bg-muted/70 transition-colors"
                >
                  <p className="text-xs text-muted-foreground">Employees</p>
                  <p className="font-bold text-foreground text-lg mt-0.5">{dept.head_count}</p>
                </button>
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

      {/* ==== ADD DEPARTMENT MODAL ==== */}
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

      {/* ==== EDIT DEPARTMENT MODAL ==== */}
      <Dialog open={showEditModal} onOpenChange={(open) => { if (!open) closeEditModal(); else setShowEditModal(true); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Department — {editingDept?.name}</DialogTitle></DialogHeader>
          <form onSubmit={handleEditDepartment} className="space-y-4">
            {editError && (
              <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">{editError}</div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Department Name</label>
              <input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Code</label>
              <input
                value={editForm.code}
                onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Manager (optional)</label>
              <input
                value={editForm.manager}
                onChange={(e) => setEditForm({ ...editForm, manager: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Color</label>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditForm({ ...editForm, color: c })}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${editForm.color === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={closeEditModal} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted/50 transition-colors">Cancel</button>
              <button type="submit" disabled={editSaving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {editSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==== BAGO: MANAGE EMPLOYEES MODAL (assign / remove) ==== */}
      <Dialog open={showEmployeesModal} onOpenChange={(open) => { if (!open) closeEmployeesModal(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Manage Employees — {employeesDept?.name}</DialogTitle></DialogHeader>

          {employeesError && (
            <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">{employeesError}</div>
          )}

          {employeesLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading employees...
            </div>
          ) : (
            <div className="space-y-4">
              {/* Assign new employee */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Assign an employee to this department</label>
                <div className="flex gap-2">
                  <select
                    value={selectedToAssign}
                    onChange={(e) => setSelectedToAssign(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Piliin ang empleyado...</option>
                    {unassignedOrOtherDeptEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} — {emp.job_title}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssignEmployee}
                    disabled={!selectedToAssign || assigningId === selectedToAssign}
                    className="px-4 py-2.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    {assigningId === selectedToAssign ? "Assigning..." : "Assign"}
                  </button>
                </div>
                {unassignedOrOtherDeptEmployees.length === 0 && (
                  <p className="text-xs text-muted-foreground">Walang ibang empleyado na pwedeng i-assign.</p>
                )}
              </div>

              {/* Currently assigned employees */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Kasalukuyang naka-assign ({assignedEmployees.length})</label>
                <div className="border border-border rounded-lg divide-y divide-border max-h-64 overflow-y-auto">
                  {assignedEmployees.length === 0 && (
                    <p className="p-4 text-sm text-muted-foreground text-center">Walang empleyadong naka-assign sa department na ito.</p>
                  )}
                  {assignedEmployees.map((emp) => (
                    <div key={emp.id} className="flex items-center justify-between px-3.5 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-foreground">{emp.full_name}</p>
                        <p className="text-xs text-muted-foreground">{emp.job_title}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveEmployee(emp)}
                        disabled={assigningId === emp.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 disabled:opacity-50 transition-colors"
                      >
                        {assigningId === emp.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserMinus className="w-3 h-3" />}
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button onClick={closeEmployeesModal} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  Close
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}