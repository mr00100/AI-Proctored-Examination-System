import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "student") redirect("/student");
  if (session.role === "super_admin") redirect("/admin");

  return (
    <div className="flex min-h-screen bg-slate-900">
      <Sidebar role="teacher" userName={`${session.firstName} ${session.lastName}`} />
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
