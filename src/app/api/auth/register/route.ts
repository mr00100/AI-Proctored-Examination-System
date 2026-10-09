import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, students, departments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, firstName, lastName, studentId, departmentId } = body;

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // Check existing
    const [existing] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const [newUser] = await db.insert(users).values({
      email: email.toLowerCase(),
      passwordHash,
      role: "student",
      status: "active",
      firstName,
      lastName,
    }).returning();

    // Get or find department
    let deptId = departmentId || null;
    if (!deptId) {
      const [dept] = await db.select().from(departments).limit(1);
      deptId = dept?.id || null;
    }

    await db.insert(students).values({
      userId: newUser.id,
      departmentId: deptId,
      studentId: studentId || `STU${Date.now().toString().slice(-6)}`,
      semester: 1,
      enrollmentYear: new Date().getFullYear(),
    });

    return NextResponse.json({ success: true, message: "Registration successful" });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
