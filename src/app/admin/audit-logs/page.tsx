import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { formatDateTime } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function AuditLogsPage() {
  const session = await getSession();
  if (!session || session.role !== "super_admin") redirect("/admin");

  const logs = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      role: auditLogs.role,
      target: auditLogs.target,
      targetId: auditLogs.targetId,
      metadata: auditLogs.metadata,
      ipAddress: auditLogs.ipAddress,
      timestamp: auditLogs.timestamp,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .orderBy(desc(auditLogs.timestamp))
    .limit(200);

  const actionColors: Record<string, string> = {
    exam_started: "text-blue-400",
    exam_completed: "text-emerald-400",
    exam_terminated: "text-red-400",
    tab_switch: "text-red-400",
    teacher_override: "text-amber-400",
    login: "text-slate-400",
    logout: "text-slate-400",
  };

  return (
    <div>
      <TopBar title="Audit Logs" subtitle="System activity and security audit trail" />
      <div className="p-6 space-y-6">
        <div className="bg-blue-900/20 border border-blue-800/50 rounded-xl p-4 text-sm text-blue-400">
          📜 Showing last 200 audit records. All critical actions are logged automatically.
        </div>
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  {["Timestamp", "User", "Role", "Action", "Target", "IP"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {logs.map(log => (
                  <tr key={log.id} className={`hover:bg-slate-800/30 transition-colors ${log.action === "exam_terminated" ? "bg-red-900/5" : ""}`}>
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono whitespace-nowrap">{formatDateTime(log.timestamp)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-white">{log.firstName && log.lastName ? `${log.firstName} ${log.lastName}` : "System"}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 capitalize">{log.role?.replace("_", " ")}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${actionColors[log.action] || "text-slate-300"}`}>
                        {log.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{log.target}{log.targetId ? ` #${log.targetId}` : ""}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 font-mono">{log.ipAddress || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
