import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const notifs = await db.select().from(notifications)
      .where(eq(notifications.userId, session.userId))
      .orderBy(desc(notifications.createdAt))
      .limit(20);

    return NextResponse.json({ notifications: notifs });
  } catch (err) {
    console.error("Get notifications error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, session.userId));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Mark notifications read error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
