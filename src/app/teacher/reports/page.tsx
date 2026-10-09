import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { exams, examAttempts, students, users, proctoringEvents } from "@/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Link from "next/link";
import { formatDateTime, getRiskLevel } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function ReportsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const teacherExams = await db
    .select({
      id: exams.id,
      title: exams.title,
      status: exams.status,
      totalMarks: exams.totalMarks,
      passingMarks: exams.passingMarks,
      startDateTime: exams.startDateTime,
    })
    .from(exams)
    .where(eq(exams.createdBy, session.userId))
    .orderBy(desc(exams.createdAt));

  const examIds = teacherExams.map(e => e.id);

  const examReports = await Promise.all(
    teacherExams.map(async (exam) => {
      const attempts = await db.select({
        status: examAttempts.status,
        score: examAttempts.score,
        percentage: examAttempts.percentage,
        isPassed: examAttempts.isPassed,
        riskScore: examAttempts.riskScore,
        terminationReason: examAttempts.terminationReason,
      }).from(examAttempts).where(eq(examAttempts.examId, exam.id));

      const completed = attempts.filter(a => a.status === "completed");
      const terminated = attempts.filter(a => a.status === "terminated");
      const passed = completed.filter(a => a.isPassed);
      const scores = completed.map(a => parseFloat(a.percentage || "0"));
      const avg = scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;
      const max = scores.length > 0 ? Math.max(...scores) : 0;
      const min = scores.length > 0 ? Math.min(...scores) : 0;

      return {
        ...exam,
        totalAttempts: attempts.length,
        completed: completed.length,
        terminated: terminated.length,
        passed: passed.length,
        avgScore: avg.toFixed(1),
        maxScore: max.toFixed(1),
        minScore: min.toFixed(1),
        passRate: completed.length > 0 ? ((passed.length / completed.length) * 100).toFixed(1) : "0",
      };
    })
  );

  return (
    <div>
      <TopBar title="Reports & Analytics" subtitle="Examination performance and analytics" />
      <div className="p-6 space-y-6">
        {examReports.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="text-5xl mb-4">📈</div>
              <p className="text-slate-400">No exam data available yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {examReports.map(report => (
              <Card key={report.id}>
                <CardContent className="py-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-white">{report.title}</h3>
                      <p className="text-xs text-slate-500">{formatDateTime(report.startDateTime)}</p>
                    </div>
                    <Link href={`/teacher/exams/${report.id}/attempts`}
                      className="text-sm text-indigo-400 hover:text-indigo-300">
                      View All →
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {[
                      { label: "Total", value: report.totalAttempts, color: "text-blue-400" },
                      { label: "Completed", value: report.completed, color: "text-emerald-400" },
                      { label: "Terminated", value: report.terminated, color: "text-red-400" },
                      { label: "Passed", value: report.passed, color: "text-emerald-400" },
                      { label: "Avg Score", value: `${report.avgScore}%`, color: "text-indigo-400" },
                      { label: "Max Score", value: `${report.maxScore}%`, color: "text-emerald-400" },
                      { label: "Pass Rate", value: `${report.passRate}%`, color: report.passRate >= "50" ? "text-emerald-400" : "text-red-400" },
                    ].map(s => (
                      <div key={s.label} className="bg-slate-700/30 rounded-xl p-3 text-center">
                        <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-slate-500">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  {report.totalAttempts > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>Pass Rate</span>
                        <span>{report.passRate}%</span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${report.passRate}%` }} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
