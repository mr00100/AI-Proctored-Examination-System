import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { examAttempts, students, users, exams, proctoringEvents } from "@/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !["teacher", "super_admin"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get active attempts with student info
    const activeAttempts = await db
      .select({
        attemptId: examAttempts.id,
        status: examAttempts.status,
        startedAt: examAttempts.startedAt,
        riskScore: examAttempts.riskScore,
        serverTimeRemaining: examAttempts.serverTimeRemaining,
        lastHeartbeat: examAttempts.lastHeartbeat,
        terminationReason: examAttempts.terminationReason,
        terminatedAt: examAttempts.terminatedAt,
        studentId: examAttempts.studentId,
        examId: examAttempts.examId,
        firstName: users.firstName,
        lastName: users.lastName,
        studentNum: students.studentId,
        examTitle: exams.title,
        examCreatedBy: exams.createdBy,
      })
      .from(examAttempts)
      .innerJoin(students, eq(examAttempts.studentId, students.id))
      .innerJoin(users, eq(students.userId, users.id))
      .innerJoin(exams, eq(examAttempts.examId, exams.id))
      .where(
        session.role === "teacher"
          ? eq(exams.createdBy, session.userId)
          : sql`1=1`
      )
      .orderBy(desc(examAttempts.startedAt))
      .limit(50);

    // Get latest event for each attempt
    const attemptsWithEvents = await Promise.all(
      activeAttempts.map(async (attempt) => {
        const [latestEvent] = await db
          .select({
            eventType: proctoringEvents.eventType,
            severity: proctoringEvents.severity,
            description: proctoringEvents.description,
            timestamp: proctoringEvents.timestamp,
          })
          .from(proctoringEvents)
          .where(eq(proctoringEvents.attemptId, attempt.attemptId))
          .orderBy(desc(proctoringEvents.timestamp))
          .limit(1);

        return { ...attempt, latestEvent };
      })
    );

    return NextResponse.json({ attempts: attemptsWithEvents });
  } catch (err) {
    console.error("Live dashboard error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
