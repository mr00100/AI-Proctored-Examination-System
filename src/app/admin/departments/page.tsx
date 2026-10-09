"use client";
import { useState, useEffect } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

interface Department { id: number; name: string; code: string; description?: string; isActive: boolean; createdAt: string; }

export default function DepartmentsPage() {
  const [depts, setDepts] = useState<Department[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", description: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchDepts(); }, []);
  const fetchDepts = async () => {
    const res = await fetch("/api/departments");
    const data = await res.json();
    setDepts(data.departments || []);
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/departments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setShowCreate(false);
    setForm({ name: "", code: "", description: "" });
    fetchDepts();
    setLoading(false);
  };

  const inputCls = "w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div>
      <TopBar title="Departments" subtitle="Manage academic departments" />
      <div className="p-6 space-y-6">
        <div className="flex justify-end">
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium">
            + Add Department
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {depts.map(d => (
            <Card key={d.id}>
              <CardContent className="py-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-white">{d.name}</h3>
                  <span className="text-xs font-mono bg-indigo-900/30 text-indigo-400 px-2 py-0.5 rounded">{d.code}</span>
                </div>
                {d.description && <p className="text-slate-400 text-sm">{d.description}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
        {showCreate && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
              <h3 className="font-bold text-white mb-4">Add Department</h3>
              <form onSubmit={create} className="space-y-4">
                <div><label className="block text-xs text-slate-400 mb-1">Name *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required className={inputCls} /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Code *</label><input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} required className={inputCls} /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Description</label><textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className={inputCls} /></div>
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
