"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

interface Subject { id: number; name: string; code: string; }
interface GeneratedQ {
  questionText: string;
  questionType: string;
  difficulty: string;
  marks: number;
  topic: string;
  options: { text: string; isCorrect: boolean }[];
  correctAnswer: string;
  explanation: string;
  selected?: boolean;
  edited?: boolean;
}

export default function AIGeneratePage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState<GeneratedQ[]>([]);
  const [form, setForm] = useState({
    subject: "",
    subjectId: "",
    topic: "",
    difficulty: "medium",
    questionType: "mcq",
    count: 5,
  });

  useEffect(() => {
    fetch("/api/subjects").then(r => r.json()).then(d => setSubjects(d.subjects || []));
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setGenerating(true);
    setGenerated([]);

    try {
      const res = await fetch("/api/questions/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setGenerated(data.questions.map((q: GeneratedQ) => ({ ...q, selected: true })));
    } catch {
      setError("Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const toggleSelect = (i: number) => {
    setGenerated(prev => prev.map((q, idx) => idx === i ? { ...q, selected: !q.selected } : q));
  };

  const updateQuestion = (i: number, key: string, value: string) => {
    setGenerated(prev => prev.map((q, idx) => idx === i ? { ...q, [key]: value, edited: true } : q));
  };

  const saveSelected = async () => {
    const selected = generated.filter(q => q.selected);
    if (selected.length === 0) { setError("No questions selected"); return; }

    setSaving(true);
    let saved = 0;

    for (const q of selected) {
      try {
        await fetch("/api/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...q,
            subjectId: form.subjectId ? parseInt(form.subjectId) : null,
            isAiGenerated: true,
            isPublished: false,
          }),
        });
        saved++;
      } catch {}
    }

    setSaving(false);
    alert(`✅ Saved ${saved} questions to your bank (unpublished — please review before publishing).`);
    router.push("/teacher/questions");
  };

  const inputCls = "w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm";

  return (
    <div>
      <TopBar title="AI Question Generator" subtitle="Generate questions using AI assistance" />
      <div className="p-6 space-y-6">
        {/* Generator Form */}
        <Card className="border-purple-800/30 bg-purple-900/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              <h3 className="font-semibold text-purple-400">AI Generation Parameters</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-amber-900/20 border border-amber-800/50 rounded-xl p-3 mb-6 text-sm text-amber-400">
              ⚠️ AI-generated questions require teacher review before publishing.
              Questions are saved as unpublished drafts.
            </div>
            {error && <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-xl text-red-400 text-sm">{error}</div>}
            <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Subject *</label>
                <select value={form.subjectId} onChange={e => {
                  const sel = subjects.find(s => s.id === parseInt(e.target.value));
                  setForm(p => ({ ...p, subjectId: e.target.value, subject: sel ? `${sel.name}` : p.subject }));
                }} className={inputCls}>
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
                </select>
                {!form.subjectId && (
                  <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                    placeholder="Or enter subject name manually..." className={`mt-2 ${inputCls}`} />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Topic *</label>
                <input required value={form.topic} onChange={e => setForm(p => ({ ...p, topic: e.target.value }))}
                  placeholder="e.g., Machine Learning, Neural Networks" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Question Type</label>
                <select value={form.questionType} onChange={e => setForm(p => ({ ...p, questionType: e.target.value }))} className={inputCls}>
                  <option value="mcq">Multiple Choice (MCQ)</option>
                  <option value="true_false">True/False</option>
                  <option value="short_answer">Short Answer</option>
                  <option value="long_answer">Long Answer</option>
                  <option value="numerical">Numerical</option>
                  <option value="coding">Coding</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Difficulty</label>
                <select value={form.difficulty} onChange={e => setForm(p => ({ ...p, difficulty: e.target.value }))} className={inputCls}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Number of Questions (max 10)</label>
                <input type="number" min="1" max="10" value={form.count} onChange={e => setForm(p => ({ ...p, count: parseInt(e.target.value) }))} className={inputCls} />
              </div>
              <div className="flex items-end">
                <button type="submit" disabled={generating || (!form.subject && !form.subjectId) || !form.topic}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
                  {generating ? (
                    <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Generating...</>
                  ) : "🤖 Generate Questions"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Generated Questions */}
        {generated.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Generated Questions ({generated.filter(q => q.selected).length}/{generated.length} selected)</h3>
              <div className="flex gap-3">
                <button onClick={() => setGenerated(p => p.map(q => ({ ...q, selected: true })))}
                  className="text-sm text-indigo-400 hover:text-indigo-300">Select All</button>
                <button onClick={saveSelected} disabled={saving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-all">
                  {saving ? "Saving..." : "💾 Save Selected (Unpublished)"}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {generated.map((q, i) => (
                <Card key={i} className={q.selected ? "border-indigo-700/50" : "opacity-60"}>
                  <CardContent className="py-4">
                    <div className="flex items-start gap-4">
                      <input type="checkbox" checked={q.selected || false} onChange={() => toggleSelect(i)}
                        className="mt-1 accent-indigo-500 w-5 h-5 flex-shrink-0" />
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-purple-900/50 text-purple-400 px-2 py-0.5 rounded">🤖 AI Generated</span>
                          <span className="text-xs text-slate-500">{q.questionType.replace("_", " ")} • {q.difficulty} • {q.marks}m</span>
                          {q.edited && <span className="text-xs text-amber-400">✏️ Edited</span>}
                        </div>
                        <textarea
                          value={q.questionText}
                          onChange={e => updateQuestion(i, "questionText", e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        />
                        {q.options?.length > 0 && (
                          <div className="space-y-1">
                            {q.options.map((opt, oi) => (
                              <div key={oi} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${opt.isCorrect ? "bg-emerald-900/30 text-emerald-400" : "bg-slate-700/30 text-slate-400"}`}>
                                {opt.isCorrect ? "✓" : "○"} {String.fromCharCode(65 + oi)}. {opt.text}
                              </div>
                            ))}
                          </div>
                        )}
                        {q.explanation && (
                          <p className="text-xs text-slate-500 italic">💡 {q.explanation}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
