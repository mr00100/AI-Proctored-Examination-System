import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { examQuestions, questions, questionOptions, exams } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !["teacher", "super_admin"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const examId = parseInt(id);

  try {
    const body = await req.json();
    const { questionIds } = body;

    if (!questionIds || !Array.isArray(questionIds)) {
      return NextResponse.json({ error: "questionIds array required" }, { status: 400 });
    }

    // Remove existing questions
    await db.delete(examQuestions).where(eq(examQuestions.examId, examId));

    // Add new questions
    if (questionIds.length > 0) {
      await db.insert(examQuestions).values(
        questionIds.map((qId: number, i: number) => ({
          examId,
          questionId: qId,
          orderIndex: i,
        }))
      );

      // Update exam's total questions count
      await db.update(exams)
        .set({ totalQuestions: questionIds.length, updatedAt: new Date() })
        .where(eq(exams.id, examId));
    }

    return NextResponse.json({ success: true, count: questionIds.length });
  } catch (err) {
    console.error("Add exam questions error:", err);
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
  const { searchParams } = new URL(req.url);
  const questionId = searchParams.get("questionId");

  try {
    if (questionId) {
      await db.delete(examQuestions).where(
        and(eq(examQuestions.examId, examId), eq(examQuestions.questionId, parseInt(questionId)))
      );
    } else {
      await db.delete(examQuestions).where(eq(examQuestions.examId, examId));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Remove exam question error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
