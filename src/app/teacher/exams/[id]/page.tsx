"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/utils";

interface Exam {
  id: number;
  title: string;
  description?: string;
  status: string;
  duration: number;
  totalMarks: string;
  passingMarks: string;
  totalQuestions: number;
  startDateTime: string;
  endDateTime: string;
  maxAttempts: number;
  requireCamera: boolean;
  requireFullscreen: boolean;
  tabSwitchTermination: boolean;
  copyPasteProtection: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  instructions?: string;
  subjectName?: string;
  subjectCode?: string;
}

interface Question {
  id: number;
  questionText: string;
  questionType: string;
  difficulty: string;
  marks: string;
  topic?: string;
}

interface AllQuestion {
  id: number;
  questionText: string;
  questionType: string;
  difficulty: string;
  marks: string;
  topic?: string;
  subjectName?: string;
}

export default function ExamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [allQuestions, setAllQuestions] = useState<AllQuestion[]>([]);
  const [selectedQIds, setSelectedQIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showQPicker, setShowQPicker] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    loadExam();
  }, [examId]);

  const loadExam = async () => {
    const res = await fetch(`/api/exams/${examId}`);
    const data = await res.json();
    setExam(data.exam);
    setQuestions(data.questions || []);
    setSelectedQIds(new Set(data.questions?.map((q: Question) => q.id) || []));
    setLoading(false);
  };

  const loadAllQuestions = async () => {
    const res = await fetch(`/api/questions`);
    const data = await res.json();
    setAllQuestions(data.questions || []);
    setShowQPicker(true);
  };

  const toggleQuestion = (qId: number) => {
    setSelectedQIds(prev => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const saveQuestions = async () => {
    const res = await fetch(`/api/exams/${examId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionIds: Array.from(selectedQIds) }),
    });
    if (res.ok) {
      setShowQPicker(false);
      loadExam();
    }
  };

  const updateStatus = async (status: string) => {
    setStatusUpdating(true);
    await fetch(`/api/exams/${examId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await loadExam();
    setStatusUpdating(false);
  };

  const deleteExam = async () => {
    if (!confirm("Are you sure you want to delete this exam?")) return;
    await fetch(`/api/exams/${examId}`, { method: "DELETE" });
    router.push("/teacher/exams");
  };

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><div className="animate-spin text-4xl">⟳</div></div>;
  if (!exam) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">Exam not found</div>;

  const difficultyColor: Record<string, string> = { easy: "text-emerald-400", medium: "text-yellow-400", hard: "text-red-400" };

  return (
    <div>
      <TopBar title={exam.title} subtitle={`${exam.subjectCode || ""} — ${exam.subjectName || "General"}`} />
      <div className="p-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={exam.status} />
          <div className="flex gap-2 ml-auto">
            {exam.status === "draft" && (
              <button onClick={() => updateStatus("published")} disabled={statusUpdating}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-all">
                Publish
              </button>
            )}
            {exam.status === "published" && (
              <button onClick={() => updateStatus("active")} disabled={statusUpdating}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-all">
                Activate
              </button>
            )}
            {["published", "active"].includes(exam.status) && (
              <button onClick={() => updateStatus("archived")} disabled={statusUpdating}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-all">
                Archive
              </button>
            )}
            <Link href={`/teacher/exams/${examId}/attempts`}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-all">
              📊 View Results
            </Link>
            <button onClick={deleteExam}
              className="px-4 py-2 bg-red-900/50 text-red-400 hover:bg-red-900 rounded-xl text-sm font-medium transition-all">
              🗑️ Delete
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Exam Details */}
          <Card>
            <CardHeader><h3 className="font-semibold text-white">📋 Exam Details</h3></CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Total Marks", value: exam.totalMarks },
                { label: "Passing Marks", value: exam.passingMarks },
                { label: "Duration", value: `${exam.duration} minutes` },
                { label: "Questions", value: exam.totalQuestions },
                { label: "Max Attempts", value: exam.maxAttempts },
                { label: "Start", value: formatDateTime(exam.startDateTime) },
                { label: "End", value: formatDateTime(exam.endDateTime) },
              ].map(f => (
                <div key={f.label} className="flex justify-between">
                  <span className="text-slate-500 text-sm">{f.label}</span>
                  <span className="text-white text-sm font-medium">{f.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Proctoring Settings */}
          <Card>
            <CardHeader><h3 className="font-semibold text-white">🤖 Proctoring Settings</h3></CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Tab Switch", value: exam.tabSwitchTermination ? "TERMINATE" : "Warn", danger: exam.tabSwitchTermination },
                { label: "Camera Required", value: exam.requireCamera ? "Yes" : "No" },
                { label: "Full Screen", value: exam.requireFullscreen ? "Required" : "Optional" },
                { label: "Copy/Paste Protection", value: exam.copyPasteProtection ? "Enabled" : "Disabled" },
                { label: "Shuffle Questions", value: exam.shuffleQuestions ? "Yes" : "No" },
                { label: "Shuffle Options", value: exam.shuffleOptions ? "Yes" : "No" },
              ].map(f => (
                <div key={f.label} className="flex justify-between">
                  <span className="text-slate-500 text-sm">{f.label}</span>
                  <span className={`text-sm font-medium ${f.danger ? "text-red-400" : "text-white"}`}>{f.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Questions */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h3 className="font-semibold text-white">❓ Questions ({questions.length})</h3>
            <div className="flex gap-2">
              <button onClick={loadAllQuestions}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-all">
                + Add Questions
              </button>
              <Link href="/teacher/questions/new"
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-all">
                Create Question
              </Link>
              <Link href="/teacher/questions/ai-generate"
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-all">
                🤖 AI Generate
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {questions.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No questions added yet. Click "Add Questions" to select from your question bank.</div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {questions.map((q, i) => (
                  <div key={q.id} className="flex items-start gap-4 px-6 py-4">
                    <span className="text-slate-500 text-sm font-mono w-6 flex-shrink-0">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-300 text-sm leading-relaxed line-clamp-2">{q.questionText}</p>
                      <div className="flex gap-2 mt-2">
                        <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded">{q.questionType.replace("_", " ")}</span>
                        <span className={`text-xs ${difficultyColor[q.difficulty] || "text-slate-400"}`}>{q.difficulty}</span>
                        {q.topic && <span className="text-xs text-slate-600">{q.topic}</span>}
                      </div>
                    </div>
                    <span className="text-amber-400 text-sm font-bold flex-shrink-0">{q.marks}m</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Question Picker Modal */}
        {showQPicker && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
                <h3 className="font-semibold text-white">Select Questions</h3>
                <div className="flex gap-3">
                  <span className="text-sm text-slate-400">{selectedQIds.size} selected</span>
                  <button onClick={() => setShowQPicker(false)} className="text-slate-400 hover:text-white">✕</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-slate-700/50">
                {allQuestions.map(q => (
                  <label key={q.id} className="flex items-start gap-4 px-6 py-4 cursor-pointer hover:bg-slate-700/30">
                    <input type="checkbox" checked={selectedQIds.has(q.id)} onChange={() => toggleQuestion(q.id)}
                      className="mt-1 accent-indigo-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-300 line-clamp-2">{q.questionText}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs text-slate-500">{q.questionType.replace("_", " ")}</span>
                        <span className={`text-xs ${difficultyColor[q.difficulty] || "text-slate-400"}`}>{q.difficulty}</span>
                        <span className="text-xs text-amber-400">{q.marks}m</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-slate-700">
                <button onClick={() => setShowQPicker(false)} className="flex-1 py-2.5 border border-slate-600 text-slate-400 rounded-xl hover:text-white transition-all text-sm">
                  Cancel
                </button>
                <button onClick={saveQuestions} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all text-sm font-medium">
                  Save ({selectedQIds.size}) Questions
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
