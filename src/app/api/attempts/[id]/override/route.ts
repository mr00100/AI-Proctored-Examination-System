import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { examAttempts, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !["teacher", "super_admin"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const attemptId = parseInt(id);

  try {
    const body = await req.json();
    const { note } = body;

    if (!note?.trim()) {
      return NextResponse.json({ error: "Override note is required" }, { status: 400 });
    }

    const [updated] = await db.update(examAttempts).set({
      retakeAllowed: true,
      overrideBy: session.userId,
      overrideNote: note,
      overrideAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(examAttempts.id, attemptId)).returning();

    await db.insert(auditLogs).values({
      userId: session.userId,
      role: session.role,
      action: "teacher_override",
      target: "attempt",
      targetId: attemptId,
      metadata: { note, previousStatus: "terminated" },
    });

    return NextResponse.json({ success: true, attempt: updated });
  } catch (err) {
    console.error("Override error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
