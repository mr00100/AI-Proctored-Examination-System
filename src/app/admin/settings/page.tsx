"use client";
import { useState, useEffect } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

interface Setting { id: number; key: string; value?: string; description?: string; }

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(d => { setSettings(d.settings || []); setLoading(false); });
  }, []);

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
  };

  const save = async () => {
    setSaving(true);
    await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ settings }) });
    setMsg("Settings saved!");
    setTimeout(() => setMsg(""), 3000);
    setSaving(false);
  };

  const inputCls = "w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div>
      <TopBar title="System Settings" subtitle="Configure AI ExamGuard system parameters" />
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {msg && <div className="p-3 bg-emerald-900/30 border border-emerald-700/50 rounded-xl text-emerald-400 text-sm">{msg}</div>}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h3 className="font-semibold text-white">⚙️ System Configuration</h3>
            <button onClick={save} disabled={saving}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-slate-500">Loading settings...</div>
            ) : settings.map(s => (
              <div key={s.key} className="flex items-start gap-4 py-3 border-b border-slate-700/50 last:border-0">
                <div className="flex-1">
                  <p className="text-sm font-medium text-white font-mono">{s.key}</p>
                  {s.description && <p className="text-xs text-slate-500 mt-0.5">{s.description}</p>}
                </div>
                <div className="w-48">
                  {s.value === "true" || s.value === "false" ? (
                    <select value={s.value} onChange={e => updateSetting(s.key, e.target.value)} className={inputCls}>
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                  ) : (
                    <input value={s.value || ""} onChange={e => updateSetting(s.key, e.target.value)} className={inputCls} />
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
