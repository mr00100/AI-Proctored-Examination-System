import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { systemSettings } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const settings = await db.select().from(systemSettings);
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { settings } = await req.json();
  for (const s of settings) {
    await db.update(systemSettings).set({ value: s.value, updatedAt: new Date() }).where(eq(systemSettings.key, s.key));
  }
  return NextResponse.json({ success: true });
}
