import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { exams, subjects, users, examQuestions, questions, questionOptions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const examId = parseInt(id);

  try {
    const [exam] = await db
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
        negativeMarking: exams.negativeMarking,
        negativeMarkValue: exams.negativeMarkValue,
        shuffleQuestions: exams.shuffleQuestions,
        shuffleOptions: exams.shuffleOptions,
        proctoringLevel: exams.proctoringLevel,
        requireCamera: exams.requireCamera,
        requireMicrophone: exams.requireMicrophone,
        requireFullscreen: exams.requireFullscreen,
        tabSwitchTermination: exams.tabSwitchTermination,
        fullscreenExitAction: exams.fullscreenExitAction,
        copyPasteProtection: exams.copyPasteProtection,
        faceVerification: exams.faceVerification,
        showResultsToStudent: exams.showResultsToStudent,
        showCorrectAnswers: exams.showCorrectAnswers,
        instructions: exams.instructions,
        subjectName: subjects.name,
        subjectCode: subjects.code,
        teacherFirstName: users.firstName,
        teacherLastName: users.lastName,
        createdBy: exams.createdBy,
        createdAt: exams.createdAt,
      })
      .from(exams)
      .leftJoin(subjects, eq(exams.subjectId, subjects.id))
      .leftJoin(users, eq(exams.createdBy, users.id))
      .where(eq(exams.id, examId))
      .limit(1);

    if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

    // Get questions (without correct answers for students during exam)
    const examQs = await db
      .select({
        id: questions.id,
        questionText: questions.questionText,
        questionType: questions.questionType,
        difficulty: questions.difficulty,
        marks: questions.marks,
        topic: questions.topic,
        orderIndex: examQuestions.orderIndex,
        examQuestionId: examQuestions.id,
        correctAnswer: questions.correctAnswer,
      })
      .from(examQuestions)
      .innerJoin(questions, eq(examQuestions.questionId, questions.id))
      .where(eq(examQuestions.examId, examId))
      .orderBy(examQuestions.orderIndex);

    // Get options for each question
    const questionsWithOptions = await Promise.all(
      examQs.map(async (q) => {
        const opts = await db
          .select({
            id: questionOptions.id,
            optionText: questionOptions.optionText,
            isCorrect: questionOptions.isCorrect,
            orderIndex: questionOptions.orderIndex,
          })
          .from(questionOptions)
          .where(eq(questionOptions.questionId, q.id))
          .orderBy(questionOptions.orderIndex);

        return {
          ...q,
          options: opts,
        };
      })
    );

    return NextResponse.json({ exam, questions: questionsWithOptions });
  } catch (err) {
    console.error("Get exam error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !["teacher", "super_admin"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const examId = parseInt(id);

  try {
    const body = await req.json();
    const updates: Record<string, unknown> = { ...body, updatedAt: new Date() };

    // Convert dates
    if (updates.startDateTime) updates.startDateTime = new Date(updates.startDateTime as string);
    if (updates.endDateTime) updates.endDateTime = new Date(updates.endDateTime as string);
    if (updates.totalMarks) updates.totalMarks = String(updates.totalMarks);
    if (updates.passingMarks) updates.passingMarks = String(updates.passingMarks);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [updated] = await db.update(exams)
      .set(updates as any)
      .where(eq(exams.id, examId))
      .returning();

    return NextResponse.json({ success: true, exam: updated });
  } catch (err) {
    console.error("Update exam error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !["teacher", "super_admin"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const examId = parseInt(id);

  try {
    await db.delete(exams).where(eq(exams.id, examId));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete exam error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
