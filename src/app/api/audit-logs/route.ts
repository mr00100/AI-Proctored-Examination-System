import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const logs = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        role: auditLogs.role,
        target: auditLogs.target,
        targetId: auditLogs.targetId,
        metadata: auditLogs.metadata,
        ipAddress: auditLogs.ipAddress,
        timestamp: auditLogs.timestamp,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .orderBy(desc(auditLogs.timestamp))
      .limit(200);

    return NextResponse.json({ logs });
  } catch (err) {
    console.error("Get audit logs error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
