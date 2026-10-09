import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { examAttempts, students, exams } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";

export default async function StudentResults() {
  const session = await getSession();
  if (!session) return null;

  const [student] = await db.select().from(students).where(eq(students.userId, session.userId)).limit(1);
  const attempts = student ? await db
    .select({
      id: examAttempts.id,
      status: examAttempts.status,
      startedAt: examAttempts.startedAt,
      completedAt: examAttempts.completedAt,
      terminatedAt: examAttempts.terminatedAt,
      score: examAttempts.score,
      percentage: examAttempts.percentage,
      isPassed: examAttempts.isPassed,
      riskScore: examAttempts.riskScore,
      terminationReason: examAttempts.terminationReason,
      retakeAllowed: examAttempts.retakeAllowed,
      attemptNumber: examAttempts.attemptNumber,
      examTitle: exams.title,
      examDuration: exams.duration,
      examTotalMarks: exams.totalMarks,
      examPassingMarks: exams.passingMarks,
    })
    .from(examAttempts)
    .innerJoin(exams, eq(examAttempts.examId, exams.id))
    .where(eq(examAttempts.studentId, student.id))
    .orderBy(desc(examAttempts.createdAt)) : [];

  return (
    <div>
      <TopBar title="My Results" subtitle="View your examination history and results" />
      <div className="p-6 space-y-4">
        {attempts.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="text-5xl mb-4">📊</div>
              <p className="text-slate-400">No exam results yet</p>
            </CardContent>
          </Card>
        ) : (
          attempts.map(attempt => (
            <Card key={attempt.id} className={attempt.status === "terminated" ? "border-red-800/30" : ""}>
              <CardContent className="py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-white">{attempt.examTitle}</h3>
                      <StatusBadge status={attempt.status} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-3">
                      {attempt.status === "completed" && (
                        <>
                          <div>
                            <p className="text-slate-500 text-xs">Score</p>
                            <p className="text-white font-bold">{parseFloat(attempt.score || "0").toFixed(1)} / {attempt.examTotalMarks}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs">Percentage</p>
                            <p className={`font-bold ${attempt.isPassed ? "text-emerald-400" : "text-red-400"}`}>
                              {parseFloat(attempt.percentage || "0").toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs">Result</p>
                            <p className={`font-bold ${attempt.isPassed ? "text-emerald-400" : "text-red-400"}`}>
                              {attempt.isPassed ? "PASSED" : "FAILED"}
                            </p>
                          </div>
                        </>
                      )}
                      {attempt.status === "terminated" && (
                        <div className="col-span-3">
                          <p className="text-slate-500 text-xs">Termination Reason</p>
                          <p className="text-red-400 font-bold">{attempt.terminationReason?.replace("_", " ").toUpperCase()}</p>
                          <p className="text-slate-500 text-xs mt-1">Re-attempt: {attempt.retakeAllowed ? "Allowed" : "NOT ALLOWED"}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-slate-500 text-xs">Date</p>
                        <p className="text-white text-sm">{formatDateTime(attempt.startedAt)}</p>
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/student/results/${attempt.id}`}
                    className="px-4 py-2 bg-indigo-900/30 text-indigo-400 hover:bg-indigo-900/50 rounded-xl text-sm font-medium transition-all"
                  >
                    View Details →
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
