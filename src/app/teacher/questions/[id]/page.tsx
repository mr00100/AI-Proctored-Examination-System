"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

interface Question {
  id: number;
  questionText: string;
  questionType: string;
  difficulty: string;
  marks: string;
  topic?: string;
  chapter?: string;
  explanation?: string;
  correctAnswer?: string;
  isPublished: boolean;
  isAiGenerated: boolean;
  options: { id: number; optionText: string; isCorrect: boolean; orderIndex: number }[];
}

export default function EditQuestionPage() {
  const params = useParams();
  const router = useRouter();
  const questionId = params.id as string;
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/questions/${questionId}`).then(r => r.json()).then(d => {
      setQuestion(d.question);
      setLoading(false);
    });
  }, [questionId]);

  const update = (key: string, value: unknown) => setQuestion(p => p ? { ...p, [key]: value } : p);

  const save = async () => {
    if (!question) return;
    setSaving(true);
    await fetch(`/api/questions/${questionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(question),
    });
    router.push("/teacher/questions");
    setSaving(false);
  };

  const inputCls = "w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><div className="animate-spin text-4xl">⟳</div></div>;
  if (!question) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">Question not found</div>;

  return (
    <div>
      <TopBar title="Edit Question" subtitle="Modify question details" />
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {question.isAiGenerated && (
          <div className="bg-purple-900/20 border border-purple-800/50 rounded-xl p-3 text-purple-400 text-sm">
            🤖 This is an AI-generated question. Please review carefully before publishing.
          </div>
        )}
        <Card>
          <CardContent className="py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Question Text</label>
              <textarea value={question.questionText} onChange={e => update("questionText", e.target.value)} rows={4} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Type</label>
                <select value={question.questionType} onChange={e => update("questionType", e.target.value)} className={inputCls}>
                  <option value="mcq">MCQ</option>
                  <option value="true_false">True/False</option>
                  <option value="short_answer">Short Answer</option>
                  <option value="long_answer">Long Answer</option>
                  <option value="numerical">Numerical</option>
                  <option value="coding">Coding</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Difficulty</label>
                <select value={question.difficulty} onChange={e => update("difficulty", e.target.value)} className={inputCls}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Marks</label>
                <input type="number" value={question.marks} onChange={e => update("marks", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Published</label>
                <select value={question.isPublished ? "true" : "false"} onChange={e => update("isPublished", e.target.value === "true")} className={inputCls}>
                  <option value="true">Yes</option>
                  <option value="false">No (Draft)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Correct Answer / Model Answer</label>
              <textarea value={question.correctAnswer || ""} onChange={e => update("correctAnswer", e.target.value)} rows={3} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Explanation</label>
              <textarea value={question.explanation || ""} onChange={e => update("explanation", e.target.value)} rows={2} className={inputCls} />
            </div>
            {question.options && question.options.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Options</label>
                <div className="space-y-2">
                  {question.options.map((opt, i) => (
                    <div key={opt.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${opt.isCorrect ? "border-emerald-700/50 bg-emerald-900/20" : "border-slate-700/50"}`}>
                      <span className={`text-sm font-bold ${opt.isCorrect ? "text-emerald-400" : "text-slate-500"}`}>
                        {opt.isCorrect ? "✓" : String.fromCharCode(65 + i)}.
                      </span>
                      <span className="text-slate-300 text-sm">{opt.optionText}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <div className="flex gap-3">
          <button onClick={() => router.back()} className="px-6 py-2.5 border border-slate-600 text-slate-400 hover:text-white rounded-xl transition-all text-sm">
            Cancel
          </button>
          <button onClick={save} disabled={saving} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
