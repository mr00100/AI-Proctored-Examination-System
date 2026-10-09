import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  examAttempts, exams, students, users, proctoringEvents, auditLogs, notifications
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { shuffleArray, getRiskPoints, getEventSeverity } from "@/lib/utils";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const examId = parseInt(id);

  try {
    if (session.role === "student") {
      // Get student's attempts
      const [student] = await db.select().from(students).where(eq(students.userId, session.userId)).limit(1);
      if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

      const attempts = await db.select().from(examAttempts)
        .where(and(eq(examAttempts.examId, examId), eq(examAttempts.studentId, student.id)))
        .orderBy(desc(examAttempts.createdAt));

      return NextResponse.json({ attempts });
    } else {
      // Teacher/admin gets all attempts
      const attempts = await db
        .select({
          id: examAttempts.id,
          status: examAttempts.status,
          startedAt: examAttempts.startedAt,
          completedAt: examAttempts.completedAt,
          terminatedAt: examAttempts.terminatedAt,
          terminationReason: examAttempts.terminationReason,
          score: examAttempts.score,
          percentage: examAttempts.percentage,
          isPassed: examAttempts.isPassed,
          riskScore: examAttempts.riskScore,
          retakeAllowed: examAttempts.retakeAllowed,
          attemptNumber: examAttempts.attemptNumber,
          studentId: examAttempts.studentId,
          serverTimeRemaining: examAttempts.serverTimeRemaining,
          firstName: users.firstName,
          lastName: users.lastName,
          studentIdNum: students.studentId,
        })
        .from(examAttempts)
        .innerJoin(students, eq(examAttempts.studentId, students.id))
        .innerJoin(users, eq(students.userId, users.id))
        .where(eq(examAttempts.examId, examId))
        .orderBy(desc(examAttempts.createdAt));

      return NextResponse.json({ attempts });
    }
  } catch (err) {
    console.error("Get attempts error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const examId = parseInt(id);

  try {
    // Get student
    const [student] = await db.select().from(students).where(eq(students.userId, session.userId)).limit(1);
    if (!student) return NextResponse.json({ error: "Student record not found" }, { status: 404 });

    // Get exam
    const [exam] = await db.select().from(exams).where(eq(exams.id, examId)).limit(1);
    if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

    // Check exam is active/published
    if (!["active", "published"].includes(exam.status)) {
      return NextResponse.json({ error: "Exam is not currently available" }, { status: 400 });
    }

    // Check time window
    const now = new Date();
    if (now < exam.startDateTime) {
      return NextResponse.json({ error: "Exam has not started yet" }, { status: 400 });
    }
    if (now > exam.endDateTime) {
      return NextResponse.json({ error: "Exam time has expired" }, { status: 400 });
    }

    // Check existing attempts
    const existingAttempts = await db.select().from(examAttempts)
      .where(and(eq(examAttempts.examId, examId), eq(examAttempts.studentId, student.id)));

    // Check for terminated attempt with no retake
    const terminated = existingAttempts.find(a => a.status === "terminated" && !a.retakeAllowed);
    if (terminated) {
      return NextResponse.json({
        error: "RE-ATTEMPT NOT AVAILABLE",
        reason: "Your previous attempt was terminated and retakes are not permitted.",
        attemptStatus: "terminated",
        terminationReason: terminated.terminationReason,
      }, { status: 403 });
    }

    // Check in-progress attempt
    const inProgress = existingAttempts.find(a => a.status === "in_progress");
    if (inProgress) {
      return NextResponse.json({ attempt: inProgress, existing: true });
    }

    // Check max attempts
    const completedAttempts = existingAttempts.filter(a =>
      ["completed", "terminated"].includes(a.status)
    );
    if (completedAttempts.length >= exam.maxAttempts) {
      return NextResponse.json({ error: "Maximum attempts reached for this exam" }, { status: 400 });
    }

    // Get exam questions and shuffle
    const { examQuestions: eqModule, questions: qModule } = await import("@/db/schema");
    const examQs = await db.select({ questionId: eqModule.questionId })
      .from(eqModule)
      .where(eq(eqModule.examId, examId));

    const questionIds = examQs.map(q => q.questionId);
    const shuffledOrder = exam.shuffleQuestions ? shuffleArray(questionIds) : questionIds;

    // Get options for each question and shuffle them
    const { questionOptions: qOpts } = await import("@/db/schema");
    const optionOrders: Record<number, number[]> = {};

    if (exam.shuffleOptions) {
      for (const qId of shuffledOrder) {
        const opts = await db.select({ id: qOpts.id })
          .from(qOpts)
          .where(eq(qOpts.questionId, qId));
        optionOrders[qId] = shuffleArray(opts.map(o => o.id));
      }
    }

    // Create attempt
    const [attempt] = await db.insert(examAttempts).values({
      examId,
      studentId: student.id,
      status: "in_progress",
      startedAt: new Date(),
      questionOrder: shuffledOrder,
      optionOrders: exam.shuffleOptions ? optionOrders : null,
      serverTimeRemaining: exam.duration * 60,
      lastHeartbeat: new Date(),
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      attemptNumber: existingAttempts.length + 1,
    }).returning();

    // Log exam start event
    await db.insert(proctoringEvents).values({
      attemptId: attempt.id,
      studentId: student.id,
      examId,
      eventType: "exam_started",
      severity: "info",
      confidenceScore: "100",
      description: "Exam attempt started",
      riskPoints: 0,
    });

    // Audit log
    await db.insert(auditLogs).values({
      userId: session.userId,
      role: session.role,
      action: "exam_started",
      target: "exam",
      targetId: examId,
      metadata: { attemptId: attempt.id },
    });

    return NextResponse.json({ success: true, attempt });
  } catch (err) {
    console.error("Start attempt error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
