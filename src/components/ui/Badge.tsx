import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "purple" | "slate";
}

export function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  const variants = {
    default: "bg-slate-700 text-slate-200",
    success: "bg-emerald-900/50 text-emerald-400 border border-emerald-700/50",
    warning: "bg-amber-900/50 text-amber-400 border border-amber-700/50",
    danger: "bg-red-900/50 text-red-400 border border-red-700/50",
    info: "bg-blue-900/50 text-blue-400 border border-blue-700/50",
    purple: "bg-purple-900/50 text-purple-400 border border-purple-700/50",
    slate: "bg-slate-700/50 text-slate-400 border border-slate-600/50",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: BadgeProps["variant"]; label: string }> = {
    active: { variant: "success", label: "Active" },
    published: { variant: "info", label: "Published" },
    draft: { variant: "slate", label: "Draft" },
    completed: { variant: "purple", label: "Completed" },
    archived: { variant: "slate", label: "Archived" },
    in_progress: { variant: "info", label: "In Progress" },
    terminated: { variant: "danger", label: "Terminated" },
    not_started: { variant: "slate", label: "Not Started" },
    abandoned: { variant: "warning", label: "Abandoned" },
    low: { variant: "success", label: "LOW" },
    medium: { variant: "warning", label: "MEDIUM" },
    high: { variant: "warning", label: "HIGH" },
    critical: { variant: "danger", label: "CRITICAL" },
    pending: { variant: "warning", label: "Pending" },
    confirmed: { variant: "danger", label: "Confirmed" },
    dismissed: { variant: "success", label: "Dismissed" },
    overridden: { variant: "info", label: "Overridden" },
  };

  const config = variants[status] || { variant: "slate" as BadgeProps["variant"], label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
