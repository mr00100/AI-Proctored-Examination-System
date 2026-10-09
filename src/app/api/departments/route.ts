import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { departments } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const depts = await db.select().from(departments).orderBy(desc(departments.createdAt));
    return NextResponse.json({ departments: depts });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, code, description } = body;

    const [dept] = await db.insert(departments).values({ name, code, description }).returning();
    return NextResponse.json({ success: true, department: dept });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
