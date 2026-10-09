import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { exams, subjects, users, examAttempts, students, examEnrollments } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";

export default async function StudentExams() {
  const session = await getSession();
  if (!session) return null;

  const [student] = await db.select().from(students).where(eq(students.userId, session.userId)).limit(1);

  // Get available exams
  const availableExams = await db
    .select({
      id: exams.id,
      title: exams.title,
      description: exams.description,
      status: exams.status,
      duration: exams.duration,
      totalMarks: exams.totalMarks,
      passingMarks: exams.passingMarks,
      totalQuestions: exams.totalQuestions,
      startDateTime: exams.startDateTime,
      endDateTime: exams.endDateTime,
      maxAttempts: exams.maxAttempts,
      requireCamera: exams.requireCamera,
      requireFullscreen: exams.requireFullscreen,
      tabSwitchTermination: exams.tabSwitchTermination,
      subjectName: subjects.name,
      subjectCode: subjects.code,
      teacherFirst: users.firstName,
      teacherLast: users.lastName,
    })
    .from(exams)
    .leftJoin(subjects, eq(exams.subjectId, subjects.id))
    .leftJoin(users, eq(exams.createdBy, users.id))
    .where(sql`${exams.status} IN ('published', 'active')`)
    .orderBy(desc(exams.startDateTime));

  // Get student's attempts
  const attempts = student
    ? await db.select().from(examAttempts).where(eq(examAttempts.studentId, student.id))
    : [];

  const attemptsByExam = new Map<number, typeof attempts>();
  for (const a of attempts) {
    if (!attemptsByExam.has(a.examId)) attemptsByExam.set(a.examId, []);
    attemptsByExam.get(a.examId)!.push(a);
  }

  const now = new Date();

  return (
    <div>
      <TopBar title="Available Exams" subtitle="View and take your scheduled examinations" />

      <div className="p-6 space-y-6">
        <div className="bg-amber-900/20 border border-amber-800/50 rounded-xl p-4 flex gap-3">
          <span className="text-amber-400 text-xl">⚠️</span>
          <div>
            <p className="text-amber-400 font-semibold text-sm">Important: Exam Policy</p>
            <p className="text-slate-400 text-sm mt-1">
              Switching browser tabs or windows during an active exam will result in{" "}
              <strong className="text-red-400">IMMEDIATE TERMINATION</strong> of your attempt.
              Ensure a stable internet connection before starting.
            </p>
          </div>
        </div>

        {availableExams.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-slate-400 text-lg">No exams currently available</p>
              <p className="text-slate-500 text-sm mt-2">Check back later for upcoming examinations</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {availableExams.map(exam => {
              const examAttemptsList = attemptsByExam.get(exam.id) || [];
              const terminatedAttempt = examAttemptsList.find(a => a.status === "terminated" && !a.retakeAllowed);
              const inProgressAttempt = examAttemptsList.find(a => a.status === "in_progress");
              const completedAttempt = examAttemptsList.find(a => a.status === "completed");
              const hasStarted = now >= new Date(exam.startDateTime);
              const hasEnded = now > new Date(exam.endDateTime);
              const canAttempt = !terminatedAttempt && !completedAttempt && hasStarted && !hasEnded;

              return (
                <Card key={exam.id} className={terminatedAttempt ? "border-red-800/50 bg-red-900/5" : ""}>
                  <CardContent className="py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-white text-lg">{exam.title}</h3>
                          <StatusBadge status={exam.status} />
                          {terminatedAttempt && <Badge variant="danger">⛔ Terminated</Badge>}
                          {inProgressAttempt && <Badge variant="info">▶ In Progress</Badge>}
                          {completedAttempt && <Badge variant="success">✓ Completed</Badge>}
                        </div>
                        {exam.description && (
                          <p className="text-slate-400 text-sm mb-3">{exam.description}</p>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div className="bg-slate-700/30 rounded-lg p-2 text-center">
                            <p className="text-slate-500 text-xs">Duration</p>
                            <p className="text-white font-semibold">{exam.duration} min</p>
                          </div>
                          <div className="bg-slate-700/30 rounded-lg p-2 text-center">
                            <p className="text-slate-500 text-xs">Total Marks</p>
                            <p className="text-white font-semibold">{exam.totalMarks}</p>
                          </div>
                          <div className="bg-slate-700/30 rounded-lg p-2 text-center">
                            <p className="text-slate-500 text-xs">Questions</p>
                            <p className="text-white font-semibold">{exam.totalQuestions}</p>
                          </div>
                          <div className="bg-slate-700/30 rounded-lg p-2 text-center">
                            <p className="text-slate-500 text-xs">Passing</p>
                            <p className="text-white font-semibold">{exam.passingMarks}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500">
                          {exam.subjectName && <span>📚 {exam.subjectCode} — {exam.subjectName}</span>}
                          <span>👨‍🏫 {exam.teacherFirst} {exam.teacherLast}</span>
                          <span>🕐 Starts: {formatDateTime(exam.startDateTime)}</span>
                          <span>🕐 Ends: {formatDateTime(exam.endDateTime)}</span>
                        </div>
                        <div className="flex gap-2 mt-3">
                          {exam.requireCamera && <Badge variant="info">📷 Camera Required</Badge>}
                          {exam.requireFullscreen && <Badge variant="warning">🖥️ Full Screen</Badge>}
                          {exam.tabSwitchTermination && <Badge variant="danger">🚫 Tab Switch = Terminate</Badge>}
                        </div>
                      </div>

                      <div className="flex-shrink-0 text-right">
                        {terminatedAttempt ? (
                          <div className="space-y-2">
                            <div className="text-center p-3 bg-red-900/30 border border-red-800/50 rounded-xl">
                              <p className="text-red-400 font-bold text-sm">⛔ RE-ATTEMPT</p>
                              <p className="text-red-500 font-bold text-sm">NOT AVAILABLE</p>
                              <p className="text-xs text-slate-500 mt-1">Terminated: {terminatedAttempt.terminationReason?.replace("_", " ")}</p>
                            </div>
                            <Link href={`/student/results/${terminatedAttempt.id}`}
                              className="block text-xs text-indigo-400 hover:text-indigo-300 text-center">
                              View Details →
                            </Link>
                          </div>
                        ) : completedAttempt ? (
                          <div className="space-y-2">
                            <div className="text-center">
                              <p className={`font-bold text-xl ${completedAttempt.isPassed ? "text-emerald-400" : "text-red-400"}`}>
                                {parseFloat(completedAttempt.percentage || "0").toFixed(1)}%
                              </p>
                              <p className={`text-xs font-bold ${completedAttempt.isPassed ? "text-emerald-400" : "text-red-400"}`}>
                                {completedAttempt.isPassed ? "PASSED" : "FAILED"}
                              </p>
                            </div>
                            <Link href={`/student/results/${completedAttempt.id}`}
                              className="block text-xs text-center py-2 px-3 bg-indigo-900/30 text-indigo-400 rounded-lg hover:bg-indigo-900/50">
                              View Result
                            </Link>
                          </div>
                        ) : inProgressAttempt ? (
                          <Link href={`/student/exam/${exam.id}/precheck`}
                            className="block text-center py-2.5 px-5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold transition-all">
                            ▶ Resume
                          </Link>
                        ) : !hasStarted ? (
                          <div className="text-center">
                            <p className="text-slate-500 text-xs mb-1">Starts in</p>
                            <p className="text-amber-400 text-sm font-semibold">{formatDateTime(exam.startDateTime)}</p>
                          </div>
                        ) : hasEnded ? (
                          <Badge variant="slate">Exam Ended</Badge>
                        ) : (
                          <Link href={`/student/exam/${exam.id}/precheck`}
                            className="block text-center py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all">
                            Start Exam →
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
