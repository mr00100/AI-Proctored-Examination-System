import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "student") {
    if (session.role === "teacher") redirect("/teacher");
    if (session.role === "super_admin") redirect("/admin");
  }

  return (
    <div className="flex min-h-screen bg-slate-900">
      <Sidebar
        role="student"
        userName={`${session.firstName} ${session.lastName}`}
      />
      <main className="flex-1 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
