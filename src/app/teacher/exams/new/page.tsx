"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

interface Subject { id: number; name: string; code: string; }

export default function NewExamPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    subjectId: "",
    totalMarks: "100",
    passingMarks: "50",
    duration: "60",
    startDateTime: "",
    endDateTime: "",
    totalQuestions: "10",
    maxAttempts: "1",
    negativeMarking: false,
    negativeMarkValue: "0",
    shuffleQuestions: true,
    shuffleOptions: true,
    status: "draft",
    proctoringLevel: "standard",
    requireCamera: true,
    requireMicrophone: false,
    requireFullscreen: true,
    tabSwitchTermination: true,
    fullscreenExitAction: "warn",
    copyPasteProtection: true,
    faceVerification: false,
    showResultsToStudent: true,
    showCorrectAnswers: false,
    instructions: "",
  });

  useEffect(() => {
    fetch("/api/subjects").then(r => r.json()).then(d => setSubjects(d.subjects || []));
  }, []);

  const update = (key: string, value: unknown) => setForm(p => ({ ...p, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, totalMarks: parseFloat(form.totalMarks), passingMarks: parseFloat(form.passingMarks), duration: parseInt(form.duration), totalQuestions: parseInt(form.totalQuestions), maxAttempts: parseInt(form.maxAttempts) }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      router.push(`/teacher/exams/${data.exam.id}`);
    } catch {
      setError("Failed to create exam");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm";
  const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
    <label className="flex items-center gap-3 cursor-pointer">
      <div onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full transition-all relative ${checked ? "bg-indigo-600" : "bg-slate-600"}`}>
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${checked ? "left-6" : "left-1"}`} />
      </div>
      <span className="text-sm text-slate-300">{label}</span>
    </label>
  );

  return (
    <div>
      <TopBar title="Create New Exam" subtitle="Set up a new examination paper" />
      <div className="p-6 max-w-4xl mx-auto">
        {error && <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-xl text-red-400 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader><h3 className="font-semibold text-white">📋 Basic Information</h3></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Exam Title *</label>
                <input value={form.title} onChange={e => update("title", e.target.value)} placeholder="e.g., Midterm Examination — Artificial Intelligence" required className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => update("description", e.target.value)} rows={3} className={inputCls} placeholder="Brief description of the exam..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Subject</label>
                  <select value={form.subjectId} onChange={e => update("subjectId", e.target.value)} className={inputCls}>
                    <option value="">Select Subject</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Status</label>
                  <select value={form.status} onChange={e => update("status", e.target.value)} className={inputCls}>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="active">Active</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Exam Settings */}
          <Card>
            <CardHeader><h3 className="font-semibold text-white">⚙️ Exam Settings</h3></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: "Total Marks *", key: "totalMarks", type: "number" },
                { label: "Passing Marks *", key: "passingMarks", type: "number" },
                { label: "Duration (minutes) *", key: "duration", type: "number" },
                { label: "Total Questions", key: "totalQuestions", type: "number" },
                { label: "Max Attempts", key: "maxAttempts", type: "number" },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">{f.label}</label>
                  <input type={f.type} value={(form as Record<string, unknown>)[f.key] as string} onChange={e => update(f.key, e.target.value)} required className={inputCls} min={f.key === "maxAttempts" ? 1 : 0} />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader><h3 className="font-semibold text-white">🕐 Schedule</h3></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Start Date & Time *</label>
                <input type="datetime-local" value={form.startDateTime} onChange={e => update("startDateTime", e.target.value)} required className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">End Date & Time *</label>
                <input type="datetime-local" value={form.endDateTime} onChange={e => update("endDateTime", e.target.value)} required className={inputCls} />
              </div>
            </CardContent>
          </Card>

          {/* Proctoring */}
          <Card>
            <CardHeader><h3 className="font-semibold text-white">🤖 Proctoring Settings</h3></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Proctoring Level</label>
                <select value={form.proctoringLevel} onChange={e => update("proctoringLevel", e.target.value)} className={inputCls}>
                  <option value="none">None — No proctoring</option>
                  <option value="basic">Basic — Tab & fullscreen monitoring</option>
                  <option value="standard">Standard — Camera + behavior analysis</option>
                  <option value="strict">Strict — Full AI proctoring</option>
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Toggle checked={form.tabSwitchTermination} onChange={v => update("tabSwitchTermination", v)} label="Tab Switch = Immediate Termination ⚠️" />
                <Toggle checked={form.requireCamera} onChange={v => update("requireCamera", v)} label="Require Camera" />
                <Toggle checked={form.requireMicrophone} onChange={v => update("requireMicrophone", v)} label="Require Microphone" />
                <Toggle checked={form.requireFullscreen} onChange={v => update("requireFullscreen", v)} label="Require Full Screen" />
                <Toggle checked={form.copyPasteProtection} onChange={v => update("copyPasteProtection", v)} label="Copy/Paste Protection" />
                <Toggle checked={form.shuffleQuestions} onChange={v => update("shuffleQuestions", v)} label="Shuffle Questions" />
                <Toggle checked={form.shuffleOptions} onChange={v => update("shuffleOptions", v)} label="Shuffle Options" />
                <Toggle checked={form.negativeMarking} onChange={v => update("negativeMarking", v)} label="Negative Marking" />
                <Toggle checked={form.showResultsToStudent} onChange={v => update("showResultsToStudent", v)} label="Show Results to Students" />
                <Toggle checked={form.showCorrectAnswers} onChange={v => update("showCorrectAnswers", v)} label="Show Correct Answers" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Screen Exit Action</label>
                <select value={form.fullscreenExitAction} onChange={e => update("fullscreenExitAction", e.target.value)} className={inputCls}>
                  <option value="warn">Warn student</option>
                  <option value="terminate">Terminate exam</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader><h3 className="font-semibold text-white">📝 Instructions</h3></CardHeader>
            <CardContent>
              <textarea value={form.instructions} onChange={e => update("instructions", e.target.value)} rows={5} className={inputCls} placeholder="Enter exam instructions for students..." />
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <button type="button" onClick={() => router.back()} className="px-6 py-2.5 border border-slate-600 text-slate-400 hover:text-white rounded-xl transition-all">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all">
              {loading ? "Creating..." : "Create Exam →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
