import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { exams, examAttempts, proctoringEvents, notifications } from "@/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Link from "next/link";
import { formatDateTime, getRiskLevel } from "@/lib/utils";

export default async function TeacherDashboard() {
  const session = await getSession();
  if (!session) return null;

  // Get teacher's exams
  const teacherExams = await db.select().from(exams)
    .where(eq(exams.createdBy, session.userId))
    .orderBy(desc(exams.createdAt))
    .limit(5);

  const examIds = teacherExams.map(e => e.id);

  // Get attempt stats
  let stats = { total: 0, active: 0, completed: 0, terminated: 0, lowRisk: 0, mediumRisk: 0, highRisk: 0, critical: 0 };

  if (examIds.length > 0) {
    const attempts = await db.select({
      status: examAttempts.status,
      riskScore: examAttempts.riskScore,
    }).from(examAttempts)
      .where(sql`${examAttempts.examId} = ANY(ARRAY[${sql.raw(examIds.join(","))}]::int[])`);

    for (const a of attempts) {
      stats.total++;
      if (a.status === "in_progress") stats.active++;
      if (a.status === "completed") stats.completed++;
      if (a.status === "terminated") stats.terminated++;
      const r = a.riskScore || 0;
      if (r <= 25) stats.lowRisk++;
      else if (r <= 50) stats.mediumRisk++;
      else if (r <= 75) stats.highRisk++;
      else stats.critical++;
    }
  }

  // Recent critical events
  const recentEvents = examIds.length > 0
    ? await db.select().from(proctoringEvents)
        .where(sql`${proctoringEvents.examId} = ANY(ARRAY[${sql.raw(examIds.join(","))}]::int[]) AND ${proctoringEvents.severity} IN ('critical', 'high')`)
        .orderBy(desc(proctoringEvents.timestamp))
        .limit(5)
    : [];

  const unreadNotifs = await db.select().from(notifications)
    .where(and(eq(notifications.userId, session.userId), eq(notifications.isRead, false)));

  return (
    <div>
      <TopBar title="Teacher Dashboard" subtitle={`Welcome, ${session.firstName}!`} />
      <div className="p-6 space-y-6">
        {/* Notification Banner */}
        {unreadNotifs.length > 0 && (
          <div className="bg-amber-900/20 border border-amber-700/50 rounded-xl p-4 flex items-center gap-3">
            <span className="text-2xl">🔔</span>
            <div>
              <p className="text-amber-400 font-semibold">{unreadNotifs.length} unread notification{unreadNotifs.length > 1 ? "s" : ""}</p>
              <p className="text-slate-400 text-sm">{unreadNotifs[0]?.title}</p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Exams", value: teacherExams.length, icon: "📋", color: "text-blue-400" },
            { label: "Active Students", value: stats.active, icon: "🔴", color: "text-red-400" },
            { label: "Completed", value: stats.completed, icon: "✅", color: "text-emerald-400" },
            { label: "Terminated", value: stats.terminated, icon: "🚫", color: "text-red-500" },
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

        {/* Risk Distribution */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Low Risk (0-25)", value: stats.lowRisk, color: "text-emerald-400", bg: "bg-emerald-900/20 border-emerald-800/30" },
            { label: "Medium Risk (26-50)", value: stats.mediumRisk, color: "text-yellow-400", bg: "bg-yellow-900/20 border-yellow-800/30" },
            { label: "High Risk (51-75)", value: stats.highRisk, color: "text-orange-400", bg: "bg-orange-900/20 border-orange-800/30" },
            { label: "Critical (76-100)", value: stats.critical, color: "text-red-400", bg: "bg-red-900/20 border-red-800/30" },
          ].map(s => (
            <Card key={s.label} className={s.bg}>
              <CardContent className="py-4 text-center">
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { href: "/teacher/exams/new", label: "Create Exam", icon: "➕", color: "bg-indigo-600 hover:bg-indigo-700" },
            { href: "/teacher/questions", label: "Question Bank", icon: "❓", color: "bg-purple-600 hover:bg-purple-700" },
            { href: "/teacher/monitor", label: "Live Monitor", icon: "🔴", color: "bg-red-600 hover:bg-red-700" },
            { href: "/teacher/incidents", label: "Review Incidents", icon: "⚠️", color: "bg-amber-600 hover:bg-amber-700" },
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
              <Link href="/teacher/exams" className="text-sm text-indigo-400 hover:text-indigo-300">View All →</Link>
            </CardHeader>
            <CardContent className="p-0">
              {teacherExams.length === 0 ? (
                <div className="p-6 text-center text-slate-500">No exams yet. <Link href="/teacher/exams/new" className="text-indigo-400">Create one →</Link></div>
              ) : (
                <div className="divide-y divide-slate-700/50">
                  {teacherExams.map(e => (
                    <div key={e.id} className="flex items-center gap-3 px-6 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white text-sm truncate">{e.title}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(e.startDateTime)}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        e.status === "active" ? "bg-emerald-900/50 text-emerald-400" :
                        e.status === "published" ? "bg-blue-900/50 text-blue-400" :
                        "bg-slate-700/50 text-slate-400"
                      }`}>{e.status}</span>
                      <Link href={`/teacher/exams/${e.id}`} className="text-indigo-400 hover:text-indigo-300 text-sm">→</Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Security Events */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Recent Security Events</h3>
              <Link href="/teacher/incidents" className="text-sm text-indigo-400 hover:text-indigo-300">View All →</Link>
            </CardHeader>
            <CardContent className="p-0">
              {recentEvents.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">No critical events</div>
              ) : (
                <div className="divide-y divide-slate-700/50">
                  {recentEvents.map(e => (
                    <div key={e.id} className="flex items-start gap-3 px-6 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 mt-0.5 ${
                        e.severity === "critical" ? "bg-red-900/50 text-red-400" : "bg-orange-900/50 text-orange-400"
                      }`}>{e.severity}</span>
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
