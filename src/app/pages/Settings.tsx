import { useState, useEffect, useCallback } from "react";
import { Settings, Bell, Shield, Clock, CalendarDays, Building2, Save, ChevronRight, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { api } from "../../lib/api";

interface SettingSection {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const SECTIONS: SettingSection[] = [
  { id: "general",      label: "General",          icon: Building2,  color: "text-purple-600 bg-purple-50" },
  { id: "attendance",   label: "Attendance",        icon: Clock,      color: "text-blue-600 bg-blue-50" },
  { id: "leave",        label: "Leave Policies",    icon: CalendarDays, color: "text-emerald-600 bg-emerald-50" },
  { id: "notification", label: "Notifications",     icon: Bell,       color: "text-amber-600 bg-amber-50" },
  { id: "security",     label: "Security",          icon: Shield,     color: "text-red-600 bg-red-50" },
];

interface SettingItem {
  id: string;
  key: string;
  value: string | number | boolean;
  category: string;
  label: string;
  description: string | null;
}

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState("general");
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [values, setValues] = useState<Record<string, string | number | boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSettings();
      setSettings(data);
      const map: Record<string, string | number | boolean> = {};
      data.forEach((s: SettingItem) => { map[s.key] = s.value; });
      setValues(map);
    } catch (err: any) {
      console.error("Failed to fetch settings:", err);
      setError(err.message ?? "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  function setValue(key: string, value: string | number | boolean) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    const itemsInSection = settings.filter((s) => s.category === activeSection);
    const updates = itemsInSection.map((s) => ({ key: s.key, value: values[s.key] ?? s.value }));
    setSaving(true);
    try {
      await api.updateSettings(updates);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      alert(err.message ?? "Nabigo ang pag-save ng settings.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    const map: Record<string, string | number | boolean> = {};
    settings.forEach((s) => { map[s.key] = s.value; });
    setValues(map);
  }

  function get(key: string) {
    return values[key];
  }

  return (
    <div className="p-6 space-y-6">
      {/* Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-indigo-700 p-6 text-white shadow-lg"
      >
        <h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="w-7 h-7" /> System Settings</h1>
        <p className="text-white/70 text-sm mt-1">Configure your Workforce Management System preferences</p>
      </motion.div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading settings...
        </div>
      )}
      {!loading && error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">Failed to load settings: {error}</div>
      )}

      {!loading && !error && (
        <div className="flex gap-6">
          {/* Sidebar Nav */}
          <div className="w-56 shrink-0 space-y-1">
            {SECTIONS.map((sec) => (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${activeSection === sec.id ? "bg-primary text-white" : "text-foreground hover:bg-muted"}`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${activeSection === sec.id ? "bg-white/20" : sec.color}`}>
                    <sec.icon className={`w-3.5 h-3.5 ${activeSection === sec.id ? "text-white" : ""}`} />
                  </div>
                  {sec.label}
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              </button>
            ))}
          </div>

          {/* Settings Panel */}
          <div className="flex-1 bg-card rounded-2xl shadow-sm border border-border p-6 space-y-6">
            {SECTIONS.find((s) => s.id === activeSection) && (
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  {SECTIONS.find((s) => s.id === activeSection)!.label}
                </h2>
                {settings
                  .filter((s) => s.category === activeSection)
                  .map((s) => {
                    const currentValue = get(s.key);
                    const isBoolean = typeof currentValue === "boolean";
                    return (
                      <SettingRow key={s.key} label={s.label} description={s.description ?? undefined}>
                        {isBoolean ? (
                          <Toggle checked={currentValue as boolean} onChange={(v) => setValue(s.key, v)} />
                        ) : s.key === "timezone" ? (
                          <SelectInput
                            options={["UTC-5 (EST)", "UTC-8 (PST)", "UTC+0 (GMT)", "UTC+5:30 (IST)"]}
                            value={String(currentValue)}
                            onChange={(v) => setValue(s.key, v)}
                          />
                        ) : s.key === "date_format" ? (
                          <SelectInput
                            options={["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"]}
                            value={String(currentValue)}
                            onChange={(v) => setValue(s.key, v)}
                          />
                        ) : s.key === "work_week_start" ? (
                          <SelectInput
                            options={["Monday", "Sunday", "Saturday"]}
                            value={String(currentValue)}
                            onChange={(v) => setValue(s.key, v)}
                          />
                        ) : typeof currentValue === "number" ? (
                          <TextInput
                            value={String(currentValue)}
                            onChange={(v) => setValue(s.key, Number(v) || 0)}
                          />
                        ) : (
                          <TextInput value={String(currentValue ?? "")} onChange={(v) => setValue(s.key, v)} />
                        )}
                      </SettingRow>
                    );
                  })}
                {settings.filter((s) => s.category === activeSection).length === 0 && (
                  <p className="text-sm text-muted-foreground py-6 text-center">Walang settings sa section na ito.</p>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-border flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-60 transition-colors text-sm font-medium"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
              </button>
              <button
                onClick={handleCancel}
                className="px-5 py-2.5 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-border last:border-0">
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted-foreground/30"}`}
      style={{ height: 22 }}
    >
      <div
        className={`absolute top-0.5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`}
        style={{ width: 18, height: 18 }}
      />
    </button>
  );
}

function TextInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-52 px-3 py-1.5 text-sm border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/20"
    />
  );
}

function SelectInput({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-44 px-3 py-1.5 text-sm border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/20"
    >
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}