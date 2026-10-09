"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

interface Subject { id: number; name: string; code: string; }

export default function NewQuestionPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    questionText: "",
    questionType: "mcq",
    difficulty: "medium",
    marks: "2",
    subjectId: "",
    topic: "",
    chapter: "",
    explanation: "",
    correctAnswer: "",
    isPublished: true,
    options: [
      { text: "", isCorrect: true },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ],
  });

  useEffect(() => {
    fetch("/api/subjects").then(r => r.json()).then(d => setSubjects(d.subjects || []));
  }, []);

  const update = (key: string, value: unknown) => setForm(p => ({ ...p, [key]: value }));

  const updateOption = (i: number, key: string, value: unknown) => {
    setForm(p => ({
      ...p,
      options: p.options.map((o, idx) => {
        if (key === "isCorrect" && value === true) {
          return { ...o, isCorrect: idx === i };
        }
        return idx === i ? { ...o, [key]: value } : o;
      }),
    }));
  };

  const addOption = () => setForm(p => ({ ...p, options: [...p.options, { text: "", isCorrect: false }] }));
  const removeOption = (i: number) => setForm(p => ({ ...p, options: p.options.filter((_, idx) => idx !== i) }));

  const needsOptions = ["mcq", "true_false"].includes(form.questionType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        ...form,
        marks: parseFloat(form.marks),
        subjectId: form.subjectId ? parseInt(form.subjectId) : null,
        options: needsOptions ? form.options.filter(o => o.text.trim()) : [],
      };

      if (form.questionType === "true_false") {
        payload.options = [
          { text: "True", isCorrect: form.correctAnswer === "true" },
          { text: "False", isCorrect: form.correctAnswer === "false" },
        ];
      }

      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      router.push("/teacher/questions");
    } catch {
      setError("Failed to create question");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm";

  return (
    <div>
      <TopBar title="Create Question" subtitle="Add a new question to your bank" />
      <div className="p-6 max-w-3xl mx-auto">
        {error && <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-xl text-red-400 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader><h3 className="font-semibold text-white">Question Details</h3></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Question Text *</label>
                <textarea value={form.questionText} onChange={e => update("questionText", e.target.value)} required rows={4}
                  placeholder="Enter the question..." className={inputCls} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Type *</label>
                  <select value={form.questionType} onChange={e => update("questionType", e.target.value)} className={inputCls}>
                    <option value="mcq">MCQ</option>
                    <option value="true_false">True/False</option>
                    <option value="short_answer">Short Answer</option>
                    <option value="long_answer">Long Answer</option>
                    <option value="numerical">Numerical</option>
                    <option value="coding">Coding</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Difficulty</label>
                  <select value={form.difficulty} onChange={e => update("difficulty", e.target.value)} className={inputCls}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Marks</label>
                  <input type="number" value={form.marks} onChange={e => update("marks", e.target.value)} min="0" step="0.5" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Subject</label>
                  <select value={form.subjectId} onChange={e => update("subjectId", e.target.value)} className={inputCls}>
                    <option value="">None</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.code}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Topic</label>
                  <input value={form.topic} onChange={e => update("topic", e.target.value)} className={inputCls} placeholder="e.g., Machine Learning" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Chapter</label>
                  <input value={form.chapter} onChange={e => update("chapter", e.target.value)} className={inputCls} placeholder="e.g., Chapter 5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* MCQ Options */}
          {form.questionType === "mcq" && (
            <Card>
              <CardHeader className="flex items-center justify-between">
                <h3 className="font-semibold text-white">Answer Options</h3>
                <button type="button" onClick={addOption}
                  className="text-sm text-indigo-400 hover:text-indigo-300">+ Add Option</button>
              </CardHeader>
              <CardContent className="space-y-3">
                {form.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <input type="radio" name="correct" checked={opt.isCorrect} onChange={() => updateOption(i, "isCorrect", true)}
                      className="accent-emerald-500 w-4 h-4 flex-shrink-0" title="Mark as correct" />
                    <span className="text-slate-500 text-sm w-6 text-center">{String.fromCharCode(65 + i)}.</span>
                    <input type="text" value={opt.text} onChange={e => updateOption(i, "text", e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + i)}`} className={`flex-1 ${inputCls}`} />
                    <button type="button" onClick={() => removeOption(i)} className="text-slate-600 hover:text-red-400 transition-colors">✕</button>
                  </div>
                ))}
                <p className="text-xs text-slate-500">Select the radio button next to the correct answer</p>
              </CardContent>
            </Card>
          )}

          {/* True/False */}
          {form.questionType === "true_false" && (
            <Card>
              <CardHeader><h3 className="font-semibold text-white">Correct Answer</h3></CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  {["true", "false"].map(v => (
                    <label key={v} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="tf" value={v} checked={form.correctAnswer === v} onChange={() => update("correctAnswer", v)} className="accent-emerald-500" />
                      <span className="text-slate-300 capitalize">{v}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Correct Answer / Explanation */}
          <Card>
            <CardHeader><h3 className="font-semibold text-white">Answer & Explanation</h3></CardHeader>
            <CardContent className="space-y-4">
              {!needsOptions && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Correct Answer / Model Answer</label>
                  <textarea value={form.correctAnswer} onChange={e => update("correctAnswer", e.target.value)} rows={3}
                    placeholder="Enter the correct/model answer..." className={inputCls} />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Explanation (for review)</label>
                <textarea value={form.explanation} onChange={e => update("explanation", e.target.value)} rows={2}
                  placeholder="Explain why this is the correct answer..." className={inputCls} />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.isPublished} onChange={e => update("isPublished", e.target.checked)} className="accent-indigo-500 w-4 h-4" />
                <span className="text-sm text-slate-300">Publish immediately</span>
              </label>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <button type="button" onClick={() => router.back()}
              className="px-6 py-2.5 border border-slate-600 text-slate-400 hover:text-white rounded-xl transition-all">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all">
              {loading ? "Creating..." : "Create Question"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
