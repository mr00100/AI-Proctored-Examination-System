import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { exams, subjects, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function AdminExamsPage() {
  const session = await getSession();
  if (!session || session.role !== "super_admin") redirect("/admin");

  const allExams = await db
    .select({
      id: exams.id,
      title: exams.title,
      status: exams.status,
      duration: exams.duration,
      totalQuestions: exams.totalQuestions,
      startDateTime: exams.startDateTime,
      endDateTime: exams.endDateTime,
      subjectName: subjects.name,
      teacherFirst: users.firstName,
      teacherLast: users.lastName,
      createdAt: exams.createdAt,
    })
    .from(exams)
    .leftJoin(subjects, eq(exams.subjectId, subjects.id))
    .leftJoin(users, eq(exams.createdBy, users.id))
    .orderBy(desc(exams.createdAt));

  return (
    <div>
      <TopBar title="All Exams" subtitle="System-wide examination overview" />
      <div className="p-6 space-y-4">
        <p className="text-slate-400 text-sm">{allExams.length} total exams</p>
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  {["Title", "Teacher", "Subject", "Status", "Duration", "Questions", "Start", "End"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {allExams.map(e => (
                  <tr key={e.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-white">{e.title}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{e.teacherFirst} {e.teacherLast}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{e.subjectName || "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                    <td className="px-4 py-3 text-sm text-slate-400">{e.duration}m</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{e.totalQuestions}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{formatDateTime(e.startDateTime)}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{formatDateTime(e.endDateTime)}</td>
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
