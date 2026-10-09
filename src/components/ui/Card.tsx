import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: "indigo" | "red" | "green" | "amber";
}

export function Card({ className, glow, children, ...props }: CardProps) {
  const glows = {
    indigo: "shadow-indigo-900/20 border-indigo-800/50",
    red: "shadow-red-900/30 border-red-800/50",
    green: "shadow-emerald-900/20 border-emerald-800/50",
    amber: "shadow-amber-900/20 border-amber-800/50",
  };

  return (
    <div
      className={cn(
        "bg-slate-800/50 border border-slate-700/50 rounded-xl backdrop-blur-sm",
        glow && `shadow-lg ${glows[glow]}`,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-6 py-4 border-b border-slate-700/50", className)} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-6 py-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-6 py-4 border-t border-slate-700/50", className)} {...props}>
      {children}
    </div>
  );
}
