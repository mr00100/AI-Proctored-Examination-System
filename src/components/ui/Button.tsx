"use client";
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline" | "success" | "warning";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/30",
      secondary: "bg-slate-700 hover:bg-slate-600 text-slate-100",
      danger: "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/30",
      ghost: "hover:bg-slate-800 text-slate-300 hover:text-white",
      outline: "border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white hover:bg-slate-800",
      success: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/30",
      warning: "bg-amber-600 hover:bg-amber-700 text-white",
    };
    const sizes = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900",
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
