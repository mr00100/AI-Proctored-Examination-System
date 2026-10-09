import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, exams, examAttempts, proctoringEvents, students, teachers } from "@/db/schema";
import { eq, sql, count, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    if (session.role === "super_admin") {
      const [totalUsers] = await db.select({ count: count() }).from(users);
      const [totalStudents] = await db.select({ count: count() }).from(students);
      const [totalTeachers] = await db.select({ count: count() }).from(teachers);
      const [totalExams] = await db.select({ count: count() }).from(exams);
      const [activeExams] = await db.select({ count: count() }).from(exams).where(eq(exams.status, "active"));
      const [totalAttempts] = await db.select({ count: count() }).from(examAttempts);
      const [terminatedAttempts] = await db.select({ count: count() }).from(examAttempts).where(eq(examAttempts.status, "terminated"));
      const [totalEvents] = await db.select({ count: count() }).from(proctoringEvents);

      return NextResponse.json({
        totalUsers: totalUsers.count,
        totalStudents: totalStudents.count,
        totalTeachers: totalTeachers.count,
        totalExams: totalExams.count,
        activeExams: activeExams.count,
        totalAttempts: totalAttempts.count,
        terminatedAttempts: terminatedAttempts.count,
        totalEvents: totalEvents.count,
      });
    }

    if (session.role === "teacher") {
      const teacherExams = await db.select({ id: exams.id }).from(exams)
        .where(eq(exams.createdBy, session.userId));

      const examIds = teacherExams.map(e => e.id);

      let totalAttempts = 0, activeAttempts = 0, completedAttempts = 0, terminatedAttempts = 0;
      let lowRisk = 0, mediumRisk = 0, highRisk = 0, criticalRisk = 0;

      if (examIds.length > 0) {
        const attempts = await db.select({
          status: examAttempts.status,
          riskScore: examAttempts.riskScore,
        }).from(examAttempts)
          .where(sql`${examAttempts.examId} = ANY(${sql`ARRAY[${sql.join(examIds.map(id => sql`${id}`), sql`, `)}]`})`);

        totalAttempts = attempts.length;
        for (const a of attempts) {
          if (a.status === "in_progress") activeAttempts++;
          if (a.status === "completed") completedAttempts++;
          if (a.status === "terminated") terminatedAttempts++;
          const risk = a.riskScore || 0;
          if (risk <= 25) lowRisk++;
          else if (risk <= 50) mediumRisk++;
          else if (risk <= 75) highRisk++;
          else criticalRisk++;
        }
      }

      return NextResponse.json({
        totalExams: teacherExams.length,
        totalAttempts,
        activeStudents: activeAttempts,
        completedAttempts,
        terminatedAttempts,
        lowRisk,
        mediumRisk,
        highRisk,
        criticalRisk,
      });
    }

    if (session.role === "student") {
      const [student] = await db.select().from(students).where(eq(students.userId, session.userId)).limit(1);
      if (!student) return NextResponse.json({ stats: {} });

      const attempts = await db.select().from(examAttempts)
        .where(eq(examAttempts.studentId, student.id));

      const completed = attempts.filter(a => a.status === "completed");
      const avgScore = completed.length > 0
        ? completed.reduce((s, a) => s + parseFloat(a.score || "0"), 0) / completed.length
        : 0;

      return NextResponse.json({
        totalAttempts: attempts.length,
        completedExams: completed.length,
        terminatedExams: attempts.filter(a => a.status === "terminated").length,
        averageScore: avgScore.toFixed(1),
        passedExams: completed.filter(a => a.isPassed).length,
      });
    }

    return NextResponse.json({});
  } catch (err) {
    console.error("Stats error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
