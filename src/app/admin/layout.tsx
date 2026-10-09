import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "super_admin") {
    if (session.role === "teacher") redirect("/teacher");
    if (session.role === "student") redirect("/student");
  }

  return (
    <div className="flex min-h-screen bg-slate-900">
      <Sidebar role="super_admin" userName={`${session.firstName} ${session.lastName}`} />
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
