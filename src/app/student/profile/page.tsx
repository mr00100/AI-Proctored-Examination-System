import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { students, departments, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { redirect } from "next/navigation";
import { formatDateTime } from "@/lib/utils";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  const [student] = await db.select().from(students).where(eq(students.userId, session.userId)).limit(1);
  const dept = student?.departmentId
    ? (await db.select().from(departments).where(eq(departments.id, student.departmentId)).limit(1))[0]
    : null;

  return (
    <div>
      <TopBar title="My Profile" subtitle="Your academic profile and account details" />
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center text-3xl font-bold text-white">
                {session.firstName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{session.firstName} {session.lastName}</h2>
                <p className="text-slate-400">{session.email}</p>
                <span className="inline-block mt-1 px-3 py-0.5 bg-emerald-900/30 text-emerald-400 rounded-full text-xs font-semibold">
                  Student
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h3 className="font-semibold text-white">Academic Information</h3></CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Student ID", value: student?.studentId || "—" },
              { label: "Department", value: dept?.name || "—" },
              { label: "Semester", value: student?.semester ? `Semester ${student.semester}` : "—" },
              { label: "Section", value: student?.section || "—" },
              { label: "Enrollment Year", value: student?.enrollmentYear?.toString() || "—" },
            ].map(f => (
              <div key={f.label} className="flex justify-between py-2 border-b border-slate-700/50 last:border-0">
                <span className="text-slate-500 text-sm">{f.label}</span>
                <span className="text-white text-sm font-medium">{f.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h3 className="font-semibold text-white">Account Security</h3></CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Last Login", value: user?.lastLoginAt ? formatDateTime(user.lastLoginAt) : "—" },
              { label: "Total Logins", value: user?.loginCount?.toString() || "0" },
              { label: "Account Status", value: user?.status || "—" },
              { label: "Account Created", value: formatDateTime(user?.createdAt) },
            ].map(f => (
              <div key={f.label} className="flex justify-between py-2 border-b border-slate-700/50 last:border-0">
                <span className="text-slate-500 text-sm">{f.label}</span>
                <span className="text-white text-sm font-medium">{f.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-amber-800/30 bg-amber-900/5">
          <CardContent className="py-4">
            <p className="text-amber-400 font-semibold text-sm mb-2">⚠️ Exam Integrity Notice</p>
            <p className="text-slate-400 text-sm">
              Your exam sessions are monitored by AI proctoring. Any attempt to switch browser
              tabs or windows during an active examination will result in immediate termination
              of your attempt. Ensure a stable environment before starting any exam.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
