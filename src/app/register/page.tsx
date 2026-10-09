"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    studentId: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }
      setSuccess("Registration successful! Redirecting to login...");
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🛡️</div>
          <h1 className="text-3xl font-bold text-white">AI ExamGuard</h1>
          <p className="text-slate-400 mt-2">Create your student account</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-xl text-red-400 text-sm">{error}</div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-emerald-900/30 border border-emerald-700/50 rounded-xl text-emerald-400 text-sm">{success}</div>
        )}

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">First Name</label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))}
                  required
                  className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Last Name</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
                  required
                  className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Student ID (optional)</label>
              <input
                type="text"
                value={form.studentId}
                onChange={e => setForm(p => ({ ...p, studentId: e.target.value }))}
                placeholder="e.g. CS2021001"
                className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                required
                placeholder="your@student.edu"
                className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                required
                placeholder="Min. 8 characters"
                className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm Password</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                required
                placeholder="Re-enter password"
                className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-4">
          Already have an account?{" "}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
