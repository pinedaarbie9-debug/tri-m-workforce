import { useState, useEffect, useCallback } from "react";
import { ShieldCheck, Search, Plus, Shield, Edit2, Trash2, MoreHorizontal, UserCheck, Lock, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { api } from "../../lib/api";
import type { UserRole } from "../../types";

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  department: string | null;
  status: "active" | "inactive" | "suspended";
  last_login?: string;
  created_at: string;
  employee_id?: string | null; // FIX: idinagdag para tumugma sa bagong SELECT ng GET /users
}

const roleConfig: Record<UserRole, { label: string; className: string; icon: React.ComponentType<{ className?: string }> }> = {
  admin:      { label: "Admin",      className: "bg-purple-100 text-purple-700 border-purple-200", icon: Shield },
  hr_manager: { label: "HR Manager", className: "bg-blue-100 text-blue-700 border-blue-200",       icon: ShieldCheck },
  supervisor: { label: "Supervisor", className: "bg-amber-100 text-amber-700 border-amber-200",    icon: UserCheck },
  employee:   { label: "Employee",   className: "bg-gray-100 text-gray-600 border-gray-200",       icon: Lock },
};

const statusColors = {
  active:    "bg-emerald-100 text-emerald-700",
  inactive:  "bg-gray-100 text-gray-500",
  suspended: "bg-red-100 text-red-700",
};

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin:      ["All modules", "User management", "Settings", "Audit logs", "Reports", "Delete records"],
  hr_manager: ["Employee management", "Leave management", "Reports", "Analytics", "Notifications"],
  supervisor: ["Attendance", "Shift scheduling", "Timesheets", "Leave approval", "Team view"],
  employee:   ["Own attendance", "Own timesheets", "Own leave requests", "Own profile"],
};

const emptyForm = { full_name: "", email: "", password: "", role: "employee" as UserRole, employee_id: "" };
const emptyEditForm = { full_name: "", email: "", password: "", role: "employee" as UserRole, employee_id: "", status: "active" as UserRow["status"] };

