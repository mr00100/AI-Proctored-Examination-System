import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  examAttempts, studentAnswers, questions, questionOptions, examAttempts as ea
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const attemptId = parseInt(id);

  try {
    const body = await req.json();
    const { questionId, selectedOptionId, textAnswer } = body;

    // Verify attempt is still in progress
    const [attempt] = await db.select().from(examAttempts).where(eq(examAttempts.id, attemptId)).limit(1);
    if (!attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });

    if (attempt.status !== "in_progress") {
      return NextResponse.json({
        error: "Attempt is not active",
        status: attempt.status,
        terminated: attempt.status === "terminated",
      }, { status: 400 });
    }

    // Get question to check marks
    const [question] = await db.select().from(questions).where(eq(questions.id, questionId)).limit(1);
    if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });

    // Determine if correct
    let isCorrect = false;
    let marksAwarded = "0";

    if (selectedOptionId) {
      const [option] = await db.select().from(questionOptions)
        .where(and(eq(questionOptions.id, selectedOptionId), eq(questionOptions.questionId, questionId)))
        .limit(1);

      if (option) {
        isCorrect = option.isCorrect;
        marksAwarded = isCorrect ? String(question.marks) : "0";
      }
    } else if (textAnswer && question.correctAnswer) {
      // Basic text matching for short/long answers - in production use NLP
      const normalizedAnswer = textAnswer.toLowerCase().trim();
      const normalizedCorrect = question.correctAnswer.toLowerCase().trim();
      isCorrect = normalizedAnswer.includes(normalizedCorrect.substring(0, 20));
      marksAwarded = isCorrect ? String(question.marks) : "0";
    }

    // Upsert answer
    const existing = await db.select().from(studentAnswers)
      .where(and(eq(studentAnswers.attemptId, attemptId), eq(studentAnswers.questionId, questionId)))
      .limit(1);

    if (existing.length > 0) {
      await db.update(studentAnswers).set({
        selectedOptionId: selectedOptionId || null,
        textAnswer: textAnswer || null,
        isCorrect,
        marksAwarded,
        updatedAt: new Date(),
      }).where(and(eq(studentAnswers.attemptId, attemptId), eq(studentAnswers.questionId, questionId)));
    } else {
      await db.insert(studentAnswers).values({
        attemptId,
        questionId,
        selectedOptionId: selectedOptionId || null,
        textAnswer: textAnswer || null,
        isCorrect,
        marksAwarded,
      });
    }

    return NextResponse.json({ success: true, isCorrect, marksAwarded });
  } catch (err) {
    console.error("Save answer error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const attemptId = parseInt(id);

  try {
    const answers = await db.select().from(studentAnswers)
      .where(eq(studentAnswers.attemptId, attemptId));

    return NextResponse.json({ answers });
  } catch (err) {
    console.error("Get answers error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
