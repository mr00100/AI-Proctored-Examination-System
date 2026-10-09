"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/utils";

interface User {
  id: number;
  email: string;
  role: string;
  status: string;
  firstName: string;
  lastName: string;
  lastLoginAt: string;
  loginCount: number;
  createdAt: string;
}

export default function UsersPage() {
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(searchParams?.get("role") || "all");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", firstName: "", lastName: "", role: "student" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [filter]);

  const fetchUsers = async () => {
    setLoading(true);
    const url = filter === "all" ? "/api/users" : `/api/users?role=${filter}`;
    const res = await fetch(url);
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowCreate(false);
      setForm({ email: "", password: "", firstName: "", lastName: "", role: "student" });
      fetchUsers();
    }
    setCreating(false);
  };

  const roleColors: Record<string, string> = {
    super_admin: "text-red-400 bg-red-900/30",
    teacher: "text-indigo-400 bg-indigo-900/30",
    student: "text-emerald-400 bg-emerald-900/30",
  };

  const inputCls = "w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm";

  return (
    <div>
      <TopBar title="User Management" subtitle="Manage all system users" />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {["all", "student", "teacher", "super_admin"].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${
                  filter === f ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                }`}>
                {f.replace("_", " ")}
              </button>
            ))}
          </div>
          <button onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium">
            + Add User
          </button>
        </div>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  {["Name", "Email", "Role", "Status", "Last Login", "Logins", "Created"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {loading ? (
                  <tr><td colSpan={7} className="py-12 text-center text-slate-500">Loading...</td></tr>
                ) : users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{u.firstName} {u.lastName}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleColors[u.role] || "bg-slate-700/50 text-slate-400"}`}>
                        {u.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                    <td className="px-4 py-3 text-xs text-slate-400">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{u.loginCount}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{formatDateTime(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Create User Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
              <h3 className="font-bold text-white mb-4">Create New User</h3>
              <form onSubmit={createUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">First Name</label>
                    <input value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} required className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Last Name</label>
                    <input value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} required className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Password</label>
                  <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required minLength={8} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Role</label>
                  <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className={inputCls}>
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
                <div className="flex gap-3 mt-4">
                  <button type="button" onClick={() => setShowCreate(false)}
                    className="flex-1 py-2.5 border border-slate-600 text-slate-400 rounded-xl hover:text-white transition-all text-sm">
                    Cancel
                  </button>
                  <button type="submit" disabled={creating}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all text-sm font-medium">
                    {creating ? "Creating..." : "Create User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