export function UserManagementPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"users" | "roles">("users");

  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ---- Edit User modal state ----
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  // FIX: hiwalay na "extra" option kapag ang naka-link na employee ay deleted na
  // (hindi na kasama sa GET /employees list dahil naka-filter ang deleted_at IS NULL doon)
  const [linkedDeletedEmployee, setLinkedDeletedEmployee] = useState<any | null>(null);
  const [loadingLinkedEmployee, setLoadingLinkedEmployee] = useState(false);

  // ---- Change Role modal state ----
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleTargetUser, setRoleTargetUser] = useState<UserRow | null>(null);
  const [roleValue, setRoleValue] = useState<UserRole>("employee");
  const [roleSaving, setRoleSaving] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [userData, empData] = await Promise.all([api.getUsers(), api.getEmployees()]);
      setUsers(userData);
      setEmployees(empData);
    } catch (err: any) {
      console.error("Failed to fetch users:", err);
      setError(err.message ?? "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filtered = users.filter((u) =>
    !search ||
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  // FIX: options para sa "Link to Employee" dropdown sa loob ng Edit modal —
  // isinasama pa rin ang currently-linked employee kahit na-delete na siya,
  // para hindi mawala/ma-reset ang existing link kapag nag-e-edit ka ng ibang field.
  const editEmployeeOptions = linkedDeletedEmployee
    ? [...employees, linkedDeletedEmployee]
    : employees;

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.full_name.trim() || !form.email.trim() || form.password.length < 6) {
      setFormError("Kailangan ng full name, email, at password na hindi bababa sa 6 characters.");
      return;
    }
    if (form.role === "employee" && !form.employee_id) {
      setFormError("Kailangan mag-link ng employee record para sa role na 'Employee'.");
      return;
    }
    setSaving(true);
    try {
      await api.createUser({ ...form, employee_id: form.employee_id || null });
      setShowAddModal(false);
      setForm(emptyForm);
      fetchUsers();
    } catch (err: any) {
      setFormError(err.message ?? "Nabigo ang pag-add ng user.");
    } finally {
      setSaving(false);
    }
  }

  // ---- buksan ang Edit modal na naka-prefill sa data ng napiling user ----
  async function openEditModal(user: UserRow) {
    setEditingUser(user);
    setEditError(null);
    setLinkedDeletedEmployee(null);
    setEditForm({
      full_name: user.full_name,
      email: user.email,
      password: "", // laging blangko simula — iiwan lang blangko kung ayaw palitan
      role: user.role,
      employee_id: user.employee_id ?? "",
      status: user.status,
    });
    setShowEditModal(true);

    // FIX: kung may naka-link na employee_id pero wala siya sa (active-only) employees list,
    // ibig sabihin soft-deleted na siya — kunin pa rin natin ang record niya para hindi
    // ma-reset ang dropdown sa "Wala" at ma-trigger ang "kailangan mag-link" validation.
    if (user.employee_id && !employees.some((emp) => emp.id === user.employee_id)) {
      setLoadingLinkedEmployee(true);
      try {
        const emp = await api.getEmployee(user.employee_id);
        setLinkedDeletedEmployee({
          ...emp,
          full_name: emp.deleted_at ? `${emp.full_name} (Deleted)` : emp.full_name,
        });
      } catch (err) {
        console.error("Failed to fetch linked employee:", err);
        // Hindi na natin ito ipapakita bilang blocking error — babagsak lang sa dating
        // behavior (blangko ang link) kung talagang hindi na makuha ang record.
      } finally {
        setLoadingLinkedEmployee(false);
      }
    }
  }

  function closeEditModal() {
    setShowEditModal(false);
    setEditingUser(null);
    setLinkedDeletedEmployee(null);
  }

  async function handleEditUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setEditError(null);

    if (!editForm.full_name.trim() || !editForm.email.trim()) {
      setEditError("Kailangan ng full name at email.");
      return;
    }
    if (editForm.password && editForm.password.length < 6) {
      setEditError("Kung magpapalit ng password, dapat hindi bababa sa 6 characters.");
      return;
    }
    if (editForm.role === "employee" && !editForm.employee_id) {
      setEditError("Kailangan mag-link ng employee record para sa role na 'Employee'.");
      return;
    }

    setEditSaving(true);
    try {
      // TANDAAN: password ay isasama LANG kung may binigay na bagong value
      const payload: Record<string, any> = {
        full_name: editForm.full_name,
        email: editForm.email,
        role: editForm.role,
        status: editForm.status,
        employee_id: editForm.employee_id || null,
      };
      if (editForm.password) payload.password = editForm.password;

      await api.updateUser(editingUser.id, payload);
      closeEditModal();
      fetchUsers();
    } catch (err: any) {
      setEditError(err.message ?? "Nabigo ang pag-update ng user.");
    } finally {
      setEditSaving(false);
    }
  }

  // ---- Change Role quick modal ----
  function openRoleModal(user: UserRow) {
    setRoleTargetUser(user);
    setRoleValue(user.role);
    setRoleError(null);
    setShowRoleModal(true);
  }

  async function handleChangeRole(e: React.FormEvent) {
    e.preventDefault();
    if (!roleTargetUser) return;
    setRoleError(null);
    setRoleSaving(true);
    try {
      await api.updateUser(roleTargetUser.id, { role: roleValue });
      setShowRoleModal(false);
      setRoleTargetUser(null);
      fetchUsers();
    } catch (err: any) {
      setRoleError(err.message ?? "Nabigo ang pagpalit ng role.");
    } finally {
      setRoleSaving(false);
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
            <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="w-7 h-7" /> User Management</h1>
            <p className="text-white/70 text-sm mt-1">Manage system users, roles and permissions</p>
          </div>
          <div className="flex gap-3">
            {[
              { label: "Total Users", value: users.length },
              { label: "Active", value: users.filter((u) => u.status === "active").length },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 rounded-xl px-4 py-2 border border-white/20 text-center">
                <p className="text-white/60 text-xs">{s.label}</p>
                <p className="text-white font-bold text-xl">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
          {(["users", "roles"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${tab === t ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t === "users" ? "System Users" : "Roles & Permissions"}</button>
          ))}
        </div>
        <button
          onClick={() => { setForm(emptyForm); setFormError(null); setShowAddModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 text-sm bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading users...
        </div>
      )}
      {!loading && error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">Failed to load users: {error}</div>
      )}

      {!loading && !error && tab === "users" && (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="w-full pl-9 pr-4 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40" />
          </div>
          <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">User</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Department</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Last Login</th>
                    <th className="px-5 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">Walang user na nahanap.</td></tr>
                  )}
                  {filtered.map((user) => {
                    const roleCfg = roleConfig[user.role];
                    const RoleIcon = roleCfg.icon;
                    return (
                      <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                              {user.full_name.split(" ").map((n) => n[0]).join("")}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{user.full_name}</p>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-muted-foreground">{user.department ?? "—"}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${roleCfg.className}`}>
                            <RoleIcon className="w-3 h-3" /> {roleCfg.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[user.status]}`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-muted-foreground font-mono">{user.last_login ?? "—"}</td>
                        <td className="px-5 py-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
                                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditModal(user)}>
                                <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit User
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openRoleModal(user)}>
                                <Lock className="w-3.5 h-3.5 mr-2" /> Change Role
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={async () => { await api.updateUser(user.id, { status: "suspended" }); fetchUsers(); }}
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-2" /> Deactivate
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && tab === "roles" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.entries(roleConfig) as [UserRole, typeof roleConfig.admin][]).map(([role, cfg], i) => {
            const Icon = cfg.icon;
            return (
              <motion.div key={role} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className="bg-card rounded-2xl p-5 shadow-sm border border-border"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${cfg.className}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{cfg.label}</p>
                    <p className="text-xs text-muted-foreground">{users.filter((u) => u.role === role).length} users assigned</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {ROLE_PERMISSIONS[role].map((perm) => (
                    <div key={perm} className="flex items-center gap-2 text-sm text-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      {perm}
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ==== ADD USER MODAL (dating code, walang binago) ==== */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add User</DialogTitle></DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4">
            {formError && (
              <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">{formError}</div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Full Name</label>
              <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Juan Dela Cruz" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="juan@company.com" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Password</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Hindi bababa sa 6 characters" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="employee">Employee</option>
                <option value="supervisor">Supervisor</option>
                <option value="hr_manager">HR Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Link to Employee {form.role === "employee" && <span className="text-destructive">*</span>}
              </label>
              <select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">Wala</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                ))}
              </select>
              {form.role === "employee" && (
                <p className="text-xs text-muted-foreground">Kailangan ito para makapag-access ng Employee Portal ang user.</p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted/50 transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {saving ? "Saving..." : "Add User"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==== EDIT USER MODAL ==== */}
      <Dialog open={showEditModal} onOpenChange={(open) => { if (!open) closeEditModal(); else setShowEditModal(true); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit User — {editingUser?.full_name}</DialogTitle></DialogHeader>
          <form onSubmit={handleEditUser} className="space-y-4">
            {editError && (
              <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">{editError}</div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Full Name</label>
              <input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email (gamit para sa login)</label>
              <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Bagong Password</label>
              <input type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Iwanan blangko kung hindi babaguhin" />
              <p className="text-xs text-muted-foreground">Punan lang ito kung gusto mong palitan ang password. Kung blangko, mananatili ang luma.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Role</label>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="employee">Employee</option>
                <option value="supervisor">Supervisor</option>
                <option value="hr_manager">HR Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Status</label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value as UserRow["status"] })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Link to Employee {editForm.role === "employee" && <span className="text-destructive">*</span>}
              </label>
              <select
                value={editForm.employee_id}
                onChange={(e) => setEditForm({ ...editForm, employee_id: e.target.value })}
                disabled={loadingLinkedEmployee}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
              >
                <option value="">Wala</option>
                {editEmployeeOptions.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                ))}
              </select>
              {loadingLinkedEmployee && (
                <p className="text-xs text-muted-foreground">Kinukuha ang naka-link na employee record...</p>
              )}
              {linkedDeletedEmployee && !loadingLinkedEmployee && (
                <p className="text-xs text-amber-600">
                  Paalala: na-delete na ang naka-link na employee na ito. Piliin ang ibang employee o baguhin ang role kung kinakailangan.
                </p>
              )}
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

      {/* ==== CHANGE ROLE QUICK MODAL ==== */}
      <Dialog open={showRoleModal} onOpenChange={setShowRoleModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Change Role — {roleTargetUser?.full_name}</DialogTitle></DialogHeader>
          <form onSubmit={handleChangeRole} className="space-y-4">
            {roleError && (
              <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">{roleError}</div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Bagong Role</label>
              <select
                value={roleValue}
                onChange={(e) => setRoleValue(e.target.value as UserRole)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="employee">Employee</option>
                <option value="supervisor">Supervisor</option>
                <option value="hr_manager">HR Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowRoleModal(false)} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted/50 transition-colors">Cancel</button>
              <button type="submit" disabled={roleSaving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {roleSaving ? "Saving..." : "Save Role"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}