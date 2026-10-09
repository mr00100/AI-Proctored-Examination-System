"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const demoAccounts = [
    { label: "Super Admin", email: "admin@examguard.edu", password: "Admin@123", color: "text-red-400", bg: "bg-red-900/20 border-red-800/50" },
    { label: "Teacher", email: "dr.ahmed@examguard.edu", password: "Teacher@123", color: "text-indigo-400", bg: "bg-indigo-900/20 border-indigo-800/50" },
    { label: "Student", email: "ali.raza@student.edu", password: "Student@123", color: "text-emerald-400", bg: "bg-emerald-900/20 border-emerald-800/50" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      const role = data.user.role;
      if (role === "super_admin") router.push("/admin");
      else if (role === "teacher") router.push("/teacher");
      else router.push("/student");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (acc: typeof demoAccounts[0]) => {
    setForm({ email: acc.email, password: acc.password });
    setError("");
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-900 flex-col justify-center items-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
        <div className="relative z-10 text-center max-w-md">
          <div className="text-7xl mb-6">🛡️</div>
          <h1 className="text-4xl font-bold text-white mb-4">AI ExamGuard</h1>
          <p className="text-xl text-indigo-300 mb-8">Intelligent Anti-Cheating Online Examination System</p>
          <div className="grid grid-cols-2 gap-4 text-left">
            {[
              { icon: "🤖", label: "AI Proctoring", desc: "Real-time behavior analysis" },
              { icon: "🔒", label: "Secure Exams", desc: "Tab-switch termination" },
              { icon: "📊", label: "Live Monitoring", desc: "Teacher dashboard" },
              { icon: "📈", label: "Analytics", desc: "Comprehensive reports" },
            ].map(f => (
              <div key={f.label} className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                <div className="text-2xl mb-2">{f.icon}</div>
                <p className="text-white font-semibold text-sm">{f.label}</p>
                <p className="text-slate-400 text-xs">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 bg-amber-900/30 border border-amber-700/50 rounded-xl p-4 text-left">
            <p className="text-amber-400 text-xs font-semibold mb-1">⚠️ FYP DEMO MODE</p>
            <p className="text-slate-400 text-xs">This is a demonstration system. Use the quick login buttons to explore different roles.</p>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3 lg:hidden">🛡️</div>
            <h2 className="text-3xl font-bold text-white">Welcome Back</h2>
            <p className="text-slate-400 mt-2">Sign in to your account</p>
          </div>

          {/* Demo Accounts */}
          <div className="mb-6">
            <p className="text-xs text-slate-500 mb-3 text-center uppercase tracking-wider">Quick Demo Login</p>
            <div className="grid grid-cols-3 gap-2">
              {demoAccounts.map(acc => (
                <button
                  key={acc.label}
                  onClick={() => fillDemo(acc)}
                  className={`p-3 rounded-xl border text-center transition-all hover:scale-105 ${acc.bg}`}
                >
                  <p className={`text-xs font-bold ${acc.color}`}>{acc.label}</p>
                  <p className="text-slate-500 text-xs mt-0.5 truncate">{acc.email.split("@")[0]}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-slate-900 text-slate-500">or sign in manually</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="your@email.edu"
                required
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-900/30 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing In...
                </>
              ) : "Sign In →"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            New student?{" "}
            <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
