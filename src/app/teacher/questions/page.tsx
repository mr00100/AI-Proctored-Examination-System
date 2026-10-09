import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { questions, subjects, questionOptions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function QuestionBankPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const qs = await db
    .select({
      id: questions.id,
      questionText: questions.questionText,
      questionType: questions.questionType,
      difficulty: questions.difficulty,
      marks: questions.marks,
      topic: questions.topic,
      isAiGenerated: questions.isAiGenerated,
      isPublished: questions.isPublished,
      usageCount: questions.usageCount,
      subjectName: subjects.name,
      subjectCode: subjects.code,
      createdAt: questions.createdAt,
    })
    .from(questions)
    .leftJoin(subjects, eq(questions.subjectId, subjects.id))
    .where(eq(questions.createdBy, session.userId))
    .orderBy(desc(questions.createdAt));

  const difficultyColor: Record<string, string> = { easy: "success", medium: "warning", hard: "danger" };
  const typeColor: Record<string, string> = {
    mcq: "info", true_false: "purple", short_answer: "slate",
    long_answer: "slate", numerical: "warning", coding: "success",
  };

  const stats = {
    total: qs.length,
    mcq: qs.filter(q => q.questionType === "mcq").length,
    aiGenerated: qs.filter(q => q.isAiGenerated).length,
    published: qs.filter(q => q.isPublished).length,
  };

  return (
    <div>
      <TopBar title="Question Bank" subtitle="Manage your question library" />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Questions", value: stats.total, color: "text-blue-400" },
            { label: "MCQ Questions", value: stats.mcq, color: "text-indigo-400" },
            { label: "AI Generated", value: stats.aiGenerated, color: "text-purple-400" },
            { label: "Published", value: stats.published, color: "text-emerald-400" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="py-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Link href="/teacher/questions/new"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-all">
            + Create Question
          </Link>
          <Link href="/teacher/questions/ai-generate"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-all">
            🤖 AI Generate Questions
          </Link>
        </div>

        {/* Questions List */}
        <Card>
          <CardHeader><h3 className="font-semibold text-white">All Questions ({qs.length})</h3></CardHeader>
          <CardContent className="p-0">
            {qs.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <div className="text-4xl mb-3">❓</div>
                <p>No questions yet</p>
                <Link href="/teacher/questions/new" className="text-indigo-400 hover:text-indigo-300 text-sm mt-2 inline-block">
                  Create your first question →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {qs.map(q => (
                  <div key={q.id} className="px-6 py-4 hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-300 text-sm leading-relaxed line-clamp-2 mb-2">{q.questionText}</p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={typeColor[q.questionType] as "info" | "purple" | "slate" | "warning" | "success" | "danger" || "slate"}>
                            {q.questionType.replace("_", " ")}
                          </Badge>
                          <Badge variant={difficultyColor[q.difficulty] as "success" | "warning" | "danger" || "slate"}>
                            {q.difficulty}
                          </Badge>
                          {q.subjectName && <Badge variant="slate">{q.subjectCode}</Badge>}
                          {q.topic && <span className="text-xs text-slate-500">{q.topic}</span>}
                          {q.isAiGenerated && <Badge variant="purple">🤖 AI</Badge>}
                          {q.isPublished && <Badge variant="success">Published</Badge>}
                          <span className="text-xs text-amber-400 font-semibold">{q.marks}m</span>
                          <span className="text-xs text-slate-600">Used: {q.usageCount}×</span>
                        </div>
                      </div>
                      <Link href={`/teacher/questions/${q.id}`}
                        className="flex-shrink-0 px-3 py-1.5 text-indigo-400 hover:text-indigo-300 border border-indigo-800/50 hover:bg-indigo-900/20 rounded-lg text-sm transition-all">
                        Edit
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
