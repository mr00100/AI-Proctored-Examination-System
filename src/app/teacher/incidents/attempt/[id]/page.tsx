import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { examAttempts, exams, students, users, proctoringEvents, studentAnswers, questions } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { formatDateTime, getRiskLevel, getSeverityColor } from "@/lib/utils";
import { redirect } from "next/navigation";
import OverrideButton from "./OverrideButton";

export default async function AttemptReview({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const attemptId = parseInt(id);

  const [attempt] = await db.select().from(examAttempts).where(eq(examAttempts.id, attemptId)).limit(1);
  if (!attempt) redirect("/teacher/incidents");

  const [exam] = await db.select().from(exams).where(eq(exams.id, attempt.examId)).limit(1);
  const [student] = await db.select().from(students).where(eq(students.id, attempt.studentId)).limit(1);
  const [studentUser] = student ? await db.select().from(users).where(eq(users.id, student.userId)).limit(1) : [null];

  const events = await db.select().from(proctoringEvents)
    .where(eq(proctoringEvents.attemptId, attemptId))
    .orderBy(proctoringEvents.timestamp);

  const answers = await db.select({
    questionId: studentAnswers.questionId,
    isCorrect: studentAnswers.isCorrect,
    marksAwarded: studentAnswers.marksAwarded,
    textAnswer: studentAnswers.textAnswer,
    selectedOptionId: studentAnswers.selectedOptionId,
    questionText: questions.questionText,
    questionType: questions.questionType,
  }).from(studentAnswers)
    .innerJoin(questions, eq(studentAnswers.questionId, questions.id))
    .where(eq(studentAnswers.attemptId, attemptId));

  const riskInfo = getRiskLevel(attempt.riskScore || 0);

  // Build risk score explanation
  const riskReasons: string[] = [];
  const eventCounts = new Map<string, number>();
  for (const e of events) {
    if (e.riskPoints > 0) {
      eventCounts.set(e.eventType, (eventCounts.get(e.eventType) || 0) + 1);
    }
  }
  eventCounts.forEach((count, type) => {
    if (type !== "exam_started" && type !== "exam_completed") {
      riskReasons.push(`${count}× ${type.replace(/_/g, " ")}`);
    }
  });

  return (
    <div>
      <TopBar title="Attempt Review" subtitle={`${studentUser?.firstName} ${studentUser?.lastName} — ${exam?.title}`} />
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex gap-3">
          <Link href="/teacher/incidents" className="text-sm text-indigo-400 hover:text-indigo-300">← Back to Incidents</Link>
        </div>

        {/* Status Banner */}
        {attempt.status === "terminated" && (
          <div className="bg-red-900/20 border-2 border-red-700/50 rounded-2xl p-5 flex items-center gap-4">
            <span className="text-4xl">🚫</span>
            <div>
              <h2 className="text-xl font-bold text-red-400">EXAM TERMINATED</h2>
              <p className="text-slate-300 text-sm">Reason: <span className="text-red-400 font-semibold">{attempt.terminationReason?.replace("_", " ").toUpperCase()}</span></p>
              <p className="text-slate-500 text-xs mt-1">Re-attempt: {attempt.retakeAllowed ? "Allowed" : "NOT ALLOWED"}</p>
            </div>
            <div className="ml-auto">
              {!attempt.retakeAllowed && (
                <OverrideButton attemptId={attemptId} />
              )}
            </div>
          </div>
        )}

        {/* Overview Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Student", value: `${studentUser?.firstName} ${studentUser?.lastName}`, sub: student?.studentId },
            { label: "Status", value: <StatusBadge status={attempt.status} />, sub: null },
            { label: "Score", value: attempt.score ? `${parseFloat(attempt.score).toFixed(1)} / ${exam?.totalMarks}` : "—", sub: attempt.percentage ? `${parseFloat(attempt.percentage).toFixed(1)}%` : "" },
            { label: "Risk Score", value: <span className={`font-bold ${riskInfo.color}`}>{attempt.riskScore || 0}%</span>, sub: riskInfo.level },
          ].map((s, i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                <div className="font-semibold text-white">{s.value}</div>
                {s.sub && <p className="text-xs text-slate-500 mt-1">{s.sub}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* AI Risk Assessment */}
        <Card className="border-amber-800/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-amber-400">🤖 AI Risk Assessment</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${riskInfo.bg} ${riskInfo.color}`}>
                RISK SCORE: {attempt.riskScore || 0}%
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {riskReasons.length > 0 ? (
              <div>
                <p className="text-slate-400 text-sm mb-3">Contributing factors:</p>
                <ul className="space-y-2">
                  {riskReasons.map((r, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span className="text-amber-400">•</span>
                      <span className="text-slate-300">{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-slate-400 text-sm">No suspicious events recorded.</p>
            )}
            <div className="mt-4 pt-4 border-t border-slate-700/50">
              <p className="text-xs text-slate-500">
                ⚠️ This is AI-generated risk analysis. Confidence scores are estimates.
                Final academic decisions require teacher review and must not be based solely on AI assessment.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Event Timeline */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-white">📋 Complete Event Timeline</h3>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative divide-y divide-slate-700/30 max-h-96 overflow-y-auto scrollbar-thin">
              {events.map((e, i) => (
                <div key={e.id} className={`flex items-start gap-4 px-6 py-3 ${e.eventType === "exam_terminated" ? "bg-red-900/10" : ""}`}>
                  <div className="text-xs text-slate-500 font-mono w-20 flex-shrink-0 pt-0.5">
                    {new Date(e.timestamp).toLocaleTimeString()}
                  </div>
                  <div className="w-2 flex-shrink-0 pt-2 relative">
                    <div className={`w-2 h-2 rounded-full ${
                      e.severity === "critical" ? "bg-red-500" :
                      e.severity === "high" ? "bg-orange-500" :
                      e.severity === "medium" ? "bg-yellow-500" :
                      e.severity === "info" ? "bg-blue-500" : "bg-green-500"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getSeverityColor(e.severity)}`}>
                        {e.severity.toUpperCase()}
                      </span>
                      <p className="text-sm text-white font-medium">{e.eventType.replace(/_/g, " ")}</p>
                    </div>
                    {e.description && <p className="text-xs text-slate-400">{e.description}</p>}
                  </div>
                  <div className="text-right text-xs text-slate-600 flex-shrink-0">
                    {e.confidenceScore && <span>{e.confidenceScore}% conf.</span>}
                    {e.riskPoints > 0 && <p className="text-red-500">+{e.riskPoints}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Answers Summary */}
        {answers.length > 0 && (
          <Card>
            <CardHeader><h3 className="font-semibold text-white">📝 Answer Summary</h3></CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-700/30">
                {answers.map((a, i) => (
                  <div key={a.questionId} className="flex items-start gap-4 px-6 py-3">
                    <span className="text-xs text-slate-500 font-mono w-6 flex-shrink-0 pt-1">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-300 line-clamp-2">{a.questionText}</p>
                      {a.textAnswer && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">Answer: {a.textAnswer}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {a.isCorrect === true ? (
                        <span className="text-emerald-400 text-sm">✓ +{a.marksAwarded}</span>
                      ) : a.isCorrect === false ? (
                        <span className="text-red-400 text-sm">✗ 0</span>
                      ) : (
                        <span className="text-slate-500 text-sm">—</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
