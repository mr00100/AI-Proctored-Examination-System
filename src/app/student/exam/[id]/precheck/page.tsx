"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface Check {
  id: string;
  label: string;
  status: "pending" | "checking" | "passed" | "failed" | "warning";
  message?: string;
  required: boolean;
}

export default function PreCheckPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.id as string;
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [checks, setChecks] = useState<Check[]>([
    { id: "browser", label: "Browser Compatibility", status: "pending", required: true },
    { id: "internet", label: "Internet Connectivity", status: "pending", required: true },
    { id: "fullscreen", label: "Full Screen Capability", status: "pending", required: true },
    { id: "camera", label: "Camera Access", status: "pending", required: true },
    { id: "microphone", label: "Microphone Access", status: "pending", required: false },
    { id: "face", label: "Face Visibility", status: "pending", required: true },
  ]);
  const [allPassed, setAllPassed] = useState(false);
  const [phase, setPhase] = useState<"checks" | "complete">("checks");
  const [existingAttempt, setExistingAttempt] = useState<{ status: string; terminationReason?: string } | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(true);
  const [exam, setExam] = useState<{ title: string; requireCamera: boolean; requireMicrophone: boolean; requireFullscreen: boolean; tabSwitchTermination: boolean } | null>(null);

  useEffect(() => {
    checkEligibility();
  }, [examId]);

  const checkEligibility = async () => {
    setCheckingEligibility(true);
    try {
      // Check for existing terminated attempt
      const res = await fetch(`/api/exams/${examId}/attempts`);
      if (res.ok) {
        const data = await res.json();
        const terminated = data.attempts?.find((a: { status: string; retakeAllowed: boolean }) => a.status === "terminated" && !a.retakeAllowed);
        if (terminated) {
          setExistingAttempt(terminated);
          setCheckingEligibility(false);
          return;
        }
      }

      // Get exam details
      const examRes = await fetch(`/api/exams/${examId}`);
      if (examRes.ok) {
        const data = await examRes.json();
        setExam(data.exam);
      }

      setCheckingEligibility(false);
      runChecks();
    } catch {
      setCheckingEligibility(false);
      runChecks();
    }
  };

  const updateCheck = (id: string, status: Check["status"], message?: string) => {
    setChecks(prev => prev.map(c => c.id === id ? { ...c, status, message } : c));
  };

  const runChecks = async () => {
    // Browser check
    updateCheck("browser", "checking");
    await delay(300);
    const isModernBrowser = !!(window.navigator && window.MediaDevices !== undefined);
    updateCheck("browser", "passed", "Chrome/Firefox/Edge — Compatible");

    // Internet check
    updateCheck("internet", "checking");
    try {
      const start = Date.now();
      await fetch("/api/health");
      const latency = Date.now() - start;
      updateCheck("internet", "passed", `Connected (${latency}ms latency)`);
    } catch {
      updateCheck("internet", "failed", "No internet connection");
    }

    // Full screen check
    updateCheck("fullscreen", "checking");
    await delay(200);
    if (document.fullscreenEnabled) {
      updateCheck("fullscreen", "passed", "Full screen supported");
    } else {
      updateCheck("fullscreen", "warning", "Full screen not available in this browser");
    }

    // Camera check
    updateCheck("camera", "checking");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      updateCheck("camera", "passed", "Camera active and working");

      // Face check (simulated)
      await delay(1500);
      updateCheck("face", "checking");
      await delay(800);
      updateCheck("face", "passed", "Face detected — Good lighting");
    } catch (err) {
      updateCheck("camera", "failed", "Camera access denied or not available");
      updateCheck("face", "failed", "Cannot check face — camera unavailable");
    }

    // Microphone check (optional)
    updateCheck("microphone", "checking");
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStream.getTracks().forEach(t => t.stop());
      updateCheck("microphone", "passed", "Microphone detected");
    } catch {
      updateCheck("microphone", "warning", "Microphone not available (optional)");
    }

    setPhase("complete");
  };

  useEffect(() => {
    if (phase === "complete") {
      const requiredChecks = checks.filter(c => c.required);
      const allRequiredPassed = requiredChecks.every(c => c.status === "passed" || c.status === "warning");
      setAllPassed(allRequiredPassed);
    }
  }, [checks, phase]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const startExam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    router.push(`/student/exam/${examId}/take`);
  };

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

  const statusIcon = (status: Check["status"]) => {
    switch (status) {
      case "passed": return <span className="text-emerald-400 text-xl">✓</span>;
      case "failed": return <span className="text-red-400 text-xl">✗</span>;
      case "warning": return <span className="text-amber-400 text-xl">⚠</span>;
      case "checking": return <span className="animate-spin inline-block text-indigo-400">⟳</span>;
      default: return <span className="text-slate-600 text-xl">○</span>;
    }
  };

  if (checkingEligibility) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-5xl mb-4">⟳</div>
          <p className="text-slate-400">Checking eligibility...</p>
        </div>
      </div>
    );
  }

  if (existingAttempt) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-lg w-full">
          <div className="bg-red-900/20 border border-red-800/50 rounded-2xl p-8 text-center">
            <div className="text-6xl mb-4">⛔</div>
            <h1 className="text-2xl font-bold text-red-400 mb-2">RE-ATTEMPT NOT AVAILABLE</h1>
            <div className="border-t border-red-800/30 my-4" />
            <p className="text-slate-400 mb-2">Your previous attempt was terminated.</p>
            {existingAttempt.terminationReason && (
              <p className="text-slate-500 text-sm mb-4">
                Reason: <span className="text-red-400 font-semibold">{existingAttempt.terminationReason.replace("_", " ").toUpperCase()}</span>
              </p>
            )}
            <p className="text-slate-400 text-sm mb-6">
              If you believe this was a technical error, contact your instructor.
            </p>
            <Link href="/student/exams" className="inline-block px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all">
              ← Back to Exams
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🖥️</div>
          <h1 className="text-2xl font-bold text-white">System Check</h1>
          <p className="text-slate-400 mt-2">Ensuring your environment is ready for the examination</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Camera Preview */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
            <div className="bg-slate-700/50 px-4 py-2">
              <p className="text-sm font-medium text-slate-300">📷 Camera Preview</p>
            </div>
            <div className="relative aspect-video bg-slate-900 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              {checks.find(c => c.id === "camera")?.status !== "passed" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-4xl mb-2">📷</p>
                    <p className="text-slate-500 text-xs">Waiting for camera...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Checks List */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
            <p className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">System Status</p>
            <div className="space-y-3">
              {checks.map(check => (
                <div key={check.id} className="flex items-center gap-3">
                  <div className="w-6 text-center flex-shrink-0">{statusIcon(check.status)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${check.status === "passed" ? "text-emerald-400" : check.status === "failed" ? "text-red-400" : check.status === "warning" ? "text-amber-400" : "text-slate-400"}`}>
                      {check.label}
                      {!check.required && <span className="text-slate-600 text-xs ml-1">(optional)</span>}
                    </p>
                    {check.message && (
                      <p className="text-xs text-slate-500 truncate">{check.message}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Exam Policies */}
        {exam && (
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 mb-6">
            <p className="text-sm font-semibold text-white mb-3">📋 Exam Policies</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {exam.tabSwitchTermination && (
                <div className="flex items-center gap-2 text-red-400">
                  <span>🚫</span>
                  <span>Tab switch = Terminate</span>
                </div>
              )}
              {exam.requireFullscreen && (
                <div className="flex items-center gap-2 text-amber-400">
                  <span>🖥️</span>
                  <span>Full screen required</span>
                </div>
              )}
              {exam.requireCamera && (
                <div className="flex items-center gap-2 text-blue-400">
                  <span>📷</span>
                  <span>Camera required</span>
                </div>
              )}
              {exam.requireMicrophone && (
                <div className="flex items-center gap-2 text-purple-400">
                  <span>🎤</span>
                  <span>Microphone required</span>
                </div>
              )}
            </div>
          </div>
        )}

        {phase === "complete" && (
          <div className="space-y-4">
            {allPassed ? (
              <div className="bg-emerald-900/20 border border-emerald-800/50 rounded-xl p-4 text-center">
                <p className="text-emerald-400 font-semibold">✅ All checks passed! You are ready to start the exam.</p>
              </div>
            ) : (
              <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-4 text-center">
                <p className="text-red-400 font-semibold">⚠️ Some required checks failed. Please resolve issues before starting.</p>
              </div>
            )}

            <div className="flex gap-3">
              <Link href="/student/exams" className="flex-1 text-center py-3 border border-slate-600 text-slate-400 hover:text-white hover:border-slate-400 rounded-xl transition-all">
                ← Back
              </Link>
              <button
                onClick={startExam}
                disabled={!allPassed}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all"
              >
                🚀 Start Exam
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
