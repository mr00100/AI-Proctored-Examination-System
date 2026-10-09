import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { exams, subjects, examAttempts } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";

export default async function TeacherExams() {
  const session = await getSession();
  if (!session) return null;

  const teacherExams = await db
    .select({
      id: exams.id,
      title: exams.title,
      status: exams.status,
      duration: exams.duration,
      totalMarks: exams.totalMarks,
      totalQuestions: exams.totalQuestions,
      startDateTime: exams.startDateTime,
      endDateTime: exams.endDateTime,
      maxAttempts: exams.maxAttempts,
      requireCamera: exams.requireCamera,
      tabSwitchTermination: exams.tabSwitchTermination,
      subjectName: subjects.name,
      createdAt: exams.createdAt,
    })
    .from(exams)
    .leftJoin(subjects, eq(exams.subjectId, subjects.id))
    .where(eq(exams.createdBy, session.userId))
    .orderBy(desc(exams.createdAt));

  return (
    <div>
      <TopBar title="My Exams" subtitle="Manage your examination papers" />
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-slate-400 text-sm">{teacherExams.length} exam{teacherExams.length !== 1 ? "s" : ""}</p>
          <Link href="/teacher/exams/new"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-all">
            + Create Exam
          </Link>
        </div>

        {teacherExams.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-slate-400 text-lg">No exams yet</p>
              <Link href="/teacher/exams/new" className="mt-4 inline-block px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all text-sm">
                Create Your First Exam
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {teacherExams.map(exam => (
              <Card key={exam.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-white">{exam.title}</h3>
                        <StatusBadge status={exam.status} />
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm mb-3">
                        <div>
                          <p className="text-slate-500 text-xs">Subject</p>
                          <p className="text-slate-300">{exam.subjectName || "—"}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs">Duration</p>
                          <p className="text-slate-300">{exam.duration} min</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs">Questions</p>
                          <p className="text-slate-300">{exam.totalQuestions}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs">Start</p>
                          <p className="text-slate-300 text-xs">{formatDateTime(exam.startDateTime)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs">End</p>
                          <p className="text-slate-300 text-xs">{formatDateTime(exam.endDateTime)}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {exam.requireCamera && <Badge variant="info">📷 Camera</Badge>}
                        {exam.tabSwitchTermination && <Badge variant="danger">🚫 Tab=Terminate</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Link href={`/teacher/exams/${exam.id}`}
                        className="px-3 py-1.5 bg-indigo-900/30 text-indigo-400 hover:bg-indigo-900/50 rounded-lg text-sm transition-all">
                        Manage
                      </Link>
                      <Link href={`/teacher/exams/${exam.id}/attempts`}
                        className="px-3 py-1.5 bg-slate-700/50 text-slate-400 hover:bg-slate-700 rounded-lg text-sm transition-all">
                        Results
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
