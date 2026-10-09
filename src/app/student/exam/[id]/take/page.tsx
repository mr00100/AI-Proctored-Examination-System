"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { formatTime, getRiskLevel } from "@/lib/utils";

interface Question {
  id: number;
  questionText: string;
  questionType: string;
  marks: string;
  options: { id: number; optionText: string }[];
}

interface Attempt {
  id: number;
  status: string;
  serverTimeRemaining: number;
  riskScore: number;
  terminationReason?: string;
  questionOrder: number[];
}

interface Exam {
  title: string;
  duration: number;
  totalMarks: string;
  totalQuestions: number;
  tabSwitchTermination: boolean;
  requireFullscreen: boolean;
  copyPasteProtection: boolean;
  instructions?: string;
}

interface Answer {
  questionId: number;
  selectedOptionId?: number;
  textAnswer?: string;
}

export default function TakeExamPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.id as string;

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [terminated, setTerminated] = useState(false);
  const [terminationMsg, setTerminationMsg] = useState("");
  const [riskScore, setRiskScore] = useState(0);
  const [events, setEvents] = useState<{ type: string; time: Date; msg: string }[]>([]);
  const [warningMsg, setWarningMsg] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const attemptRef = useRef<Attempt | null>(null);
  const terminatedRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const examContainerRef = useRef<HTMLDivElement>(null);

  // Initialize exam
  useEffect(() => {
    initExam();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [examId]);

  const initExam = async () => {
    try {
      // Start or resume attempt
      const attemptRes = await fetch(`/api/exams/${examId}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!attemptRes.ok) {
        const data = await attemptRes.json();
        if (data.attemptStatus === "terminated") {
          setTerminated(true);
          setTerminationMsg("RE-ATTEMPT NOT AVAILABLE\n\nYour examination attempt has been terminated.");
          return;
        }
        router.push(`/student/exams`);
        return;
      }

      const attemptData = await attemptRes.json();
      const att = attemptData.attempt;

      if (att.status === "terminated") {
        setTerminated(true);
        setTerminationMsg("EXAM TERMINATED\n\nYour examination attempt has been terminated because the examination window was left.\n\nThis attempt cannot be resumed.\n\nIf you believe this happened because of a technical issue, contact your instructor.");
        return;
      }

      // Get exam details with questions
      const examRes = await fetch(`/api/attempts/${att.id}`);
      const examData = await examRes.json();

      setAttempt(att);
      attemptRef.current = att;
      setExam(examData.exam);
      setQuestions(examData.questions || []);
      setRiskScore(att.riskScore || 0);

      // Load existing answers
      const existingAnswers: Record<number, Answer> = {};
      for (const a of (examData.answers || [])) {
        existingAnswers[a.questionId] = {
          questionId: a.questionId,
          selectedOptionId: a.selectedOptionId || undefined,
          textAnswer: a.textAnswer || undefined,
        };
      }
      setAnswers(existingAnswers);

      // Set timer
      const timeRemaining = att.serverTimeRemaining || (examData.exam?.duration * 60) || 3600;
      setTimeLeft(timeRemaining);

      setLoading(false);

      // Start timer
      startTimer(timeRemaining, att.id);

      // Start heartbeat
      heartbeatRef.current = setInterval(() => {
        sendHeartbeat(att.id);
      }, 15000);

      // Log start event
      await logEvent(att.id, "exam_started", "Exam attempt initialized");

      // Bind proctoring events
      setupProctoringListeners(att.id, examData.exam);

      // Enter fullscreen if required
      if (examData.exam?.requireFullscreen) {
        requestFullscreen();
      }

    } catch (err) {
      console.error("Init exam error:", err);
      router.push("/student/exams");
    }
  };

  const startTimer = (seconds: number, attemptId: number) => {
    let remaining = seconds;
    setTimeLeft(remaining);

    timerRef.current = setInterval(async () => {
      remaining--;
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        await handleTermination("time_expired");
      }

      // Auto-save every 60 seconds
      if (remaining % 60 === 0) {
        sendHeartbeat(attemptId);
      }
    }, 1000);
  };

  const sendHeartbeat = async (attemptId: number) => {
    if (terminatedRef.current) return;
    try {
      await fetch(`/api/attempts/${attemptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "heartbeat", timeRemaining: timeLeft }),
      });
    } catch {}
  };

  const logEvent = async (attemptId: number, eventType: string, description: string, confidenceScore = 95) => {
    if (terminatedRef.current && eventType !== "exam_terminated") return;
    try {
      const res = await fetch(`/api/attempts/${attemptId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType, description, confidenceScore }),
      });
      const data = await res.json();
      if (data.riskScore !== undefined) setRiskScore(data.riskScore);
      if (data.terminated) {
        await handleTermination("tab_switch");
      }
      setEvents(prev => [{ type: eventType, time: new Date(), msg: description }, ...prev.slice(0, 19)]);
    } catch {}
  };

  // ─── CRITICAL: Tab/Window Switch Handler ─────────────────────────────────────
  const setupProctoringListeners = useCallback((attemptId: number, examConfig: Exam) => {
    // VISIBILITY CHANGE — most reliable cross-browser method
    const handleVisibilityChange = async () => {
      if (document.hidden && !terminatedRef.current && examConfig?.tabSwitchTermination) {
        console.log("🚨 Tab switch detected!");
        await handleTermination("tab_switch");
      }
    };

    // WINDOW BLUR
    const handleWindowBlur = async () => {
      if (!terminatedRef.current && examConfig?.tabSwitchTermination) {
        // Small delay to distinguish from focus-related events
        setTimeout(async () => {
          if (document.hidden && !terminatedRef.current) {
            await handleTermination("tab_switch");
          }
        }, 100);
      }
      if (!terminatedRef.current) {
        await logEvent(attemptId, "window_blur", "Browser window lost focus");
        setWarningMsg("⚠️ Window blur detected. Do not leave the exam window!");
        setTimeout(() => setWarningMsg(""), 3000);
      }
    };

    // FULLSCREEN EXIT
    const handleFullscreenChange = async () => {
      if (!document.fullscreenElement && !terminatedRef.current) {
        setIsFullscreen(false);
        await logEvent(attemptId, "fullscreen_exit", "Exited full screen mode");
        setWarningMsg("⚠️ Please return to full screen mode!");
        setTimeout(() => setWarningMsg(""), 5000);
      } else {
        setIsFullscreen(true);
      }
    };

    // COPY PROTECTION
    const handleCopy = async (e: ClipboardEvent) => {
      if (examConfig?.copyPasteProtection) {
        e.preventDefault();
        await logEvent(attemptId, "copy_attempt", "Copy attempt detected");
        setWarningMsg("⚠️ Copy is disabled during the examination.");
        setTimeout(() => setWarningMsg(""), 3000);
      }
    };

    const handlePaste = async (e: ClipboardEvent) => {
      if (examConfig?.copyPasteProtection) {
        e.preventDefault();
        await logEvent(attemptId, "paste_attempt", "Paste attempt detected");
        setWarningMsg("⚠️ Paste is disabled during the examination.");
        setTimeout(() => setWarningMsg(""), 3000);
      }
    };

    const handleContextMenu = async (e: MouseEvent) => {
      if (examConfig?.copyPasteProtection) {
        e.preventDefault();
        await logEvent(attemptId, "right_click", "Right-click attempt detected");
      }
    };

    const handleKeyDown = async (e: KeyboardEvent) => {
      const blocked = [
        e.ctrlKey && e.key === "c",
        e.ctrlKey && e.key === "v",
        e.ctrlKey && e.key === "a",
        e.key === "F12",
        e.ctrlKey && e.shiftKey && e.key === "I",
        e.altKey && e.key === "Tab",
        e.metaKey,
      ];
      if (blocked.some(Boolean) && examConfig?.copyPasteProtection) {
        e.preventDefault();
        await logEvent(attemptId, "keyboard_shortcut", `Blocked keyboard shortcut: ${e.key}`);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleTermination = async (reason: string) => {
    if (terminatedRef.current) return;
    terminatedRef.current = true;

    if (timerRef.current) clearInterval(timerRef.current);
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);

    // Save current answers first
    await saveCurrentAnswer(true);

    const att = attemptRef.current;
    if (!att) {
      setTerminated(true);
      setTerminationMsg("EXAM TERMINATED\n\nYour examination attempt has been terminated because the examination window was left.\n\nThis attempt cannot be resumed.\n\nIf you believe this happened because of a technical issue, contact your instructor.");
      return;
    }

    // Terminate on backend
    try {
      await fetch(`/api/attempts/${att.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "terminate", reason }),
      });
    } catch {}

    setTerminated(true);
    setTerminationMsg("EXAM TERMINATED\n\nYour examination attempt has been terminated because the examination window was left.\n\nThis attempt cannot be resumed.\n\nIf you believe this happened because of a technical issue, contact your instructor.");

    // Exit fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  };

  const requestFullscreen = async () => {
    try {
      await examContainerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } catch {}
  };

  const saveCurrentAnswer = async (force = false) => {
    if (!attemptRef.current || terminatedRef.current) return;
    const q = questions[currentQ];
    if (!q) return;
    const ans = answers[q.id];
    if (!ans && !force) return;

    setSaving(true);
    try {
      await fetch(`/api/attempts/${attemptRef.current.id}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: q.id,
          selectedOptionId: ans?.selectedOptionId,
          textAnswer: ans?.textAnswer,
        }),
      });
    } catch {}
    setSaving(false);
  };

  const handleOptionSelect = async (questionId: number, optionId: number) => {
    if (terminated || !attemptRef.current) return;
    const newAnswers = { ...answers, [questionId]: { questionId, selectedOptionId: optionId } };
    setAnswers(newAnswers);

    // Save immediately
    try {
      await fetch(`/api/attempts/${attemptRef.current.id}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, selectedOptionId: optionId }),
      });
    } catch {}
  };

  const handleTextAnswer = (questionId: number, text: string) => {
    if (terminated) return;
    setAnswers(prev => ({ ...prev, [questionId]: { questionId, textAnswer: text } }));
  };

  const handleTextBlur = async () => {
    await saveCurrentAnswer();
  };

  const submitExam = async () => {
    if (!attemptRef.current || terminated || submitted) return;
    if (!confirm("Are you sure you want to submit your exam? This action cannot be undone.")) return;

    setSubmitted(true);
    if (timerRef.current) clearInterval(timerRef.current);
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);

    // Save all answers
    const att = attemptRef.current;
    for (const [qId, ans] of Object.entries(answers)) {
      try {
        await fetch(`/api/attempts/${att.id}/answers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId: parseInt(qId),
            selectedOptionId: ans.selectedOptionId,
            textAnswer: ans.textAnswer,
          }),
        });
      } catch {}
    }

    // Complete attempt
    await fetch(`/api/attempts/${att.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete" }),
    });

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    router.push(`/student/results/${att.id}`);
  };

  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;
  const riskInfo = getRiskLevel(riskScore);

  // ─── Termination Screen ───────────────────────────────────────────────────────
  if (terminated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-lg w-full">
          <div className="bg-red-900/20 border-2 border-red-700 rounded-2xl p-8 text-center animate-fadeIn">
            <div className="text-6xl mb-4">🚫</div>
            <h1 className="text-3xl font-bold text-red-400 mb-4">EXAM TERMINATED</h1>
            <div className="border-t border-red-800/50 my-4" />
            <div className="text-slate-300 text-sm leading-relaxed space-y-2 text-left bg-slate-900/50 rounded-xl p-4">
              <p>Your examination attempt has been terminated because the examination window was left.</p>
              <br />
              <p>This attempt <strong className="text-red-400">cannot be resumed</strong>.</p>
              <br />
              <p className="text-slate-400">If you believe this happened because of a technical issue, contact your instructor.</p>
            </div>
            <div className="mt-6 space-y-3">
              <button
                onClick={() => router.push("/student/exams")}
                className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all"
              >
                ← Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-5xl mb-4">⟳</div>
          <p className="text-slate-400">Loading examination...</p>
          <p className="text-slate-600 text-sm mt-2">Please wait, do not close this window</p>
        </div>
      </div>
    );
  }

  const q = questions[currentQ];

  return (
    <div
      ref={examContainerRef}
      className="min-h-screen bg-slate-900 flex flex-col select-none"
      style={{ userSelect: "none" }}
    >
      {/* Warning Banner */}
      {warningMsg && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-900 border-b-2 border-red-600 px-6 py-3 text-center animate-fadeIn">
          <p className="text-red-200 font-semibold">{warningMsg}</p>
        </div>
      )}

      {/* Exam Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs text-red-400 font-semibold uppercase tracking-wider">Live Exam</span>
          </div>
          <div>
            <h1 className="font-semibold text-white text-sm">{exam?.title}</h1>
            <p className="text-xs text-slate-500">Question {currentQ + 1} of {questions.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Risk Score */}
          <div className="text-center">
            <p className="text-xs text-slate-500">Risk Score</p>
            <p className={`font-bold text-sm ${riskInfo.color}`}>{riskScore}% {riskInfo.level}</p>
          </div>

          {/* Timer */}
          <div className={`text-center px-4 py-1.5 rounded-lg ${timeLeft < 300 ? "bg-red-900/50 border border-red-700/50" : "bg-slate-800"}`}>
            <p className="text-xs text-slate-500">Time Remaining</p>
            <p className={`font-mono font-bold text-lg ${timeLeft < 300 ? "text-red-400 animate-pulse" : "text-white"}`}>
              {formatTime(timeLeft)}
            </p>
          </div>

          {/* Fullscreen */}
          {exam?.requireFullscreen && !isFullscreen && (
            <button
              onClick={requestFullscreen}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium"
            >
              🖥️ Enter Fullscreen
            </button>
          )}

          {saving && <span className="text-xs text-slate-500 animate-pulse">💾 Saving...</span>}
        </div>
      </header>

      <div className="flex flex-1">
        {/* Question Navigation Panel */}
        <aside className="w-64 bg-slate-800/50 border-r border-slate-700/50 p-4 flex flex-col">
          <div className="mb-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Question Navigator</p>
            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => {
                    saveCurrentAnswer();
                    setCurrentQ(i);
                  }}
                  className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${
                    i === currentQ
                      ? "bg-indigo-600 text-white"
                      : answers[q.id]
                      ? "bg-emerald-900/50 text-emerald-400 border border-emerald-700/50"
                      : "bg-slate-700/50 text-slate-500 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-emerald-900/50 border border-emerald-700/50 rounded" />
              <span className="text-slate-400">Answered ({answeredCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-slate-700/50 rounded" />
              <span className="text-slate-400">Unanswered ({unansweredCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-indigo-600 rounded" />
              <span className="text-slate-400">Current</span>
            </div>
          </div>

          <div className="mt-auto space-y-3">
            {/* Recent Events */}
            {events.length > 0 && (
              <div className="bg-slate-900/50 rounded-xl p-3">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Recent Events</p>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {events.slice(0, 5).map((e, i) => (
                    <p key={i} className="text-xs text-slate-500 truncate">
                      {e.type.replace(/_/g, " ")}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={submitExam}
              disabled={submitted}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all text-sm"
            >
              {submitted ? "Submitting..." : "✓ Submit Exam"}
            </button>
          </div>
        </aside>

        {/* Main Question Area */}
        <main className="flex-1 p-8 overflow-y-auto">
          {q && (
            <div className="max-w-3xl mx-auto animate-fadeIn" key={q.id}>
              {/* Question Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-indigo-900/50 border border-indigo-700/50 text-indigo-400 rounded-full text-sm font-bold">
                    Q{currentQ + 1}
                  </span>
                  <span className="px-2 py-1 bg-slate-700/50 text-slate-400 rounded text-xs">
                    {q.questionType.replace("_", " ").toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-semibold text-amber-400">
                  {q.marks} {parseFloat(q.marks) === 1 ? "mark" : "marks"}
                </span>
              </div>

              {/* Question Text */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-6">
                <p className="text-white text-lg leading-relaxed">{q.questionText}</p>
              </div>

              {/* Answer Area */}
              {(q.questionType === "mcq" || q.questionType === "true_false") && (
                <div className="space-y-3">
                  {q.options.map((opt, oi) => {
                    const isSelected = answers[q.id]?.selectedOptionId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleOptionSelect(q.id, opt.id)}
                        className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-900/30 text-white"
                            : "border-slate-700/50 bg-slate-800/30 text-slate-300 hover:border-indigo-600/50 hover:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                            isSelected ? "border-indigo-400 bg-indigo-500" : "border-slate-600"
                          }`}>
                            {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                          </div>
                          <span className="font-medium text-xs text-slate-500 w-5">
                            {String.fromCharCode(65 + oi)}.
                          </span>
                          <span>{opt.optionText}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {(q.questionType === "short_answer" || q.questionType === "numerical") && (
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Your Answer:</label>
                  <input
                    type={q.questionType === "numerical" ? "number" : "text"}
                    value={answers[q.id]?.textAnswer || ""}
                    onChange={e => handleTextAnswer(q.id, e.target.value)}
                    onBlur={handleTextBlur}
                    placeholder="Type your answer here..."
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              {(q.questionType === "long_answer" || q.questionType === "coding") && (
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Your Answer:</label>
                  <textarea
                    value={answers[q.id]?.textAnswer || ""}
                    onChange={e => handleTextAnswer(q.id, e.target.value)}
                    onBlur={handleTextBlur}
                    placeholder={q.questionType === "coding" ? "Write your code here..." : "Type your detailed answer here..."}
                    rows={q.questionType === "coding" ? 12 : 6}
                    className={`w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-vertical ${q.questionType === "coding" ? "font-mono text-sm" : ""}`}
                  />
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between mt-8">
                <button
                  onClick={() => { saveCurrentAnswer(); setCurrentQ(Math.max(0, currentQ - 1)); }}
                  disabled={currentQ === 0}
                  className="px-6 py-2.5 border border-slate-600 text-slate-400 rounded-xl hover:border-slate-400 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>
                <div className="flex items-center gap-2">
                  {answers[q.id] && (
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                      <span>✓</span> Answered
                    </span>
                  )}
                </div>
                <button
                  onClick={() => { saveCurrentAnswer(); setCurrentQ(Math.min(questions.length - 1, currentQ + 1)); }}
                  disabled={currentQ === questions.length - 1}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
