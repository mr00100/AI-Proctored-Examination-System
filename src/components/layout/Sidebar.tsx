"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: string;
}

interface SidebarProps {
  role: "super_admin" | "teacher" | "student";
  userName: string;
  notifications?: number;
}

const adminNav: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/users", label: "Users", icon: "👥" },
  { href: "/admin/departments", label: "Departments", icon: "🏛️" },
  { href: "/admin/subjects", label: "Subjects", icon: "📚" },
  { href: "/admin/exams", label: "All Exams", icon: "📋" },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: "📜" },
  { href: "/admin/settings", label: "Settings", icon: "⚙️" },
];

const teacherNav: NavItem[] = [
  { href: "/teacher", label: "Dashboard", icon: "📊" },
  { href: "/teacher/exams", label: "My Exams", icon: "📋" },
  { href: "/teacher/questions", label: "Question Bank", icon: "❓" },
  { href: "/teacher/monitor", label: "Live Monitor", icon: "🔴" },
  { href: "/teacher/incidents", label: "Incidents", icon: "⚠️" },
  { href: "/teacher/reports", label: "Reports", icon: "📈" },
];

const studentNav: NavItem[] = [
  { href: "/student", label: "Dashboard", icon: "🏠" },
  { href: "/student/exams", label: "Available Exams", icon: "📋" },
  { href: "/student/results", label: "My Results", icon: "📊" },
  { href: "/student/profile", label: "Profile", icon: "👤" },
];

export function Sidebar({ role, userName, notifications = 0 }: SidebarProps) {
  const pathname = usePathname();
  const navItems = role === "super_admin" ? adminNav : role === "teacher" ? teacherNav : studentNav;

  const roleLabel = role === "super_admin" ? "Super Admin" : role === "teacher" ? "Teacher" : "Student";
  const roleColor = role === "super_admin" ? "text-red-400" : role === "teacher" ? "text-indigo-400" : "text-emerald-400";
  const roleBg = role === "super_admin" ? "bg-red-900/30" : role === "teacher" ? "bg-indigo-900/30" : "bg-emerald-900/30";

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col min-h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-lg">
            🛡️
          </div>
          <div>
            <h1 className="font-bold text-white text-sm leading-tight">AI ExamGuard</h1>
            <p className="text-xs text-slate-500">Proctoring System</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-slate-800">
        <div className={cn("flex items-center gap-3 p-3 rounded-xl", roleBg)}>
          <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{userName}</p>
            <p className={cn("text-xs font-semibold", roleColor)}>{roleLabel}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span>{item.label}</span>
              {item.label === "Incidents" && notifications > 0 && (
                <span className="ml-auto bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {notifications}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-slate-800 space-y-2">
        <LogoutButton />
      </div>
    </aside>
  );
}

function LogoutButton() {
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <button
      onClick={handleLogout}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-900/20 transition-all"
    >
      <span>🚪</span>
      <span>Sign Out</span>
    </button>
  );
}
