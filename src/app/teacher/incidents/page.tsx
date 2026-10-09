import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { proctoringEvents, examAttempts, exams, students, users } from "@/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { formatDateTime, getSeverityColor } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function IncidentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Get teacher's exam IDs
  const teacherExams = await db.select({ id: exams.id }).from(exams)
    .where(eq(exams.createdBy, session.userId));
  const examIds = teacherExams.map(e => e.id);

  const events = examIds.length > 0
    ? await db
        .select({
          id: proctoringEvents.id,
          eventType: proctoringEvents.eventType,
          severity: proctoringEvents.severity,
          confidenceScore: proctoringEvents.confidenceScore,
          description: proctoringEvents.description,
          riskPoints: proctoringEvents.riskPoints,
          timestamp: proctoringEvents.timestamp,
          attemptId: proctoringEvents.attemptId,
          examId: proctoringEvents.examId,
          firstName: users.firstName,
          lastName: users.lastName,
          examTitle: exams.title,
          riskScore: examAttempts.riskScore,
          attemptStatus: examAttempts.status,
        })
        .from(proctoringEvents)
        .innerJoin(examAttempts, eq(proctoringEvents.attemptId, examAttempts.id))
        .innerJoin(students, eq(proctoringEvents.studentId, students.id))
        .innerJoin(users, eq(students.userId, users.id))
        .innerJoin(exams, eq(proctoringEvents.examId, exams.id))
        .where(sql`${proctoringEvents.examId} = ANY(ARRAY[${sql.raw(examIds.join(","))}]::int[]) AND ${proctoringEvents.severity} IN ('critical', 'high', 'medium')`)
        .orderBy(desc(proctoringEvents.timestamp))
        .limit(100)
    : [];

  const critical = events.filter(e => e.severity === "critical").length;
  const high = events.filter(e => e.severity === "high").length;
  const medium = events.filter(e => e.severity === "medium").length;

  return (
    <div>
      <TopBar title="Security Incidents" subtitle="Review and manage proctoring events" />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Critical Events", value: critical, color: "text-red-400", bg: "bg-red-900/10 border-red-800/30" },
            { label: "High Risk Events", value: high, color: "text-orange-400", bg: "bg-orange-900/10 border-orange-800/30" },
            { label: "Medium Risk Events", value: medium, color: "text-yellow-400", bg: "bg-yellow-900/10 border-yellow-800/30" },
          ].map(s => (
            <Card key={s.label} className={s.bg}>
              <CardContent className="py-4 text-center">
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* AI Assessment Notice */}
        <div className="bg-blue-900/20 border border-blue-800/50 rounded-xl p-4 flex gap-3">
          <span className="text-2xl">🤖</span>
          <div>
            <p className="text-blue-400 font-semibold text-sm">AI Assessment Notice</p>
            <p className="text-slate-400 text-sm mt-1">
              Events below are recorded by the AI proctoring system with confidence scores.
              These are <strong>suspicious events only</strong> — not confirmed violations.
              Teacher review and judgment is required before any academic decision.
            </p>
          </div>
        </div>

        {/* Events Table */}
        <Card>
          <CardHeader><h3 className="font-semibold text-white">Security Events ({events.length})</h3></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {events.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <div className="text-4xl mb-3">✅</div>
                <p>No incidents to review</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    {["Time", "Student", "Exam", "Event", "Severity", "Confidence", "Risk Pts", "Actions"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {events.map(e => (
                    <tr key={e.id} className={`hover:bg-slate-800/30 transition-colors ${e.severity === "critical" ? "bg-red-900/5" : ""}`}>
                      <td className="px-4 py-3 text-xs text-slate-400 font-mono whitespace-nowrap">{formatDateTime(e.timestamp)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-white">{e.firstName} {e.lastName}</td>
                      <td className="px-4 py-3 text-xs text-slate-400 max-w-32 truncate">{e.examTitle}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-white font-medium">{e.eventType.replace(/_/g, " ")}</p>
                        {e.description && <p className="text-xs text-slate-500 truncate max-w-40">{e.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getSeverityColor(e.severity)}`}>
                          {e.severity.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">{e.confidenceScore ? `${e.confidenceScore}%` : "—"}</td>
                      <td className="px-4 py-3 text-sm text-red-400 font-bold">+{e.riskPoints}</td>
                      <td className="px-4 py-3">
                        <Link href={`/teacher/incidents/attempt/${e.attemptId}`}
                          className="text-indigo-400 hover:text-indigo-300 text-sm whitespace-nowrap">
                          Review →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
