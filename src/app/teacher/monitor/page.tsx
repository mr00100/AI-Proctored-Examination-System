"use client";
import { useState, useEffect } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { formatTime, getRiskLevel } from "@/lib/utils";

interface AttemptCard {
  attemptId: number;
  status: string;
  startedAt: string;
  riskScore: number;
  serverTimeRemaining: number;
  terminationReason?: string;
  terminatedAt?: string;
  firstName: string;
  lastName: string;
  studentNum: string;
  examTitle: string;
  examId: number;
  latestEvent?: {
    eventType: string;
    severity: string;
    description: string;
    timestamp: string;
  };
}

export default function LiveMonitorPage() {
  const [attempts, setAttempts] = useState<AttemptCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/dashboard/live");
      if (res.ok) {
        const data = await res.json();
        setAttempts(data.attempts || []);
        setLastRefresh(new Date());
      }
    } catch {}
    setLoading(false);
  };

  const filtered = attempts.filter(a => {
    if (filter === "active") return a.status === "in_progress";
    if (filter === "terminated") return a.status === "terminated";
    if (filter === "critical") return (a.riskScore || 0) >= 76;
    return true;
  });

  const stats = {
    total: attempts.length,
    active: attempts.filter(a => a.status === "in_progress").length,
    completed: attempts.filter(a => a.status === "completed").length,
    terminated: attempts.filter(a => a.status === "terminated").length,
    critical: attempts.filter(a => (a.riskScore || 0) >= 76).length,
  };

  const getRiskBg = (score: number) => {
    if (score <= 25) return "border-emerald-800/30 bg-emerald-900/5";
    if (score <= 50) return "border-yellow-800/30 bg-yellow-900/5";
    if (score <= 75) return "border-orange-800/30 bg-orange-900/5";
    return "border-red-800/50 bg-red-900/10";
  };

  const severityColor: Record<string, string> = {
    critical: "text-red-400 bg-red-900/30",
    high: "text-orange-400 bg-orange-900/30",
    medium: "text-yellow-400 bg-yellow-900/30",
    low: "text-green-400 bg-green-900/30",
    info: "text-blue-400 bg-blue-900/30",
  };

  return (
    <div>
      <TopBar title="Live Exam Monitor" subtitle="Real-time student monitoring dashboard" />
      <div className="p-6 space-y-6">
        {/* Live indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-400 text-sm font-semibold">LIVE MONITORING</span>
            <span className="text-slate-500 text-xs">Auto-refreshes every 10 seconds</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Last: {lastRefresh.toLocaleTimeString()}</span>
            <button onClick={fetchData} className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-all">
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Total Students", value: stats.total, color: "text-blue-400" },
            { label: "Active", value: stats.active, color: "text-amber-400" },
            { label: "Completed", value: stats.completed, color: "text-emerald-400" },
            { label: "Terminated", value: stats.terminated, color: "text-red-400" },
            { label: "Critical Risk", value: stats.critical, color: "text-red-500" },
          ].map(s => (
            <Card key={s.label} className={s.label === "Terminated" && stats.terminated > 0 ? "border-red-800/30 bg-red-900/10" : ""}>
              <CardContent className="py-4 text-center">
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {["all", "active", "terminated", "critical"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${
                filter === f ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {f === "all" ? `All (${stats.total})` : f === "active" ? `Active (${stats.active})` : f === "terminated" ? `Terminated (${stats.terminated})` : `Critical (${stats.critical})`}
            </button>
          ))}
        </div>

        {/* Student Cards Grid */}
        {loading ? (
          <div className="text-center py-20 text-slate-500">Loading live data...</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="text-5xl mb-4">👥</div>
              <p className="text-slate-400">No active students</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(attempt => {
              const risk = getRiskLevel(attempt.riskScore || 0);
              return (
                <div key={attempt.attemptId} className={`border rounded-xl p-4 ${getRiskBg(attempt.riskScore || 0)} transition-all`}>
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-white">{attempt.firstName} {attempt.lastName}</h4>
                      <p className="text-xs text-slate-500">{attempt.studentNum}</p>
                    </div>
                    <StatusBadge status={attempt.status} />
                  </div>

                  {/* Exam title */}
                  <p className="text-xs text-slate-400 mb-3 line-clamp-1">{attempt.examTitle}</p>

                  {/* Risk Score */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          (attempt.riskScore || 0) <= 25 ? "bg-emerald-500" :
                          (attempt.riskScore || 0) <= 50 ? "bg-yellow-500" :
                          (attempt.riskScore || 0) <= 75 ? "bg-orange-500" : "bg-red-500"
                        }`}
                        style={{ width: `${Math.min(100, attempt.riskScore || 0)}%` }}
                      />
                    </div>
                    <span className={`text-sm font-bold ${risk.color}`}>{attempt.riskScore || 0}%</span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-slate-900/50 rounded-lg p-2 text-center">
                      <p className="text-slate-500 text-xs">Risk Level</p>
                      <p className={`text-xs font-bold ${risk.color}`}>{risk.level}</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-2 text-center">
                      <p className="text-slate-500 text-xs">Time Left</p>
                      <p className={`text-xs font-mono font-bold ${(attempt.serverTimeRemaining || 0) < 300 ? "text-red-400" : "text-white"}`}>
                        {attempt.status === "in_progress" ? formatTime(attempt.serverTimeRemaining || 0) : "—"}
                      </p>
                    </div>
                  </div>

                  {/* Latest Event */}
                  {attempt.latestEvent && (
                    <div className={`rounded-lg px-3 py-2 text-xs mb-3 ${severityColor[attempt.latestEvent.severity] || "bg-slate-700/50 text-slate-400"}`}>
                      <p className="font-semibold">{attempt.latestEvent.eventType.replace(/_/g, " ")}</p>
                      <p className="text-slate-400 mt-0.5">{attempt.latestEvent.description}</p>
                    </div>
                  )}

                  {attempt.status === "terminated" && (
                    <div className="bg-red-900/30 border border-red-700/50 rounded-lg px-3 py-2 text-xs text-red-400 mb-3">
                      <p className="font-bold">⚫ TERMINATED</p>
                      <p className="text-red-500">{attempt.terminationReason?.replace("_", " ")}</p>
                    </div>
                  )}

                  <a href={`/teacher/incidents/attempt/${attempt.attemptId}`}
                    className="block w-full text-center py-1.5 text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-800/50 rounded-lg hover:bg-indigo-900/20 transition-all">
                    View Timeline →
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
