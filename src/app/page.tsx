import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-xl">🛡️</div>
            <div>
              <h1 className="font-bold text-white">AI ExamGuard</h1>
              <p className="text-xs text-slate-500">Anti-Cheating Examination System</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/login" className="px-4 py-2 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-sm font-medium transition-all hover:border-slate-500">
              Sign In
            </Link>
            <Link href="/register" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-all">
              Register
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="py-24 px-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/20 to-transparent" />
          <div className="relative max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-indigo-900/30 border border-indigo-700/50 rounded-full px-4 py-1.5 text-indigo-400 text-sm font-medium mb-8">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              FYP Demo — BS Computer Science Final Year Project
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              AI-Based Intelligent<br />
              <span className="text-indigo-400">Anti-Cheating</span> Examination System
            </h1>
            <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
              Secure online examination platform with AI-powered proctoring, real-time monitoring, 
              and intelligent incident management.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/login" className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-900/30 text-lg">
                Get Started →
              </Link>
              <Link href="/register" className="px-8 py-4 border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold rounded-xl transition-all text-lg">
                Register as Student
              </Link>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-16 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-white text-center mb-12">System Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: "🔴", title: "Tab-Switch Termination", desc: "Immediate exam termination on browser tab/window switch. Attempt locked permanently.", color: "border-red-800/50 bg-red-900/10" },
                { icon: "🤖", title: "AI Proctoring", desc: "Face detection, multiple face detection, head movement analysis, and suspicious behavior detection.", color: "border-indigo-800/50 bg-indigo-900/10" },
                { icon: "📊", title: "Live Teacher Dashboard", desc: "Real-time monitoring with risk scores, student status cards, and instant alerts.", color: "border-blue-800/50 bg-blue-900/10" },
                { icon: "🎯", title: "AI Question Generator", desc: "Generate MCQs, short answers, coding questions with AI. Teacher reviews before publishing.", color: "border-purple-800/50 bg-purple-900/10" },
                { icon: "🔒", title: "Anti-Cheating Engine", desc: "Copy/paste blocking, full-screen enforcement, keyboard shortcut detection.", color: "border-amber-800/50 bg-amber-900/10" },
                { icon: "📈", title: "Analytics & Reports", desc: "Comprehensive exam analytics, risk scoring, event timelines, and PDF report generation.", color: "border-emerald-800/50 bg-emerald-900/10" },
              ].map(f => (
                <div key={f.title} className={`p-6 rounded-2xl border ${f.color}`}>
                  <div className="text-4xl mb-4">{f.icon}</div>
                  <h3 className="text-white font-semibold text-lg mb-2">{f.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Demo Accounts */}
        <section className="py-16 px-6 border-t border-slate-800">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-white text-center mb-8">Demo Accounts</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { role: "Super Admin", email: "admin@examguard.edu", password: "Admin@123", icon: "👑", color: "border-red-800/50 bg-red-900/10 text-red-400", href: "/admin" },
                { role: "Teacher", email: "dr.ahmed@examguard.edu", password: "Teacher@123", icon: "👨‍🏫", color: "border-indigo-800/50 bg-indigo-900/10 text-indigo-400", href: "/teacher" },
                { role: "Student", email: "ali.raza@student.edu", password: "Student@123", icon: "🎓", color: "border-emerald-800/50 bg-emerald-900/10 text-emerald-400", href: "/student" },
              ].map(acc => (
                <div key={acc.role} className={`p-6 rounded-2xl border ${acc.color}`}>
                  <div className="text-3xl mb-3">{acc.icon}</div>
                  <h3 className={`font-bold text-lg mb-3 ${acc.color.split(" ").find(c => c.startsWith("text-"))}`}>{acc.role}</h3>
                  <div className="space-y-1 text-sm text-slate-400 mb-4">
                    <p><span className="text-slate-500">Email:</span> {acc.email}</p>
                    <p><span className="text-slate-500">Password:</span> {acc.password}</p>
                  </div>
                  <Link href="/login" className="block text-center py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-all">
                    Login as {acc.role}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800 py-6 px-6 text-center text-slate-500 text-sm">
        <p>AI ExamGuard — BS Computer Science Final Year Project | Built with Next.js, PostgreSQL & AI</p>
      </footer>
    </div>
  );
}
