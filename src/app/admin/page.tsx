import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { users, exams, examAttempts, proctoringEvents, students, teachers, departments } from "@/db/schema";
import { count, eq, desc, sql } from "drizzle-orm";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";

export default async function AdminDashboard() {
  const session = await getSession();
  if (!session) return null;

  const [totalUsers] = await db.select({ count: count() }).from(users);
  const [totalStudents] = await db.select({ count: count() }).from(students);
  const [totalTeachers] = await db.select({ count: count() }).from(teachers);
  const [totalExams] = await db.select({ count: count() }).from(exams);
  const [activeExams] = await db.select({ count: count() }).from(exams).where(eq(exams.status, "active"));
  const [totalAttempts] = await db.select({ count: count() }).from(examAttempts);
  const [terminatedAttempts] = await db.select({ count: count() }).from(examAttempts).where(eq(examAttempts.status, "terminated"));
  const [totalDepts] = await db.select({ count: count() }).from(departments);

  const recentExams = await db.select({
    id: exams.id,
    title: exams.title,
    status: exams.status,
    createdAt: exams.createdAt,
  }).from(exams).orderBy(desc(exams.createdAt)).limit(5);

  const criticalEvents = await db.select().from(proctoringEvents)
    .where(eq(proctoringEvents.severity, "critical"))
    .orderBy(desc(proctoringEvents.timestamp))
    .limit(5);

  return (
    <div>
      <TopBar title="System Administration" subtitle="AI ExamGuard Control Center" />
      <div className="p-6 space-y-6">
        {/* System Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Users", value: totalUsers.count, icon: "👥", color: "text-blue-400", href: "/admin/users" },
            { label: "Students", value: totalStudents.count, icon: "🎓", color: "text-emerald-400", href: "/admin/users?role=student" },
            { label: "Teachers", value: totalTeachers.count, icon: "👨‍🏫", color: "text-indigo-400", href: "/admin/users?role=teacher" },
            { label: "Departments", value: totalDepts.count, icon: "🏛️", color: "text-purple-400", href: "/admin/departments" },
          ].map(s => (
            <Link key={s.label} href={s.href}>
              <Card className="hover:border-indigo-600/50 transition-all cursor-pointer">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="text-3xl">{s.icon}</div>
                  <div>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-slate-500">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Exams", value: totalExams.count, icon: "📋", color: "text-blue-400" },
            { label: "Active Exams", value: activeExams.count, icon: "🔴", color: "text-red-400" },
            { label: "Total Attempts", value: totalAttempts.count, icon: "📝", color: "text-amber-400" },
            { label: "Terminated", value: terminatedAttempts.count, icon: "🚫", color: "text-red-500" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="text-3xl">{s.icon}</div>
                <div>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Admin Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { href: "/admin/users", label: "Manage Users", icon: "👥", color: "bg-blue-600 hover:bg-blue-700" },
            { href: "/admin/departments", label: "Departments", icon: "🏛️", color: "bg-purple-600 hover:bg-purple-700" },
            { href: "/admin/subjects", label: "Subjects", icon: "📚", color: "bg-indigo-600 hover:bg-indigo-700" },
            { href: "/admin/audit-logs", label: "Audit Logs", icon: "📜", color: "bg-slate-600 hover:bg-slate-700" },
          ].map(a => (
            <Link key={a.href} href={a.href}>
              <div className={`${a.color} rounded-xl p-4 flex items-center gap-3 transition-all`}>
                <span className="text-2xl">{a.icon}</span>
                <span className="text-white font-semibold text-sm">{a.label}</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent Exams */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Recent Exams</h3>
              <Link href="/admin/exams" className="text-sm text-indigo-400 hover:text-indigo-300">View All</Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-700/50">
                {recentExams.map(e => (
                  <div key={e.id} className="flex items-center gap-3 px-6 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{e.title}</p>
                      <p className="text-xs text-slate-500">{formatDateTime(e.createdAt)}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      e.status === "active" ? "bg-emerald-900/50 text-emerald-400" :
                      e.status === "published" ? "bg-blue-900/50 text-blue-400" :
                      "bg-slate-700/50 text-slate-400"
                    }`}>{e.status}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Critical Events */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-white">Critical Security Events</h3>
            </CardHeader>
            <CardContent className="p-0">
              {criticalEvents.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">No critical events</div>
              ) : (
                <div className="divide-y divide-slate-700/50">
                  {criticalEvents.map(e => (
                    <div key={e.id} className="flex items-start gap-3 px-6 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-red-900/50 text-red-400 flex-shrink-0 mt-0.5">
                        CRITICAL
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium">{e.eventType.replace(/_/g, " ")}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(e.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
