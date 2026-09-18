import { useState, useEffect, useCallback } from "react";
import {
  Search, Plus, Download, MoreHorizontal, Edit2, Trash2, Eye, Mail,
  ChevronLeft, ChevronRight, UserCheck, UserX, Loader2, RefreshCw, RotateCw,
} from "lucide-react";
import { motion } from "motion/react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { api, exportToCsv } from "../../lib/api";
import type { Employee, EmployeeStatus, EmploymentType } from "../../types";

const statusBadge: Record<EmployeeStatus, { label: string; className: string }> = {
  active:     { label: "Active",    className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  inactive:   { label: "Inactive",  className: "bg-gray-100 text-gray-600 border-gray-200" },
  on_leave:   { label: "On Leave",  className: "bg-amber-100 text-amber-700 border-amber-200" },
  terminated: { label: "Terminated", className: "bg-red-100 text-red-700 border-red-200" },
};

const typeBadge: Record<EmploymentType, string> = {
  full_time: "bg-blue-100 text-blue-700",
  part_time: "bg-purple-100 text-purple-700",
  contract:  "bg-orange-100 text-orange-700",
  intern:    "bg-pink-100 text-pink-700",
};

function getDeptName(emp: Employee): string {
  if (emp.department?.name) return emp.department.name;
  return emp.department_id ?? "—";
}

function generateEmployeeCode(employees: Employee[]): string {
  const year = new Date().getFullYear();
  const prefix = `EMP-${year}-`;
  let maxSeq = 0;
  for (const emp of employees) {
    const code = emp.employee_code ?? "";
    if (code.startsWith(prefix)) {
      const seq = parseInt(code.slice(prefix.length), 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  }
  const next = String(maxSeq + 1).padStart(3, "0");
  return `${prefix}${next}`;
}

const POLL_MS = 20000;

const emptyForm = {
  employee_code: "",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  job_title: "",
  department_id: "",
  employment_type: "full_time" as EmploymentType,
  status: "active" as EmployeeStatus,
  hire_date: "",
};

export function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | "all">("all");
  const [selected, setSelected] = useState<Employee | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 6;

  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchEmployees = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const [data, depts] = await Promise.all([api.getEmployees(), api.getDepartments()]);
      setEmployees(data);
      setDepartments(depts);
    } catch (err: any) {
      console.error("Failed to fetch employees:", err);
      setError(err.message ?? "Failed to load employees");
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
    const interval = setInterval(() => fetchEmployees(false), POLL_MS);
    return () => clearInterval(interval);
  }, [fetchEmployees]);

  const filtered = employees.filter((e) => {
    const matchSearch =
      !search ||
      e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      e.employee_code.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));

  function handleExport() {
    exportToCsv(
      "employees",
      filtered.map((e) => ({
        employee_code: e.employee_code,
        full_name: e.full_name,
        email: e.email,
        department: getDeptName(e),
        job_title: e.job_title,
        employment_type: e.employment_type,
        status: e.status,
        hire_date: e.hire_date,
      }))
    );
  }

  function openAddModal() {
    setForm({ ...emptyForm, employee_code: generateEmployeeCode(employees) });
    setFormError(null);
    setShowAddModal(true);
  }

  function regenerateEmployeeCode() {
    setForm((f) => ({ ...f, employee_code: generateEmployeeCode(employees) }));
  }

  async function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.employee_code.trim() || !form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) {
      setFormError("Employee ID, First Name, Last Name, and Email are required.");
      return;
    }
    setSaving(true);
    try {
      await api.createEmployee({ ...form, department_id: form.department_id || null, hire_date: form.hire_date || null });
      setShowAddModal(false);
      setForm(emptyForm);
      fetchEmployees();
    } catch (err: any) {
      setFormError(err.message ?? "Failed to add employee.");
    } finally {
      setSaving(false);
    }
  }

  function openEditModal(emp: Employee) {
    setEditingEmployee(emp);
    setEditForm({
      employee_code: emp.employee_code ?? "",
      first_name: emp.first_name ?? "",
      last_name: emp.last_name ?? "",
      email: emp.email ?? "",
      phone: emp.phone ?? "",
      job_title: emp.job_title ?? "",
      department_id: emp.department_id ?? "",
      employment_type: emp.employment_type,
      status: emp.status,
      hire_date: emp.hire_date ?? "",
    });
    setEditError(null);
    setShowEditModal(true);
  }

  function closeEditModal() {
    setShowEditModal(false);
    setEditingEmployee(null);
  }

  async function handleEditEmployee(e: React.FormEvent) {
    e.preventDefault();
    setEditError(null);
    if (!editingEmployee) return;
    if (!editForm.first_name.trim() || !editForm.last_name.trim() || !editForm.email.trim()) {
      setEditError("First Name, Last Name, and Email are required.");
      return;
    }
    setEditSaving(true);
    try {
      await api.updateEmployee(editingEmployee.id, {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        email: editForm.email,
        phone: editForm.phone,
        job_title: editForm.job_title,
        department_id: editForm.department_id || null,
        employment_type: editForm.employment_type,
        status: editForm.status,
        hire_date: editForm.hire_date || null,
      });
      closeEditModal();
      fetchEmployees(false);
    } catch (err: any) {
      setEditError(err.message ?? "Failed to update employee.");
    } finally {
      setEditSaving(false);
    }
  }

  function handleSendEmail(emp: Employee) {
    window.location.href = `mailto:${emp.email}`;
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-indigo-700 p-5 sm:p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold">Employee Management</h1>
            <p className="text-white/70 text-xs sm:text-sm mt-1">Manage your workforce — {employees.length} employees total</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 shrink-0">
            <div className="bg-white/10 rounded-xl px-3 py-2 sm:px-4 border border-white/20 text-center">
              <p className="text-white/60 text-[10px] sm:text-xs">Active</p>
              <p className="text-white font-bold text-lg sm:text-xl">{employees.filter((e) => e.status === "active").length}</p>
            </div>
            <div className="bg-white/10 rounded-xl px-3 py-2 sm:px-4 border border-white/20 text-center">
              <p className="text-white/60 text-[10px] sm:text-xs">On Leave</p>
              <p className="text-white font-bold text-lg sm:text-xl">{employees.filter((e) => e.status === "on_leave").length}</p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="flex flex-col gap-3">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search employees..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40" />
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-2">
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as EmployeeStatus | "all"); setPage(1); }}
            className="col-span-2 sm:col-span-1 px-3 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="on_leave">On Leave</option>
            <option value="inactive">Inactive</option>
            <option value="terminated">Terminated</option>
          </select>
          <button onClick={handleExport} className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 text-sm border border-border rounded-xl bg-card hover:bg-muted/50 transition-colors">
            <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export</span>
          </button>
          <button onClick={() => fetchEmployees()} className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 text-sm border border-border rounded-xl bg-card hover:bg-muted/50 transition-colors">
            <RefreshCw className="w-4 h-4" /> <span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={openAddModal} className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> Add Employee
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading employees...
        </div>
      )}
      {!loading && error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">Failed to load employees: {error}</div>
      )}

      {!loading && !error && (
        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 sm:px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Employee</th>
                  <th className="text-left px-4 sm:px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">ID</th>
                  <th className="text-left px-4 sm:px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Department</th>
                  <th className="text-left px-4 sm:px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Job Title</th>
                  <th className="text-left px-4 sm:px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Type</th>
                  <th className="text-left px-4 sm:px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Status</th>
                  <th className="text-left px-4 sm:px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Hire Date</th>
                  <th className="px-4 sm:px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.length === 0 && (
                  <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-muted-foreground">No employees found.</td></tr>
                )}
                {paginated.map((emp) => (
                  <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 sm:px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                          {emp.first_name[0]}{emp.last_name[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground whitespace-nowrap">{emp.full_name}</p>
                          <p className="text-xs text-muted-foreground whitespace-nowrap">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-5 py-4 text-sm font-mono text-muted-foreground whitespace-nowrap">{emp.employee_code}</td>
                    <td className="px-4 sm:px-5 py-4 text-sm text-foreground whitespace-nowrap">{getDeptName(emp)}</td>
                    <td className="px-4 sm:px-5 py-4 text-sm text-muted-foreground whitespace-nowrap">{emp.job_title}</td>
                    <td className="px-4 sm:px-5 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize whitespace-nowrap ${typeBadge[emp.employment_type]}`}>
                        {emp.employment_type.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 sm:px-5 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${statusBadge[emp.status].className}`}>
                        {emp.status === "active" ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                        {statusBadge[emp.status].label}
                      </span>
                    </td>
                    <td className="px-4 sm:px-5 py-4 text-sm text-muted-foreground whitespace-nowrap">{emp.hire_date}</td>
                    <td className="px-4 sm:px-5 py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
                            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelected(emp)}><Eye className="w-3.5 h-3.5 mr-2" /> View Profile</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditModal(emp)}><Edit2 className="w-3.5 h-3.5 mr-2" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSendEmail(emp)}><Mail className="w-3.5 h-3.5 mr-2" /> Send Email</DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={async () => { await api.deleteEmployee(emp.id); fetchEmployees(); }}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length === 0 ? 0 : (page - 1) * perPage + 1}
              –{Math.min(page * perPage, filtered.length)} of {filtered.length} employees
            </p>
            <div className="flex items-center gap-1 flex-wrap justify-center">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((p) => (
                <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${p === page ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"}`}>{p}</button>
              ))}
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      )}

      {/* View Profile modal */}
      <Dialog open={Boolean(selected)} onOpenChange={() => setSelected(null)}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Employee Profile</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shrink-0">
                  {selected.first_name[0]}{selected.last_name[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-lg truncate">{selected.full_name}</p>
                  <p className="text-muted-foreground text-sm truncate">{selected.job_title}</p>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded-full text-xs font-medium border ${statusBadge[selected.status].className}`}>
                    {statusBadge[selected.status].label}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground text-xs">Employee ID</p><p className="font-medium font-mono truncate">{selected.employee_code}</p></div>
                <div><p className="text-muted-foreground text-xs">Department</p><p className="font-medium truncate">{getDeptName(selected)}</p></div>
                <div><p className="text-muted-foreground text-xs">Email</p><p className="font-medium truncate">{selected.email}</p></div>
                <div><p className="text-muted-foreground text-xs">Phone</p><p className="font-medium">{selected.phone ?? "—"}</p></div>
                <div><p className="text-muted-foreground text-xs">Employment Type</p><p className="font-medium capitalize">{selected.employment_type.replace("_", " ")}</p></div>
                <div><p className="text-muted-foreground text-xs">Hire Date</p><p className="font-medium">{selected.hire_date}</p></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Employee modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Employee</DialogTitle></DialogHeader>
          <form onSubmit={handleAddEmployee} className="space-y-4">
            {formError && <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">{formError}</div>}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Employee ID</label>
              <div className="flex items-center gap-2">
                <input value={form.employee_code} readOnly
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-muted/40 text-sm text-muted-foreground font-mono cursor-not-allowed" />
                <button type="button" onClick={regenerateEmployeeCode} title="Regenerate ID"
                  className="shrink-0 w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted/50 transition-colors">
                  <RotateCw className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Auto-generated — no need to type.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">First Name</label>
                <input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Juan" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Last Name</label>
                <input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Dela Cruz" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="juan@company.com" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Phone (optional)</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="09xxxxxxxxx" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Job Title</label>
              <input value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. Software Engineer" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Department (optional)</label>
              <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">None</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Employment Type</label>
                <select value={form.employment_type} onChange={(e) => setForm({ ...form, employment_type: e.target.value as EmploymentType })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="intern">Intern</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as EmployeeStatus })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="active">Active</option>
                  <option value="on_leave">On Leave</option>
                  <option value="inactive">Inactive</option>
                  <option value="terminated">Terminated</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Hire Date (optional)</label>
              <input type="date" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted/50 transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {saving ? "Saving..." : "Add Employee"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Employee modal */}
      <Dialog open={showEditModal} onOpenChange={(open) => { if (!open) closeEditModal(); }}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Employee</DialogTitle></DialogHeader>
          <form onSubmit={handleEditEmployee} className="space-y-4">
            {editError && <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">{editError}</div>}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Employee ID</label>
              <input value={editForm.employee_code} readOnly
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-muted/40 text-sm text-muted-foreground font-mono cursor-not-allowed" />
              <p className="text-xs text-muted-foreground">Employee ID cannot be changed after creation.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">First Name</label>
                <input value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Last Name</label>
                <input value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email</label>
              <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Phone (optional)</label>
              <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="09xxxxxxxxx" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Job Title</label>
              <input value={editForm.job_title} onChange={(e) => setEditForm({ ...editForm, job_title: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Department (optional)</label>
              <select value={editForm.department_id} onChange={(e) => setEditForm({ ...editForm, department_id: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">None</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Employment Type</label>
                <select value={editForm.employment_type} onChange={(e) => setEditForm({ ...editForm, employment_type: e.target.value as EmploymentType })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="intern">Intern</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Status</label>
                <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as EmployeeStatus })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="active">Active</option>
                  <option value="on_leave">On Leave</option>
                  <option value="inactive">Inactive</option>
                  <option value="terminated">Terminated</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Hire Date (optional)</label>
              <input type="date" value={editForm.hire_date} onChange={(e) => setEditForm({ ...editForm, hire_date: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
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
    </div>
  );
}