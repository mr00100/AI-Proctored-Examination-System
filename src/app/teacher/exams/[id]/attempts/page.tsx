import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { examAttempts, exams, students, users, proctoringEvents } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import Link from "next/link";
import { formatDateTime, getRiskLevel } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function ExamAttempts({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const examId = parseInt(id);

  const [exam] = await db.select().from(exams).where(eq(exams.id, examId)).limit(1);
  if (!exam) redirect("/teacher/exams");

  const attempts = await db
    .select({
      id: examAttempts.id,
      status: examAttempts.status,
      startedAt: examAttempts.startedAt,
      completedAt: examAttempts.completedAt,
      terminatedAt: examAttempts.terminatedAt,
      terminationReason: examAttempts.terminationReason,
      score: examAttempts.score,
      percentage: examAttempts.percentage,
      isPassed: examAttempts.isPassed,
      riskScore: examAttempts.riskScore,
      retakeAllowed: examAttempts.retakeAllowed,
      attemptNumber: examAttempts.attemptNumber,
      studentId: examAttempts.studentId,
      firstName: users.firstName,
      lastName: users.lastName,
      studentNum: students.studentId,
    })
    .from(examAttempts)
    .innerJoin(students, eq(examAttempts.studentId, students.id))
    .innerJoin(users, eq(students.userId, users.id))
    .where(eq(examAttempts.examId, examId))
    .orderBy(desc(examAttempts.createdAt));

  const totalStudents = attempts.length;
  const completed = attempts.filter(a => a.status === "completed").length;
  const terminated = attempts.filter(a => a.status === "terminated").length;
  const inProgress = attempts.filter(a => a.status === "in_progress").length;
  const passed = attempts.filter(a => a.isPassed).length;

  return (
    <div>
      <TopBar title={`Results: ${exam.title}`} subtitle="Student attempt records" />
      <div className="p-6 space-y-6">
        <div className="flex gap-3">
          <Link href={`/teacher/exams/${examId}`} className="text-sm text-indigo-400 hover:text-indigo-300">← Back to Exam</Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Total", value: totalStudents, color: "text-blue-400" },
            { label: "In Progress", value: inProgress, color: "text-amber-400" },
            { label: "Completed", value: completed, color: "text-emerald-400" },
            { label: "Terminated", value: terminated, color: "text-red-400" },
            { label: "Passed", value: passed, color: "text-emerald-400" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="py-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Attempts Table */}
        <Card>
          <CardHeader><h3 className="font-semibold text-white">Student Attempts</h3></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  {["Student", "Student ID", "Status", "Score", "%", "Risk", "Started", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {attempts.map(attempt => {
                  const risk = getRiskLevel(attempt.riskScore || 0);
                  return (
                    <tr key={attempt.id} className={`hover:bg-slate-800/30 transition-colors ${attempt.status === "terminated" ? "bg-red-900/5" : ""}`}>
                      <td className="px-4 py-3 text-sm font-medium text-white">{attempt.firstName} {attempt.lastName}</td>
                      <td className="px-4 py-3 text-sm text-slate-400 font-mono">{attempt.studentNum}</td>
                      <td className="px-4 py-3"><StatusBadge status={attempt.status} /></td>
                      <td className="px-4 py-3 text-sm text-white">{attempt.score ? parseFloat(attempt.score).toFixed(1) : "—"} / {exam.totalMarks}</td>
                      <td className="px-4 py-3">
                        {attempt.percentage ? (
                          <span className={`font-bold text-sm ${attempt.isPassed ? "text-emerald-400" : "text-red-400"}`}>
                            {parseFloat(attempt.percentage).toFixed(1)}%
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-bold ${risk.color}`}>{attempt.riskScore || 0}% {risk.level}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{formatDateTime(attempt.startedAt)}</td>
                      <td className="px-4 py-3">
                        <Link href={`/teacher/incidents/attempt/${attempt.id}`}
                          className="text-indigo-400 hover:text-indigo-300 text-sm">
                          Review →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {attempts.length === 0 && (
              <div className="py-12 text-center text-slate-500">No attempts yet</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
