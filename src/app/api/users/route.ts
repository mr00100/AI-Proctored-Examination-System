import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, students, teachers, departments } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !["super_admin", "teacher"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");

  try {
    const query = db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        status: users.status,
        firstName: users.firstName,
        lastName: users.lastName,
        lastLoginAt: users.lastLoginAt,
        loginCount: users.loginCount,
        createdAt: users.createdAt,
      })
      .from(users);

    const results = role
      ? await query.where(eq(users.role, role as "super_admin" | "teacher" | "student")).orderBy(desc(users.createdAt))
      : await query.orderBy(desc(users.createdAt));

    return NextResponse.json({ users: results });
  } catch (err) {
    console.error("Get users error:", err);
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
    const { email, password, role, firstName, lastName, departmentId, employeeId, studentId, designation } = body;

    if (!email || !password || !role || !firstName || !lastName) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const [newUser] = await db.insert(users).values({
      email: email.toLowerCase(),
      passwordHash,
      role,
      status: "active",
      firstName,
      lastName,
    }).returning();

    if (role === "teacher") {
      await db.insert(teachers).values({
        userId: newUser.id,
        departmentId: departmentId || null,
        employeeId: employeeId || `EMP${Date.now().toString().slice(-6)}`,
        designation: designation || "Lecturer",
      });
    } else if (role === "student") {
      await db.insert(students).values({
        userId: newUser.id,
        departmentId: departmentId || null,
        studentId: studentId || `STU${Date.now().toString().slice(-6)}`,
        enrollmentYear: new Date().getFullYear(),
      });
    }

    return NextResponse.json({ success: true, user: { id: newUser.id, email: newUser.email, role: newUser.role } });
  } catch (err) {
    console.error("Create user error:", err);
    if ((err as Error).message?.includes("unique")) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
