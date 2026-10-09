import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { questions, questionOptions, subjects, users } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get("subjectId");
  const questionType = searchParams.get("type");
  const difficulty = searchParams.get("difficulty");

  try {
    const conditions = [];
    if (session.role === "teacher") {
      conditions.push(eq(questions.createdBy, session.userId));
    }
    if (subjectId) conditions.push(eq(questions.subjectId, parseInt(subjectId)));
    if (questionType) conditions.push(eq(questions.questionType, questionType as "mcq" | "true_false" | "short_answer" | "long_answer" | "numerical" | "coding"));
    if (difficulty) conditions.push(eq(questions.difficulty, difficulty as "easy" | "medium" | "hard"));

    const qs = await db
      .select({
        id: questions.id,
        questionText: questions.questionText,
        questionType: questions.questionType,
        difficulty: questions.difficulty,
        marks: questions.marks,
        topic: questions.topic,
        chapter: questions.chapter,
        tags: questions.tags,
        isAiGenerated: questions.isAiGenerated,
        isPublished: questions.isPublished,
        usageCount: questions.usageCount,
        correctAnswer: questions.correctAnswer,
        explanation: questions.explanation,
        subjectName: subjects.name,
        subjectCode: subjects.code,
        createdAt: questions.createdAt,
        createdBy: questions.createdBy,
      })
      .from(questions)
      .leftJoin(subjects, eq(questions.subjectId, subjects.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(questions.createdAt));

    // Get options
    const qsWithOptions = await Promise.all(
      qs.map(async (q) => {
        const opts = await db.select().from(questionOptions)
          .where(eq(questionOptions.questionId, q.id))
          .orderBy(questionOptions.orderIndex);
        return { ...q, options: opts };
      })
    );

    return NextResponse.json({ questions: qsWithOptions });
  } catch (err) {
    console.error("Get questions error:", err);
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
    const { questionText, questionType, difficulty, marks, subjectId, topic, chapter, explanation, tags, correctAnswer, isPublished, options, isAiGenerated } = body;

    if (!questionText || !questionType) {
      return NextResponse.json({ error: "Question text and type required" }, { status: 400 });
    }

    const [question] = await db.insert(questions).values({
      createdBy: session.userId,
      subjectId: subjectId || null,
      questionText,
      questionType,
      difficulty: difficulty || "medium",
      marks: String(marks || 1),
      topic: topic || null,
      chapter: chapter || null,
      explanation: explanation || null,
      tags: tags || null,
      correctAnswer: correctAnswer || null,
      isAiGenerated: isAiGenerated || false,
      isPublished: isPublished || false,
    }).returning();

    // Insert options
    if (options && options.length > 0) {
      await db.insert(questionOptions).values(
        options.map((opt: { text: string; isCorrect: boolean }, i: number) => ({
          questionId: question.id,
          optionText: opt.text,
          isCorrect: opt.isCorrect || false,
          orderIndex: i,
        }))
      );
    }

    return NextResponse.json({ success: true, question });
  } catch (err) {
    console.error("Create question error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
