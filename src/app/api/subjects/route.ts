import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subjects, departments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const subs = await db
      .select({
        id: subjects.id,
        name: subjects.name,
        code: subjects.code,
        creditHours: subjects.creditHours,
        description: subjects.description,
        isActive: subjects.isActive,
        departmentName: departments.name,
        departmentCode: departments.code,
      })
      .from(subjects)
      .leftJoin(departments, eq(subjects.departmentId, departments.id))
      .where(eq(subjects.isActive, true))
      .orderBy(desc(subjects.createdAt));

    return NextResponse.json({ subjects: subs });
  } catch (err) {
    console.error("Get subjects error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !["super_admin", "teacher"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, code, departmentId, creditHours, description } = body;

    if (!name || !code) {
      return NextResponse.json({ error: "Name and code required" }, { status: 400 });
    }

    const [subject] = await db.insert(subjects).values({
      name,
      code,
      departmentId: departmentId || null,
      creditHours: creditHours || 3,
      description: description || null,
    }).returning();

    return NextResponse.json({ success: true, subject });
  } catch (err) {
    console.error("Create subject error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
