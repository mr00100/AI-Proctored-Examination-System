import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  examAttempts, exams, students, studentAnswers,
  questions, questionOptions, proctoringEvents, users, notifications, auditLogs
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const attemptId = parseInt(id);

  try {
    const [attempt] = await db.select().from(examAttempts).where(eq(examAttempts.id, attemptId)).limit(1);
    if (!attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });

    // Verify ownership for students
    if (session.role === "student") {
      const [student] = await db.select().from(students).where(eq(students.userId, session.userId)).limit(1);
      if (!student || attempt.studentId !== student.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    const [exam] = await db.select().from(exams).where(eq(exams.id, attempt.examId)).limit(1);
    const answers = await db.select().from(studentAnswers).where(eq(studentAnswers.attemptId, attemptId));
    const events = await db.select().from(proctoringEvents)
      .where(eq(proctoringEvents.attemptId, attemptId))
      .orderBy(proctoringEvents.timestamp);

    // Get questions in the stored order
    let questionOrder = attempt.questionOrder as number[] | null;
    if (!questionOrder) {
      const { examQuestions } = await import("@/db/schema");
      const eqs = await db.select({ questionId: examQuestions.questionId })
        .from(examQuestions).where(eq(examQuestions.examId, attempt.examId));
      questionOrder = eqs.map(e => e.questionId);
    }

    const questionsData = await Promise.all(
      questionOrder.map(async (qId) => {
        const [q] = await db.select().from(questions).where(eq(questions.id, qId)).limit(1);
        if (!q) return null;

        const opts = await db.select({
          id: questionOptions.id,
          optionText: questionOptions.optionText,
          isCorrect: questionOptions.isCorrect,
          orderIndex: questionOptions.orderIndex,
        }).from(questionOptions).where(eq(questionOptions.questionId, qId));

        // Reorder options if shuffle was applied
        const optionOrders = attempt.optionOrders as Record<number, number[]> | null;
        let orderedOpts = opts;
        if (optionOrders && optionOrders[qId]) {
          const orderMap = new Map(opts.map(o => [o.id, o]));
          orderedOpts = optionOrders[qId].map(oid => orderMap.get(oid)).filter(Boolean) as typeof opts;
        }

        return {
          ...q,
          // Remove correct answer for students during active exam
          correctAnswer: session.role === "student" && attempt.status === "in_progress" ? undefined : q.correctAnswer,
          options: orderedOpts.map(o => ({
            ...o,
            // Hide isCorrect for students during active exam
            isCorrect: session.role === "student" && attempt.status === "in_progress" ? undefined : o.isCorrect,
          })),
        };
      })
    );

    return NextResponse.json({
      attempt,
      exam,
      questions: questionsData.filter(Boolean),
      answers,
      events,
    });
  } catch (err) {
    console.error("Get attempt error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const attemptId = parseInt(id);

  try {
    const body = await req.json();
    const { action, reason } = body;

    const [attempt] = await db.select().from(examAttempts).where(eq(examAttempts.id, attemptId)).limit(1);
    if (!attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });

    if (action === "terminate") {
      // This is the critical termination endpoint
      if (attempt.status === "terminated") {
        return NextResponse.json({ success: true, message: "Already terminated" });
      }

      const [terminated] = await db.update(examAttempts).set({
        status: "terminated",
        terminatedAt: new Date(),
        terminationReason: (reason || "tab_switch") as "tab_switch" | "fullscreen_exit" | "time_expired" | "manual" | "system_error",
        retakeAllowed: false,
        updatedAt: new Date(),
      }).where(eq(examAttempts.id, attemptId)).returning();

      // Log proctoring event
      await db.insert(proctoringEvents).values({
        attemptId,
        studentId: attempt.studentId,
        examId: attempt.examId,
        eventType: "exam_terminated",
        severity: "critical",
        confidenceScore: "100",
        description: `Exam terminated: ${reason || "tab_switch"}`,
        riskPoints: 100,
        metadata: { reason, terminatedBy: session.userId },
      });

      // Create notification for teacher(s)
      const [exam] = await db.select().from(exams).where(eq(exams.id, attempt.examId)).limit(1);
      if (exam) {
        await db.insert(notifications).values({
          userId: exam.createdBy,
          type: "critical",
          title: "⚠️ Exam Terminated",
          message: `A student's exam attempt has been terminated due to: ${reason || "tab switch"}`,
          relatedId: attemptId,
          relatedType: "attempt",
        });
      }

      // Audit log
      await db.insert(auditLogs).values({
        userId: session.userId,
        role: session.role,
        action: "exam_terminated",
        target: "attempt",
        targetId: attemptId,
        metadata: { reason, examId: attempt.examId },
      });

      return NextResponse.json({ success: true, attempt: terminated });
    }

    if (action === "complete") {
      if (attempt.status !== "in_progress") {
        return NextResponse.json({ error: "Attempt is not in progress" }, { status: 400 });
      }

      // Calculate score
      const answers = await db.select({
        marksAwarded: studentAnswers.marksAwarded,
      }).from(studentAnswers).where(eq(studentAnswers.attemptId, attemptId));

      const [exam] = await db.select().from(exams).where(eq(exams.id, attempt.examId)).limit(1);
      const totalScore = answers.reduce((sum, a) => sum + parseFloat(a.marksAwarded || "0"), 0);
      const percentage = (totalScore / parseFloat(exam?.totalMarks || "1")) * 100;
      const isPassed = totalScore >= parseFloat(exam?.passingMarks || "0");

      const [completed] = await db.update(examAttempts).set({
        status: "completed",
        completedAt: new Date(),
        score: String(totalScore),
        percentage: String(percentage.toFixed(2)),
        isPassed,
        updatedAt: new Date(),
      }).where(eq(examAttempts.id, attemptId)).returning();

      // Log
      await db.insert(proctoringEvents).values({
        attemptId,
        studentId: attempt.studentId,
        examId: attempt.examId,
        eventType: "exam_completed",
        severity: "info",
        confidenceScore: "100",
        description: `Exam completed. Score: ${totalScore}/${exam?.totalMarks}`,
        riskPoints: 0,
      });

      await db.insert(auditLogs).values({
        userId: session.userId,
        role: session.role,
        action: "exam_completed",
        target: "attempt",
        targetId: attemptId,
        metadata: { score: totalScore, percentage },
      });

      return NextResponse.json({ success: true, attempt: completed });
    }

    // Heartbeat update
    if (action === "heartbeat") {
      const { timeRemaining } = body;
      await db.update(examAttempts).set({
        lastHeartbeat: new Date(),
        serverTimeRemaining: timeRemaining || attempt.serverTimeRemaining,
        updatedAt: new Date(),
      }).where(eq(examAttempts.id, attemptId));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Update attempt error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
