import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  pgEnum,
  index,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", ["super_admin", "teacher", "student"]);
export const userStatusEnum = pgEnum("user_status", ["active", "inactive", "suspended", "pending"]);
export const questionTypeEnum = pgEnum("question_type", ["mcq", "true_false", "short_answer", "long_answer", "numerical", "coding"]);
export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]);
export const examStatusEnum = pgEnum("exam_status", ["draft", "published", "active", "completed", "archived"]);
export const attemptStatusEnum = pgEnum("attempt_status", ["not_started", "in_progress", "completed", "terminated", "abandoned"]);
export const terminationReasonEnum = pgEnum("termination_reason", ["tab_switch", "fullscreen_exit", "time_expired", "manual", "system_error"]);
export const eventTypeEnum = pgEnum("event_type", [
  "face_missing", "multiple_faces", "unusual_head_movement", "looking_away",
  "suspicious_object", "suspicious_behavior", "tab_switch", "window_blur",
  "fullscreen_exit", "copy_attempt", "paste_attempt", "right_click",
  "keyboard_shortcut", "exam_started", "exam_completed", "exam_terminated",
  "face_verified", "system_check", "answer_saved", "focus_lost", "focus_regained"
]);
export const severityEnum = pgEnum("severity", ["info", "low", "medium", "high", "critical"]);
export const reviewStatusEnum = pgEnum("review_status", ["pending", "confirmed", "dismissed", "overridden"]);
export const notificationTypeEnum = pgEnum("notification_type", ["info", "warning", "critical", "success"]);

// ─── Departments ───────────────────────────────────────────────────────────────

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Users ─────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: userRoleEnum("role").notNull(),
  status: userStatusEnum("status").default("active").notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  profileImage: varchar("profile_image", { length: 500 }),
  lastLoginAt: timestamp("last_login_at"),
  loginCount: integer("login_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("users_email_idx").on(t.email),
  index("users_role_idx").on(t.role),
]);

// ─── Teachers ──────────────────────────────────────────────────────────────────

