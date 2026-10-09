import { cn } from "@/lib/utils";
import { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, ...props }, ref) => (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-slate-300">{label}</label>
      )}
      <input
        ref={ref}
        className={cn(
          "w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm",
          error && "border-red-500 focus:ring-red-500",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  )
);
Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, ...props }, ref) => (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-slate-300">{label}</label>
      )}
      <textarea
        ref={ref}
        className={cn(
          "w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm resize-vertical",
          error && "border-red-500",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
);
Textarea.displayName = "Textarea";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, children, ...props }, ref) => (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-slate-300">{label}</label>
      )}
      <select
        ref={ref}
        className={cn(
          "w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm",
          error && "border-red-500",
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
);
Select.displayName = "Select";
