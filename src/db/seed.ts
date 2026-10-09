import { db } from "./index";
import {
  users, teachers, students, departments, subjects,
  exams, questions, questionOptions, examQuestions,
  systemSettings, examEnrollments,
} from "./schema";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";

async function seed() {
  console.log("🌱 Starting seed...");

  // Clean existing data
  await db.execute(sql`TRUNCATE TABLE audit_logs, notifications, teacher_reviews, proctoring_events, student_answers, exam_attempts, exam_enrollments, exam_questions, question_options, questions, exams, subjects, students, teachers, users, departments, system_settings, ai_generation_logs RESTART IDENTITY CASCADE`);

  // ── Departments ──
  const [csDept, eeDept, mbaDept] = await db.insert(departments).values([
    { name: "Computer Science", code: "CS", description: "Department of Computer Science and Engineering" },
    { name: "Electrical Engineering", code: "EE", description: "Department of Electrical Engineering" },
    { name: "Business Administration", code: "MBA", description: "Department of Business Administration" },
  ]).returning();

  // ── Users ──
  const adminHash = await bcrypt.hash("Admin@123", 12);
  const teacherHash = await bcrypt.hash("Teacher@123", 12);
  const studentHash = await bcrypt.hash("Student@123", 12);

  const [adminUser] = await db.insert(users).values([
    {
      email: "admin@examguard.edu",
      passwordHash: adminHash,
      role: "super_admin",
      status: "active",
      firstName: "System",
      lastName: "Administrator",
    }
  ]).returning();

  const [teacher1User, teacher2User] = await db.insert(users).values([
    {
      email: "dr.ahmed@examguard.edu",
      passwordHash: teacherHash,
      role: "teacher",
      status: "active",
      firstName: "Dr. Ahmad",
      lastName: "Hassan",
    },
    {
      email: "prof.sara@examguard.edu",
      passwordHash: teacherHash,
      role: "teacher",
      status: "active",
      firstName: "Prof. Sara",
      lastName: "Khan",
    }
  ]).returning();

  const studentUsers = await db.insert(users).values([
    { email: "ali.raza@student.edu", passwordHash: studentHash, role: "student", status: "active", firstName: "Ali", lastName: "Raza" },
    { email: "fatima.malik@student.edu", passwordHash: studentHash, role: "student", status: "active", firstName: "Fatima", lastName: "Malik" },
    { email: "usman.ali@student.edu", passwordHash: studentHash, role: "student", status: "active", firstName: "Usman", lastName: "Ali" },
    { email: "ayesha.khan@student.edu", passwordHash: studentHash, role: "student", status: "active", firstName: "Ayesha", lastName: "Khan" },
    { email: "bilal.ahmed@student.edu", passwordHash: studentHash, role: "student", status: "active", firstName: "Bilal", lastName: "Ahmed" },
  ]).returning();

  // ── Teachers ──
  const [teacher1] = await db.insert(teachers).values([
    { userId: teacher1User.id, departmentId: csDept.id, employeeId: "EMP001", designation: "Associate Professor", specialization: "AI & Machine Learning" },
    { userId: teacher2User.id, departmentId: csDept.id, employeeId: "EMP002", designation: "Assistant Professor", specialization: "Data Structures & Algorithms" },
  ]).returning();

  // ── Students ──
  const insertedStudents = await db.insert(students).values(
    studentUsers.map((u, i) => ({
      userId: u.id,
      departmentId: csDept.id,
      studentId: `CS${2021000 + i}`,
      semester: 7,
      section: "A",
      enrollmentYear: 2021,
    }))
  ).returning();

  // ── Subjects ──
  const [subject1, subject2, subject3] = await db.insert(subjects).values([
    { name: "Artificial Intelligence", code: "CS-471", departmentId: csDept.id, creditHours: 3, description: "Introduction to AI concepts, search, planning and machine learning" },
    { name: "Data Structures & Algorithms", code: "CS-301", departmentId: csDept.id, creditHours: 3, description: "Fundamental data structures and algorithm design" },
    { name: "Database Systems", code: "CS-341", departmentId: csDept.id, creditHours: 3, description: "Relational database design, SQL, and advanced database topics" },
  ]).returning();

  // ── Questions for AI exam ──
  const aiQuestions = await db.insert(questions).values([
    {
      createdBy: teacher1User.id, subjectId: subject1.id,
      questionText: "Which of the following is the correct definition of Artificial Intelligence?",
      questionType: "mcq", difficulty: "easy", marks: "2",
      topic: "Introduction", chapter: "Chapter 1",
      correctAnswer: "The simulation of human intelligence in machines",
      tags: ["AI", "definition", "introduction"], isPublished: true,
    },
    {
      createdBy: teacher1User.id, subjectId: subject1.id,
      questionText: "What is the Turing Test designed to evaluate?",
      questionType: "mcq", difficulty: "medium", marks: "2",
      topic: "History of AI", chapter: "Chapter 1",
      correctAnswer: "Whether a machine can exhibit intelligent behavior equivalent to a human",
      tags: ["Turing", "test", "intelligence"], isPublished: true,
    },
    {
      createdBy: teacher1User.id, subjectId: subject1.id,
      questionText: "Which search algorithm is guaranteed to find the optimal solution if one exists?",
      questionType: "mcq", difficulty: "medium", marks: "2",
      topic: "Search Algorithms", chapter: "Chapter 3",
      correctAnswer: "A* Search",
      tags: ["search", "algorithm", "optimal"], isPublished: true,
    },
    {
      createdBy: teacher1User.id, subjectId: subject1.id,
      questionText: "What does 'ML' stand for in the context of AI?",
      questionType: "mcq", difficulty: "easy", marks: "1",
      topic: "Machine Learning", chapter: "Chapter 5",
      correctAnswer: "Machine Learning",
      tags: ["ML", "machine learning"], isPublished: true,
    },
    {
      createdBy: teacher1User.id, subjectId: subject1.id,
      questionText: "In a neural network, what is the activation function used for?",
      questionType: "mcq", difficulty: "hard", marks: "3",
      topic: "Neural Networks", chapter: "Chapter 6",
      correctAnswer: "To introduce non-linearity into the output of a neuron",
      tags: ["neural network", "activation", "non-linearity"], isPublished: true,
    },
    {
      createdBy: teacher1User.id, subjectId: subject1.id,
      questionText: "Deep Learning is a subset of Machine Learning.",
      questionType: "true_false", difficulty: "easy", marks: "1",
      topic: "Deep Learning", chapter: "Chapter 6",
      correctAnswer: "true",
      tags: ["deep learning", "true/false"], isPublished: true,
    },
    {
      createdBy: teacher1User.id, subjectId: subject1.id,
      questionText: "Explain the difference between supervised and unsupervised learning in machine learning.",
      questionType: "short_answer", difficulty: "medium", marks: "5",
      topic: "Machine Learning", chapter: "Chapter 5",
      correctAnswer: "Supervised learning uses labeled training data to learn a mapping function, while unsupervised learning finds patterns in unlabeled data without predefined answers.",
      tags: ["supervised", "unsupervised", "learning"], isPublished: true,
    },
    {
      createdBy: teacher1User.id, subjectId: subject1.id,
      questionText: "What is overfitting in machine learning and how can it be prevented?",
      questionType: "short_answer", difficulty: "hard", marks: "5",
      topic: "Machine Learning", chapter: "Chapter 5",
      correctAnswer: "Overfitting occurs when a model learns the training data too well including noise. Prevention techniques include regularization, dropout, cross-validation, and more training data.",
      tags: ["overfitting", "regularization"], isPublished: true,
    },
    {
      createdBy: teacher1User.id, subjectId: subject1.id,
      questionText: "The A* algorithm uses which heuristic function?",
      questionType: "mcq", difficulty: "hard", marks: "3",
      topic: "Search Algorithms", chapter: "Chapter 3",
      correctAnswer: "f(n) = g(n) + h(n)",
      tags: ["A*", "heuristic", "search"], isPublished: true,
    },
    {
      createdBy: teacher1User.id, subjectId: subject1.id,
      questionText: "Which of the following is NOT a type of machine learning?",
      questionType: "mcq", difficulty: "medium", marks: "2",
      topic: "Machine Learning Types", chapter: "Chapter 5",
      correctAnswer: "Deterministic Learning",
      tags: ["machine learning", "types"], isPublished: true,
    },
  ]).returning();

  // ── Question Options ──
  const optionsData = [
    // Q1
    { questionId: aiQuestions[0].id, options: [
      { text: "The simulation of human intelligence in machines", isCorrect: true },
      { text: "A programming language for robots", isCorrect: false },
      { text: "The study of computer hardware components", isCorrect: false },
      { text: "A method to speed up internet connections", isCorrect: false },
    ]},
    // Q2
    { questionId: aiQuestions[1].id, options: [
      { text: "Whether a machine can exhibit intelligent behavior equivalent to a human", isCorrect: true },
      { text: "How fast a computer can perform calculations", isCorrect: false },
      { text: "The programming efficiency of AI software", isCorrect: false },
      { text: "The memory capacity of artificial neural networks", isCorrect: false },
    ]},
    // Q3
    { questionId: aiQuestions[2].id, options: [
      { text: "A* Search", isCorrect: true },
      { text: "Depth-First Search", isCorrect: false },
      { text: "Breadth-First Search", isCorrect: false },
      { text: "Hill Climbing", isCorrect: false },
    ]},
    // Q4
    { questionId: aiQuestions[3].id, options: [
      { text: "Machine Learning", isCorrect: true },
      { text: "Meta Learning", isCorrect: false },
      { text: "Micro Learning", isCorrect: false },
      { text: "Manual Learning", isCorrect: false },
    ]},
    // Q5
    { questionId: aiQuestions[4].id, options: [
      { text: "To introduce non-linearity into the output of a neuron", isCorrect: true },
      { text: "To calculate the gradient of the loss function", isCorrect: false },
      { text: "To normalize the input features", isCorrect: false },
      { text: "To reduce the dimensionality of data", isCorrect: false },
    ]},
    // Q6 (True/False)
    { questionId: aiQuestions[5].id, options: [
      { text: "True", isCorrect: true },
      { text: "False", isCorrect: false },
    ]},
    // Q9
    { questionId: aiQuestions[8].id, options: [
      { text: "f(n) = g(n) + h(n)", isCorrect: true },
      { text: "f(n) = g(n) * h(n)", isCorrect: false },
      { text: "f(n) = g(n) - h(n)", isCorrect: false },
      { text: "f(n) = h(n) / g(n)", isCorrect: false },
    ]},
    // Q10
    { questionId: aiQuestions[9].id, options: [
      { text: "Deterministic Learning", isCorrect: true },
      { text: "Supervised Learning", isCorrect: false },
      { text: "Reinforcement Learning", isCorrect: false },
      { text: "Unsupervised Learning", isCorrect: false },
    ]},
  ];

  for (const { questionId, options } of optionsData) {
    await db.insert(questionOptions).values(
      options.map((o, i) => ({ questionId, optionText: o.text, isCorrect: o.isCorrect, orderIndex: i }))
    );
  }

  // ── Exams ──
  const now = new Date();
  const examStart = new Date(now.getTime() - 60 * 60 * 1000); // started 1 hour ago
  const examEnd = new Date(now.getTime() + 5 * 60 * 60 * 1000); // ends 5 hours from now
  const futureStart = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const futureEnd = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000);

  const [exam1] = await db.insert(exams).values([
    {
      title: "Artificial Intelligence — Midterm Examination",
      description: "This exam covers AI fundamentals, search algorithms, and machine learning basics.",
      subjectId: subject1.id,
      createdBy: teacher1User.id,
      totalMarks: "26",
      passingMarks: "13",
      duration: 90,
      startDateTime: examStart,
      endDateTime: examEnd,
      totalQuestions: 10,
      maxAttempts: 1,
      shuffleQuestions: true,
      shuffleOptions: true,
      status: "active",
      proctoringLevel: "standard",
      requireCamera: true,
      requireMicrophone: false,
      requireFullscreen: true,
      tabSwitchTermination: true,
      fullscreenExitAction: "warn",
      copyPasteProtection: true,
      faceVerification: false,
      showResultsToStudent: true,
      showCorrectAnswers: false,
      instructions: "1. This is a closed-book examination.\n2. All questions are mandatory.\n3. Do not switch tabs or minimize the browser.\n4. Ensure your camera is active throughout the exam.\n5. Tab switching will result in immediate termination.",
    },
    {
      title: "Data Structures — Quiz 2",
      description: "Quiz covering sorting algorithms and tree data structures.",
      subjectId: subject2.id,
      createdBy: teacher1User.id,
      totalMarks: "20",
      passingMarks: "10",
      duration: 45,
      startDateTime: futureStart,
      endDateTime: futureEnd,
      totalQuestions: 5,
      maxAttempts: 1,
      shuffleQuestions: true,
      shuffleOptions: true,
      status: "published",
      proctoringLevel: "standard",
      requireCamera: true,
      requireMicrophone: false,
      requireFullscreen: true,
      tabSwitchTermination: true,
      fullscreenExitAction: "terminate",
      copyPasteProtection: true,
      showResultsToStudent: true,
    },
  ]).returning();

  // ── Exam Questions ──
  await db.insert(examQuestions).values(
    aiQuestions.map((q, i) => ({ examId: exam1.id, questionId: q.id, orderIndex: i, marks: q.marks }))
  );

  // ── Enroll all students in exam1 ──
  await db.insert(examEnrollments).values(
    insertedStudents.map((s) => ({ examId: exam1.id, studentId: s.id }))
  );

  // ── System Settings ──
  await db.insert(systemSettings).values([
    { key: "system_name", value: "AI ExamGuard", description: "System display name" },
    { key: "institution_name", value: "National University of Technology", description: "Institution name" },
    { key: "max_login_attempts", value: "5", description: "Maximum failed login attempts before lockout" },
    { key: "session_timeout", value: "24", description: "Session timeout in hours" },
    { key: "default_risk_threshold", value: "75", description: "Risk score threshold for critical alerts" },
    { key: "face_verification_enabled", value: "false", description: "Enable biometric face verification" },
    { key: "ai_proctoring_enabled", value: "true", description: "Enable AI-based proctoring" },
    { key: "demo_mode", value: "true", description: "Enable demo mode with sample data" },
    { key: "evidence_retention_days", value: "90", description: "Days to retain proctoring evidence" },
  ]);

  console.log("✅ Seed completed successfully!");
  console.log("\n📋 Demo Accounts:");
  console.log("  Super Admin: admin@examguard.edu / Admin@123");
  console.log("  Teacher:     dr.ahmed@examguard.edu / Teacher@123");
  console.log("  Student:     ali.raza@student.edu / Student@123");
}

seed().catch(console.error).finally(() => process.exit(0));
