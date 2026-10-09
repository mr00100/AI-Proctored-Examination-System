import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { examAttempts, students, exams, proctoringEvents, studentAnswers, questions, questionOptions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import Link from "next/link";
import { formatDateTime, getRiskLevel, getSeverityColor } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function ResultDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const attemptId = parseInt(id);

  const [student] = await db.select().from(students).where(eq(students.userId, session.userId)).limit(1);
  if (!student) redirect("/student");

  const [attempt] = await db.select().from(examAttempts)
    .where(and(eq(examAttempts.id, attemptId), eq(examAttempts.studentId, student.id)))
    .limit(1);

  if (!attempt) redirect("/student/results");

  const [exam] = await db.select().from(exams).where(eq(exams.id, attempt.examId)).limit(1);
  const events = await db.select().from(proctoringEvents)
    .where(eq(proctoringEvents.attemptId, attemptId))
    .orderBy(proctoringEvents.timestamp);

  const answers = await db.select().from(studentAnswers).where(eq(studentAnswers.attemptId, attemptId));
  const riskInfo = getRiskLevel(attempt.riskScore || 0);

  return (
    <div>
      <TopBar title="Exam Result" subtitle={exam?.title} />
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        {/* Status Banner */}
        {attempt.status === "terminated" && (
          <div className="bg-red-900/20 border-2 border-red-700/50 rounded-2xl p-6 text-center">
            <div className="text-5xl mb-3">🚫</div>
            <h2 className="text-2xl font-bold text-red-400 mb-2">EXAM TERMINATED</h2>
            <p className="text-slate-300">Reason: <span className="text-red-400 font-semibold">{attempt.terminationReason?.replace("_", " ").toUpperCase()}</span></p>
            <p className="text-slate-500 text-sm mt-2">Re-attempt: <span className={attempt.retakeAllowed ? "text-emerald-400" : "text-red-400"}>{attempt.retakeAllowed ? "Allowed" : "NOT ALLOWED"}</span></p>
          </div>
        )}

        {attempt.status === "completed" && (
          <div className={`border-2 rounded-2xl p-6 text-center ${attempt.isPassed ? "border-emerald-700/50 bg-emerald-900/10" : "border-red-700/50 bg-red-900/10"}`}>
            <div className="text-5xl mb-3">{attempt.isPassed ? "🎉" : "❌"}</div>
            <h2 className={`text-2xl font-bold mb-2 ${attempt.isPassed ? "text-emerald-400" : "text-red-400"}`}>
              {attempt.isPassed ? "PASSED" : "FAILED"}
            </h2>
            <p className="text-4xl font-bold text-white">{parseFloat(attempt.percentage || "0").toFixed(1)}%</p>
            <p className="text-slate-400 mt-2">Score: {parseFloat(attempt.score || "0").toFixed(1)} / {exam?.totalMarks}</p>
          </div>
        )}

        {/* Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-slate-500 mb-1">Exam</p>
              <p className="font-semibold text-white">{exam?.title}</p>
              <p className="text-xs text-slate-500 mt-1">{exam?.duration} minutes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-slate-500 mb-1">Status</p>
              <StatusBadge status={attempt.status} />
              <p className="text-xs text-slate-500 mt-2">{formatDateTime(attempt.startedAt)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-slate-500 mb-1">Risk Score</p>
              <p className={`text-xl font-bold ${riskInfo.color}`}>{attempt.riskScore || 0}%</p>
              <p className={`text-xs font-semibold ${riskInfo.color}`}>{riskInfo.level}</p>
            </CardContent>
          </Card>
        </div>

        {/* Event Timeline */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-white">📋 Exam Event Timeline</h3>
          </CardHeader>
          <CardContent className="p-0">
            {events.length === 0 ? (
              <div className="p-6 text-center text-slate-500">No events recorded</div>
            ) : (
              <div className="divide-y divide-slate-700/50 max-h-80 overflow-y-auto scrollbar-thin">
                {events.map(e => (
                  <div key={e.id} className="flex items-start gap-4 px-6 py-3">
                    <div className="text-xs text-slate-500 font-mono w-24 flex-shrink-0 pt-0.5">
                      {new Date(e.timestamp).toLocaleTimeString()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getSeverityColor(e.severity)}`}>
                          {e.severity.toUpperCase()}
                        </span>
                        <p className="text-sm text-white font-medium">{e.eventType.replace(/_/g, " ")}</p>
                      </div>
                      {e.description && <p className="text-xs text-slate-400 mt-0.5">{e.description}</p>}
                    </div>
                    {e.confidenceScore && (
                      <span className="text-xs text-slate-500">{e.confidenceScore}%</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Risk Score Explanation */}
        {(attempt.riskScore || 0) > 0 && (
          <Card className="border-amber-800/30">
            <CardHeader>
              <h3 className="font-semibold text-amber-400">⚠️ Risk Assessment</h3>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      (attempt.riskScore || 0) <= 25 ? "bg-emerald-500" :
                      (attempt.riskScore || 0) <= 50 ? "bg-yellow-500" :
                      (attempt.riskScore || 0) <= 75 ? "bg-orange-500" : "bg-red-500"
                    }`}
                    style={{ width: `${Math.min(100, attempt.riskScore || 0)}%` }}
                  />
                </div>
                <span className={`font-bold ${riskInfo.color}`}>{attempt.riskScore || 0}%</span>
              </div>
              <p className="text-slate-400 text-sm">
                Note: Risk score is informational. Final academic decisions are made by the teacher after review.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Link href="/student/results" className="px-6 py-2.5 border border-slate-600 text-slate-400 hover:text-white rounded-xl transition-all text-sm">
            ← All Results
          </Link>
          <Link href="/student/exams" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all text-sm">
            View Exams
          </Link>
        </div>
      </div>
    </div>
  );
}
