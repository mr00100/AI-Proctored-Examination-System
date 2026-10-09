import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  proctoringEvents, examAttempts, students, notifications, exams, users, auditLogs
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { getRiskPoints, getEventSeverity } from "@/lib/utils";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const attemptId = parseInt(id);

  try {
    const body = await req.json();
    const { eventType, description, confidenceScore, metadata } = body;

    const [attempt] = await db.select().from(examAttempts).where(eq(examAttempts.id, attemptId)).limit(1);
    if (!attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });

    const severity = getEventSeverity(eventType);
    const riskPoints = getRiskPoints(eventType);

    // Log the event
    const [event] = await db.insert(proctoringEvents).values({
      attemptId,
      studentId: attempt.studentId,
      examId: attempt.examId,
      eventType,
      severity,
      confidenceScore: String(confidenceScore || 95),
      description: description || `${eventType} detected`,
      metadata: metadata || null,
      riskPoints,
    }).returning();

    // Update risk score
    const newRiskScore = Math.min(100, (attempt.riskScore || 0) + riskPoints);
    await db.update(examAttempts).set({
      riskScore: newRiskScore,
      updatedAt: new Date(),
    }).where(eq(examAttempts.id, attemptId));

    // TAB SWITCH: Immediately terminate
    if (eventType === "tab_switch") {
      await db.update(examAttempts).set({
        status: "terminated",
        terminatedAt: new Date(),
        terminationReason: "tab_switch",
        retakeAllowed: false,
        riskScore: 100,
        updatedAt: new Date(),
      }).where(eq(examAttempts.id, attemptId));

      // Notify teacher
      const [exam] = await db.select().from(exams).where(eq(exams.id, attempt.examId)).limit(1);
      if (exam) {
        await db.insert(notifications).values({
          userId: exam.createdBy,
          type: "critical",
          title: "🚨 EXAM TERMINATED — Tab Switch",
          message: `Student's exam was immediately terminated due to tab/window switch. Attempt #${attempt.id}`,
          relatedId: attemptId,
          relatedType: "attempt",
        });
      }

      // Audit
      await db.insert(auditLogs).values({
        userId: session.userId,
        role: session.role,
        action: "tab_switch",
        target: "attempt",
        targetId: attemptId,
        metadata: { eventId: event.id, reason: "tab_switch" },
      });

      return NextResponse.json({
        success: true,
        event,
        terminated: true,
        message: "Exam terminated due to tab switch",
      });
    }

    // High-risk notification for teacher
    if (severity === "critical" || severity === "high") {
      const [exam] = await db.select().from(exams).where(eq(exams.id, attempt.examId)).limit(1);
      if (exam) {
        await db.insert(notifications).values({
          userId: exam.createdBy,
          type: severity === "critical" ? "critical" : "warning",
          title: `⚠️ ${severity.toUpperCase()}: ${eventType.replace(/_/g, " ")}`,
          message: `Risk event detected for attempt #${attemptId}. Risk score: ${newRiskScore}`,
          relatedId: attemptId,
          relatedType: "attempt",
        });
      }
    }

    return NextResponse.json({ success: true, event, riskScore: newRiskScore });
  } catch (err) {
    console.error("Log event error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const attemptId = parseInt(id);

  try {
    const events = await db.select().from(proctoringEvents)
      .where(eq(proctoringEvents.attemptId, attemptId))
      .orderBy(proctoringEvents.timestamp);

    return NextResponse.json({ events });
  } catch (err) {
    console.error("Get events error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
