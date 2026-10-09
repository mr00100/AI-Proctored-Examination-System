"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OverrideButton({ attemptId }: { attemptId: number }) {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [note, setNote] = useState("");
  const router = useRouter();

  const handleOverride = async () => {
    if (!note.trim()) return;
    setLoading(true);
    try {
      // Allow retake
      await fetch(`/api/attempts/${attemptId}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      setShowModal(false);
      router.refresh();
    } catch {}
    setLoading(false);
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-medium transition-all"
      >
        ⚠️ Override & Allow Retake
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-bold text-white mb-2">Override Termination</h3>
            <p className="text-slate-400 text-sm mb-4">
              This will allow the student to re-attempt the exam. This action is logged.
            </p>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Enter override reason (required)..."
              rows={3}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 border border-slate-600 text-slate-400 hover:text-white rounded-xl transition-all text-sm">
                Cancel
              </button>
              <button onClick={handleOverride} disabled={loading || !note.trim()}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl transition-all text-sm font-medium">
                {loading ? "Processing..." : "Confirm Override"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
