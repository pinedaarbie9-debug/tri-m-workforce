import { useState, useEffect, useCallback } from "react";
import { UserCircle, Loader2, Save, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { api } from "../../../lib/api";

export function MyProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({ phone: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMyProfile();
      setProfile(data);
      setForm({ phone: data.phone ?? "", email: data.email ?? "" });
    } catch (err: any) {
      console.error("Failed to fetch profile:", err);
      setError(err.message ?? "Failed to load your profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSaved(false);
    setSaving(true);
    try {
      await api.updateMyProfile(form);
      setSaved(true);
      fetchProfile();
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setSaveError(err.message ?? "Nabigo ang pag-save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-indigo-700 p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold flex items-center gap-2"><UserCircle className="w-7 h-7" /> My Profile</h1>
        <p className="text-white/70 text-sm mt-1">Tingnan at i-update ang ilang detalye ng iyong profile</p>
      </motion.div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading...
        </div>
      )}
      {!loading && error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && profile && (
        <>
          <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                {profile.first_name?.[0]}{profile.last_name?.[0]}
              </div>
              <div>
                <p className="font-semibold text-lg text-foreground">{profile.full_name}</p>
                <p className="text-muted-foreground text-sm">{profile.job_title ?? "—"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-muted-foreground text-xs">Employee ID</p><p className="font-medium font-mono">{profile.employee_code}</p></div>
              <div><p className="text-muted-foreground text-xs">Department</p><p className="font-medium">{profile.department?.name ?? "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">Employment Type</p><p className="font-medium capitalize">{profile.employment_type?.replace("_", " ")}</p></div>
              <div><p className="text-muted-foreground text-xs">Hire Date</p><p className="font-medium">{profile.hire_date?.slice(0, 10) ?? "—"}</p></div>
            </div>
          </div>

          <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
            <h2 className="font-semibold text-foreground mb-4">Contact Information</h2>
            <form onSubmit={handleSave} className="space-y-4">
              {saveError && <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">{saveError}</div>}
              {saved && (
                <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" /> Na-save na ang mga pagbabago.
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="09xxxxxxxxx" />
              </div>
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors">
                <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}