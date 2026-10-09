import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function getRiskLevel(score: number): { level: string; color: string; bg: string } {
  if (score <= 25) return { level: "LOW", color: "text-green-400", bg: "bg-green-900/30" };
  if (score <= 50) return { level: "MEDIUM", color: "text-yellow-400", bg: "bg-yellow-900/30" };
  if (score <= 75) return { level: "HIGH", color: "text-orange-400", bg: "bg-orange-900/30" };
  return { level: "CRITICAL", color: "text-red-400", bg: "bg-red-900/30" };
}

export function getRiskPoints(eventType: string): number {
  const points: Record<string, number> = {
    multiple_faces: 35,
    face_missing: 15,
    unusual_head_movement: 10,
    looking_away: 10,
    suspicious_object: 20,
    suspicious_behavior: 15,
    copy_attempt: 15,
    paste_attempt: 15,
    tab_switch: 100,
    fullscreen_exit: 10,
    window_blur: 5,
    right_click: 5,
    keyboard_shortcut: 5,
  };
  return points[eventType] || 5;
}

export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    info: "text-blue-400 bg-blue-900/30",
    low: "text-green-400 bg-green-900/30",
    medium: "text-yellow-400 bg-yellow-900/30",
    high: "text-orange-400 bg-orange-900/30",
    critical: "text-red-400 bg-red-900/30",
  };
  return colors[severity] || "text-gray-400 bg-gray-900/30";
}

export function getEventSeverity(eventType: string): "info" | "low" | "medium" | "high" | "critical" {
  const severities: Record<string, "info" | "low" | "medium" | "high" | "critical"> = {
    tab_switch: "critical",
    multiple_faces: "critical",
    suspicious_object: "high",
    face_missing: "high",
    paste_attempt: "medium",
    copy_attempt: "medium",
    fullscreen_exit: "medium",
    looking_away: "medium",
    unusual_head_movement: "low",
    window_blur: "low",
    right_click: "low",
    keyboard_shortcut: "low",
    exam_started: "info",
    exam_completed: "info",
    face_verified: "info",
    answer_saved: "info",
  };
  return severities[eventType] || "info";
}

export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateStudentId(): string {
  return `STU${Date.now().toString().slice(-6)}`;
}

export function generateEmployeeId(): string {
  return `EMP${Date.now().toString().slice(-6)}`;
}
