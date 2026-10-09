import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { examAttempts, students, exams, proctoringEvents } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import Link from "next/link";
import { formatDateTime, formatDate } from "@/lib/utils";

export default async function StudentDashboard() {
  const session = await getSession();
  if (!session) return null;

  const [student] = await db.select().from(students).where(eq(students.userId, session.userId)).limit(1);

  let recentAttempts: {
    id: number;
    examId: number;
    status: "not_started" | "in_progress" | "completed" | "terminated" | "abandoned";
    startedAt: Date | null;
    completedAt: Date | null;
    score: string | null;
    percentage: string | null;
    isPassed: boolean | null;
    riskScore: number;
    terminationReason: "tab_switch" | "fullscreen_exit" | "time_expired" | "manual" | "system_error" | null;
    examTitle: string;
  }[] = [];

  if (student) {
    const raw = await db
      .select({
        id: examAttempts.id,
        examId: examAttempts.examId,
        status: examAttempts.status,
        startedAt: examAttempts.startedAt,
        completedAt: examAttempts.completedAt,
        score: examAttempts.score,
        percentage: examAttempts.percentage,
        isPassed: examAttempts.isPassed,
        riskScore: examAttempts.riskScore,
        terminationReason: examAttempts.terminationReason,
        examTitle: exams.title,
      })
      .from(examAttempts)
      .innerJoin(exams, eq(examAttempts.examId, exams.id))
      .where(eq(examAttempts.studentId, student.id))
      .orderBy(desc(examAttempts.createdAt))
      .limit(10);
    recentAttempts = raw;
  }

  const completed = recentAttempts.filter(a => a.status === "completed");
  const terminated = recentAttempts.filter(a => a.status === "terminated");
  const avgScore = completed.length > 0
    ? (completed.reduce((s, a) => s + parseFloat(a.percentage || "0"), 0) / completed.length).toFixed(1)
    : "0";

  return (
    <div>
      <TopBar title="Student Dashboard" subtitle={`Welcome back, ${session.firstName}!`} />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Attempts", value: recentAttempts.length, icon: "📋", color: "text-blue-400" },
            { label: "Completed", value: completed.length, icon: "✅", color: "text-emerald-400" },
            { label: "Terminated", value: terminated.length, icon: "🚫", color: "text-red-400" },
            { label: "Avg Score", value: `${avgScore}%`, icon: "📊", color: "text-indigo-400" },
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

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/student/exams">
            <Card className="hover:border-indigo-600/50 transition-all cursor-pointer hover:bg-indigo-900/10">
              <CardContent className="flex items-center gap-4 py-6">
                <div className="w-14 h-14 bg-indigo-900/50 rounded-2xl flex items-center justify-center text-3xl">📋</div>
                <div>
                  <h3 className="font-semibold text-white text-lg">Available Exams</h3>
                  <p className="text-slate-400 text-sm">View and start your scheduled examinations</p>
                </div>
                <span className="ml-auto text-slate-600 text-xl">→</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/student/results">
            <Card className="hover:border-emerald-600/50 transition-all cursor-pointer hover:bg-emerald-900/10">
              <CardContent className="flex items-center gap-4 py-6">
                <div className="w-14 h-14 bg-emerald-900/50 rounded-2xl flex items-center justify-center text-3xl">📊</div>
                <div>
                  <h3 className="font-semibold text-white text-lg">My Results</h3>
                  <p className="text-slate-400 text-sm">View your exam results and performance</p>
                </div>
                <span className="ml-auto text-slate-600 text-xl">→</span>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Attempts */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-white">Recent Exam Attempts</h3>
          </CardHeader>
          <CardContent className="p-0">
            {recentAttempts.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <div className="text-4xl mb-3">📋</div>
                <p>No exam attempts yet.</p>
                <Link href="/student/exams" className="text-indigo-400 hover:text-indigo-300 text-sm mt-2 inline-block">
                  View available exams →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {recentAttempts.map(attempt => (
                  <div key={attempt.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{attempt.examTitle}</p>
                      <p className="text-xs text-slate-500">{formatDateTime(attempt.startedAt)}</p>
                    </div>
                    <StatusBadge status={attempt.status} />
                    {attempt.status === "completed" && (
                      <div className="text-right">
                        <p className={`font-bold ${attempt.isPassed ? "text-emerald-400" : "text-red-400"}`}>
                          {parseFloat(attempt.percentage || "0").toFixed(1)}%
                        </p>
                        <p className="text-xs text-slate-500">{attempt.isPassed ? "PASSED" : "FAILED"}</p>
                      </div>
                    )}
                    {attempt.status === "terminated" && (
                      <div className="text-right">
                        <p className="text-xs text-red-400 font-semibold">TERMINATED</p>
                        <p className="text-xs text-slate-500">{attempt.terminationReason?.replace("_", " ")}</p>
                      </div>
                    )}
                    <Link
                      href={`/student/results/${attempt.id}`}
                      className="text-indigo-400 hover:text-indigo-300 text-sm"
                    >
                      View →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Academic Integrity Notice */}
        <Card className="border-amber-800/30 bg-amber-900/10">
          <CardContent className="flex gap-4 py-4">
            <span className="text-2xl">⚠️</span>
            <div>
              <h4 className="font-semibold text-amber-400 mb-1">Academic Integrity Notice</h4>
              <p className="text-slate-400 text-sm">
                This examination system uses AI proctoring. Switching browser tabs or windows during an exam 
                will result in <strong className="text-red-400">immediate termination</strong> of your attempt 
                with no possibility of re-taking.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
