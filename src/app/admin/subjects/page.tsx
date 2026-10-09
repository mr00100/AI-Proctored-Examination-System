"use client";
import { useState, useEffect } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent } from "@/components/ui/Card";

interface Subject { id: number; name: string; code: string; departmentName?: string; creditHours?: number; isActive: boolean; }
interface Dept { id: number; name: string; code: string; }

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [depts, setDepts] = useState<Dept[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", departmentId: "", creditHours: "3", description: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/subjects").then(r => r.json()).then(d => setSubjects(d.subjects || []));
    fetch("/api/departments").then(r => r.json()).then(d => setDepts(d.departments || []));
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/subjects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, departmentId: form.departmentId ? parseInt(form.departmentId) : null, creditHours: parseInt(form.creditHours) }) });
    setShowCreate(false);
    setForm({ name: "", code: "", departmentId: "", creditHours: "3", description: "" });
    const res = await fetch("/api/subjects");
    const data = await res.json();
    setSubjects(data.subjects || []);
    setLoading(false);
  };

  const inputCls = "w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div>
      <TopBar title="Subjects" subtitle="Manage course subjects" />
      <div className="p-6 space-y-6">
        <div className="flex justify-end">
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium">+ Add Subject</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map(s => (
            <Card key={s.id}>
              <CardContent className="py-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-white">{s.name}</h3>
                  <span className="text-xs font-mono bg-indigo-900/30 text-indigo-400 px-2 py-0.5 rounded">{s.code}</span>
                </div>
                <div className="flex gap-2 text-xs text-slate-500">
                  {s.departmentName && <span>{s.departmentName}</span>}
                  {s.creditHours && <span>• {s.creditHours} credits</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {showCreate && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
              <h3 className="font-bold text-white mb-4">Add Subject</h3>
              <form onSubmit={create} className="space-y-4">
                <div><label className="block text-xs text-slate-400 mb-1">Subject Name *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required className={inputCls} /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Code *</label><input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} required className={inputCls} /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Department</label>
                  <select value={form.departmentId} onChange={e => setForm(p => ({ ...p, departmentId: e.target.value }))} className={inputCls}>
                    <option value="">None</option>
                    {depts.map(d => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs text-slate-400 mb-1">Credit Hours</label><input type="number" value={form.creditHours} onChange={e => setForm(p => ({ ...p, creditHours: e.target.value }))} min="1" max="6" className={inputCls} /></div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2.5 border border-slate-600 text-slate-400 rounded-xl text-sm">Cancel</button>
                  <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium">Create</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
