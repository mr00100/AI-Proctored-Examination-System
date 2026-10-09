import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { exams, subjects, users, examEnrollments, students } from "@/db/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  try {
    let query = db
      .select({
        id: exams.id,
        title: exams.title,
        description: exams.description,
        status: exams.status,
        duration: exams.duration,
        totalMarks: exams.totalMarks,
        passingMarks: exams.passingMarks,
        totalQuestions: exams.totalQuestions,
        startDateTime: exams.startDateTime,
        endDateTime: exams.endDateTime,
        maxAttempts: exams.maxAttempts,
        requireCamera: exams.requireCamera,
        requireFullscreen: exams.requireFullscreen,
        tabSwitchTermination: exams.tabSwitchTermination,
        proctoringLevel: exams.proctoringLevel,
        subjectName: subjects.name,
        subjectCode: subjects.code,
        teacherFirstName: users.firstName,
        teacherLastName: users.lastName,
        createdBy: exams.createdBy,
        createdAt: exams.createdAt,
      })
      .from(exams)
      .leftJoin(subjects, eq(exams.subjectId, subjects.id))
      .leftJoin(users, eq(exams.createdBy, users.id));

    const conditions = [];

    if (session.role === "teacher") {
      conditions.push(eq(exams.createdBy, session.userId));
    }

    if (status) {
      conditions.push(eq(exams.status, status as "draft" | "published" | "active" | "completed" | "archived"));
    }

    if (session.role === "student") {
      // For students, show published and active exams
      conditions.push(sql`${exams.status} IN ('published', 'active')`);
    }

    const results = await query
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(exams.createdAt));

    return NextResponse.json({ exams: results });
  } catch (err) {
    console.error("Get exams error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !["teacher", "super_admin"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      title, description, subjectId, totalMarks, passingMarks, duration,
      startDateTime, endDateTime, totalQuestions, maxAttempts, negativeMarking,
      negativeMarkValue, shuffleQuestions, shuffleOptions, status,
      proctoringLevel, requireCamera, requireMicrophone, requireFullscreen,
      tabSwitchTermination, fullscreenExitAction, copyPasteProtection,
      faceVerification, showResultsToStudent, showCorrectAnswers, instructions,
    } = body;

    if (!title || !totalMarks || !passingMarks || !duration || !startDateTime || !endDateTime) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
    }

    const [newExam] = await db.insert(exams).values({
      title,
      description,
      subjectId: subjectId || null,
      createdBy: session.userId,
      totalMarks: String(totalMarks),
      passingMarks: String(passingMarks),
      duration,
      startDateTime: new Date(startDateTime),
      endDateTime: new Date(endDateTime),
      totalQuestions: totalQuestions || 0,
      maxAttempts: maxAttempts || 1,
      negativeMarking: negativeMarking || false,
      negativeMarkValue: negativeMarkValue ? String(negativeMarkValue) : "0",
      shuffleQuestions: shuffleQuestions !== false,
      shuffleOptions: shuffleOptions !== false,
      status: status || "draft",
      proctoringLevel: proctoringLevel || "standard",
      requireCamera: requireCamera !== false,
      requireMicrophone: requireMicrophone || false,
      requireFullscreen: requireFullscreen !== false,
      tabSwitchTermination: tabSwitchTermination !== false,
      fullscreenExitAction: fullscreenExitAction || "warn",
      copyPasteProtection: copyPasteProtection !== false,
      faceVerification: faceVerification || false,
      showResultsToStudent: showResultsToStudent !== false,
      showCorrectAnswers: showCorrectAnswers || false,
      instructions,
    }).returning();

    return NextResponse.json({ success: true, exam: newExam });
  } catch (err) {
    console.error("Create exam error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