export const teachers = pgTable("teachers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  departmentId: integer("department_id").references(() => departments.id),
  employeeId: varchar("employee_id", { length: 50 }).unique(),
  designation: varchar("designation", { length: 100 }),
  specialization: varchar("specialization", { length: 200 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Students ──────────────────────────────────────────────────────────────────

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  departmentId: integer("department_id").references(() => departments.id),
  studentId: varchar("student_id", { length: 50 }).unique(),
  semester: integer("semester"),
  section: varchar("section", { length: 10 }),
  enrollmentYear: integer("enrollment_year"),
  referencePhotoUrl: varchar("reference_photo_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Subjects ──────────────────────────────────────────────────────────────────

export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  departmentId: integer("department_id").references(() => departments.id),
  creditHours: integer("credit_hours").default(3),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Questions ─────────────────────────────────────────────────────────────────

export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  createdBy: integer("created_by").notNull().references(() => users.id),
  subjectId: integer("subject_id").references(() => subjects.id),
  questionText: text("question_text").notNull(),
  questionType: questionTypeEnum("question_type").notNull(),
  difficulty: difficultyEnum("difficulty").default("medium").notNull(),
  marks: decimal("marks", { precision: 5, scale: 2 }).default("1").notNull(),
  topic: varchar("topic", { length: 200 }),
  chapter: varchar("chapter", { length: 200 }),
  explanation: text("explanation"),
  tags: text("tags").array(),
  correctAnswer: text("correct_answer"),
  isAiGenerated: boolean("is_ai_generated").default(false).notNull(),
  isPublished: boolean("is_published").default(false).notNull(),
  usageCount: integer("usage_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("questions_subject_idx").on(t.subjectId),
  index("questions_type_idx").on(t.questionType),
  index("questions_difficulty_idx").on(t.difficulty),
]);

// ─── Question Options ──────────────────────────────────────────────────────────

export const questionOptions = pgTable("question_options", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  optionText: text("option_text").notNull(),
  isCorrect: boolean("is_correct").default(false).notNull(),
  orderIndex: integer("order_index").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Exams ─────────────────────────────────────────────────────────────────────

export const exams = pgTable("exams", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  subjectId: integer("subject_id").references(() => subjects.id),
  createdBy: integer("created_by").notNull().references(() => users.id),
  totalMarks: decimal("total_marks", { precision: 8, scale: 2 }).notNull(),
  passingMarks: decimal("passing_marks", { precision: 8, scale: 2 }).notNull(),
  duration: integer("duration").notNull(), // in minutes
  startDateTime: timestamp("start_date_time").notNull(),
  endDateTime: timestamp("end_date_time").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  maxAttempts: integer("max_attempts").default(1).notNull(),
  negativeMarking: boolean("negative_marking").default(false).notNull(),
  negativeMarkValue: decimal("negative_mark_value", { precision: 5, scale: 2 }).default("0"),
  shuffleQuestions: boolean("shuffle_questions").default(true).notNull(),
  shuffleOptions: boolean("shuffle_options").default(true).notNull(),
  status: examStatusEnum("status").default("draft").notNull(),
  // Proctoring settings
  proctoringLevel: varchar("proctoring_level", { length: 50 }).default("standard").notNull(),
  requireCamera: boolean("require_camera").default(true).notNull(),
  requireMicrophone: boolean("require_microphone").default(false).notNull(),
  requireFullscreen: boolean("require_fullscreen").default(true).notNull(),
  tabSwitchTermination: boolean("tab_switch_termination").default(true).notNull(),
  fullscreenExitAction: varchar("fullscreen_exit_action", { length: 50 }).default("warn").notNull(),
  copyPasteProtection: boolean("copy_paste_protection").default(true).notNull(),
  faceVerification: boolean("face_verification").default(false).notNull(),
  showResultsToStudent: boolean("show_results_to_student").default(true).notNull(),
  showCorrectAnswers: boolean("show_correct_answers").default(false).notNull(),
  instructions: text("instructions"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("exams_status_idx").on(t.status),
  index("exams_created_by_idx").on(t.createdBy),
]);

// ─── Exam Questions ────────────────────────────────────────────────────────────

export const examQuestions = pgTable("exam_questions", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
  questionId: integer("question_id").notNull().references(() => questions.id),
  orderIndex: integer("order_index").default(0).notNull(),
  marks: decimal("marks", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("exam_questions_exam_idx").on(t.examId),
  uniqueIndex("exam_questions_unique").on(t.examId, t.questionId),
]);

// ─── Exam Enrollments ──────────────────────────────────────────────────────────

export const examEnrollments = pgTable("exam_enrollments", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
}, (t) => [
  uniqueIndex("exam_enrollments_unique").on(t.examId, t.studentId),
]);

// ─── Exam Attempts ─────────────────────────────────────────────────────────────

export const examAttempts = pgTable("exam_attempts", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").notNull().references(() => exams.id),
  studentId: integer("student_id").notNull().references(() => students.id),
  status: attemptStatusEnum("status").default("not_started").notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  terminatedAt: timestamp("terminated_at"),
  terminationReason: terminationReasonEnum("termination_reason"),
  retakeAllowed: boolean("retake_allowed").default(true).notNull(),
  score: decimal("score", { precision: 8, scale: 2 }),
  percentage: decimal("percentage", { precision: 5, scale: 2 }),
  isPassed: boolean("is_passed"),
  riskScore: integer("risk_score").default(0).notNull(),
  questionOrder: jsonb("question_order"), // Array of question IDs in display order
  optionOrders: jsonb("option_orders"),   // Map of questionId → shuffled option IDs
  serverTimeRemaining: integer("server_time_remaining"), // seconds
  lastHeartbeat: timestamp("last_heartbeat"),
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  attemptNumber: integer("attempt_number").default(1).notNull(),
  overrideBy: integer("override_by").references(() => users.id),
  overrideNote: text("override_note"),
  overrideAt: timestamp("override_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("exam_attempts_exam_idx").on(t.examId),
  index("exam_attempts_student_idx").on(t.studentId),
  index("exam_attempts_status_idx").on(t.status),
]);

// ─── Student Answers ───────────────────────────────────────────────────────────

export const studentAnswers = pgTable("student_answers", {
  id: serial("id").primaryKey(),
  attemptId: integer("attempt_id").notNull().references(() => examAttempts.id, { onDelete: "cascade" }),
  questionId: integer("question_id").notNull().references(() => questions.id),
  selectedOptionId: integer("selected_option_id").references(() => questionOptions.id),
  textAnswer: text("text_answer"),
  isCorrect: boolean("is_correct"),
  marksAwarded: decimal("marks_awarded", { precision: 5, scale: 2 }),
  answeredAt: timestamp("answered_at").defaultNow().notNull(),
  timeSpent: integer("time_spent").default(0), // seconds
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("student_answers_attempt_idx").on(t.attemptId),
  uniqueIndex("student_answers_unique").on(t.attemptId, t.questionId),
]);

// ─── Proctoring Events ─────────────────────────────────────────────────────────

export const proctoringEvents = pgTable("proctoring_events", {
  id: serial("id").primaryKey(),
  attemptId: integer("attempt_id").notNull().references(() => examAttempts.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => students.id),
  examId: integer("exam_id").notNull().references(() => exams.id),
  eventType: eventTypeEnum("event_type").notNull(),
  severity: severityEnum("severity").notNull(),
  confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 }),
  description: text("description"),
  metadata: jsonb("metadata"),
  evidenceUrl: varchar("evidence_url", { length: 500 }),
  riskPoints: integer("risk_points").default(0).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (t) => [
  index("proctoring_events_attempt_idx").on(t.attemptId),
  index("proctoring_events_type_idx").on(t.eventType),
  index("proctoring_events_severity_idx").on(t.severity),
]);

// ─── Teacher Reviews ───────────────────────────────────────────────────────────

export const teacherReviews = pgTable("teacher_reviews", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => proctoringEvents.id, { onDelete: "cascade" }),
  reviewerId: integer("reviewer_id").notNull().references(() => users.id),
  status: reviewStatusEnum("status").default("pending").notNull(),
  notes: text("notes"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Notifications ─────────────────────────────────────────────────────────────

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").default("info").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  relatedId: integer("related_id"),
  relatedType: varchar("related_type", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("notifications_user_idx").on(t.userId),
  index("notifications_read_idx").on(t.isRead),
]);

// ─── Audit Logs ────────────────────────────────────────────────────────────────

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  role: varchar("role", { length: 50 }),
  action: varchar("action", { length: 100 }).notNull(),
  target: varchar("target", { length: 255 }),
  targetId: integer("target_id"),
  metadata: jsonb("metadata"),
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (t) => [
  index("audit_logs_user_idx").on(t.userId),
  index("audit_logs_action_idx").on(t.action),
  index("audit_logs_timestamp_idx").on(t.timestamp),
]);

// ─── System Settings ───────────────────────────────────────────────────────────

export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  description: text("description"),
  updatedBy: integer("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── AI Generation Logs ────────────────────────────────────────────────────────

export const aiGenerationLogs = pgTable("ai_generation_logs", {
  id: serial("id").primaryKey(),
  requestedBy: integer("requested_by").notNull().references(() => users.id),
  subjectId: integer("subject_id").references(() => subjects.id),
  topic: varchar("topic", { length: 200 }),
  difficulty: difficultyEnum("difficulty"),
  questionType: questionTypeEnum("question_type"),
  count: integer("count").notNull(),
  generatedCount: integer("generated_count").default(0),
  prompt: text("prompt"),
  response: jsonb("response"),
  status: varchar("status", { length: 50 }).default("completed"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
