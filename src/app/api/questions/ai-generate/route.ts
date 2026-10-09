import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { aiGenerationLogs } from "@/db/schema";
import { getSession } from "@/lib/auth";

// AI Question Generation - using built-in templates for demo
// In production, integrate with OpenAI/Google Gemini API
const generateQuestionsWithAI = (subject: string, topic: string, difficulty: string, type: string, count: number) => {
  const templates = {
    mcq: [
      {
        questionText: `Which of the following best describes ${topic} in ${subject}?`,
        options: [
          { text: `The primary mechanism of ${topic}`, isCorrect: true },
          { text: `An unrelated concept in ${subject}`, isCorrect: false },
          { text: `The opposite of ${topic}`, isCorrect: false },
          { text: `A deprecated approach to ${subject}`, isCorrect: false },
        ],
        correctAnswer: `The primary mechanism of ${topic}`,
        explanation: `${topic} in ${subject} refers to its primary mechanism and applications.`,
      },
      {
        questionText: `What is the main advantage of using ${topic} in ${subject}?`,
        options: [
          { text: "Improved efficiency and performance", isCorrect: true },
          { text: "Increased complexity", isCorrect: false },
          { text: "Higher memory usage", isCorrect: false },
          { text: "Reduced functionality", isCorrect: false },
        ],
        correctAnswer: "Improved efficiency and performance",
        explanation: `The main advantage of ${topic} is improved efficiency and performance in ${subject} applications.`,
      },
      {
        questionText: `In the context of ${subject}, ${topic} is primarily used for?`,
        options: [
          { text: "Solving complex computational problems", isCorrect: true },
          { text: "Basic file management", isCorrect: false },
          { text: "Network configuration", isCorrect: false },
          { text: "User interface design", isCorrect: false },
        ],
        correctAnswer: "Solving complex computational problems",
        explanation: `${topic} in ${subject} is primarily designed for solving complex computational problems efficiently.`,
      },
    ],
    true_false: [
      {
        questionText: `${topic} is a fundamental concept in ${subject}.`,
        options: [
          { text: "True", isCorrect: true },
          { text: "False", isCorrect: false },
        ],
        correctAnswer: "True",
        explanation: `Yes, ${topic} is indeed a fundamental concept in ${subject} and forms the basis for many advanced topics.`,
      },
      {
        questionText: `${topic} can be applied independently without knowledge of ${subject}.`,
        options: [
          { text: "True", isCorrect: false },
          { text: "False", isCorrect: true },
        ],
        correctAnswer: "False",
        explanation: `${topic} requires a solid understanding of ${subject} principles for effective application.`,
      },
    ],
    short_answer: [
      {
        questionText: `Define ${topic} in the context of ${subject} and explain its significance.`,
        options: [],
        correctAnswer: `${topic} refers to a core principle in ${subject} that enables efficient problem solving through systematic approaches. Its significance lies in providing structured methodologies for complex computational tasks.`,
        explanation: `A comprehensive definition should include the concept, its properties, and its practical applications in ${subject}.`,
      },
      {
        questionText: `Explain the relationship between ${topic} and other core concepts in ${subject}.`,
        options: [],
        correctAnswer: `${topic} is interconnected with other ${subject} concepts through shared principles of efficiency, abstraction, and problem decomposition. It builds upon foundational theory while enabling advanced applications.`,
        explanation: `Understanding the relationship helps in applying ${topic} effectively within the broader ${subject} framework.`,
      },
    ],
    long_answer: [
      {
        questionText: `Discuss the theoretical foundations of ${topic} in ${subject}. Include its history, key principles, common implementations, and real-world applications.`,
        options: [],
        correctAnswer: `${topic} has its foundations in classical ${subject} theory. Key principles include: (1) systematic problem decomposition, (2) efficient resource utilization, (3) scalable implementation strategies. Common implementations vary based on requirements, while real-world applications span multiple domains including software engineering, data analysis, and system design.`,
        explanation: `A complete answer should cover historical context, theoretical basis, implementation approaches, and practical use cases.`,
      },
    ],
    numerical: [
      {
        questionText: `If a ${topic} system in ${subject} processes 100 units per second, how many units will it process in 5 minutes?`,
        options: [],
        correctAnswer: "30000",
        explanation: "100 units/second × 60 seconds/minute × 5 minutes = 30,000 units",
      },
    ],
    coding: [
      {
        questionText: `Write a function in Python that implements a basic ${topic} algorithm for ${subject} applications. Include proper comments and test cases.`,
        options: [],
        correctAnswer: `def ${topic.toLowerCase().replace(/\s+/g, '_')}(input_data):\n    """\n    Implements ${topic} for ${subject}\n    Args:\n        input_data: The data to process\n    Returns:\n        Processed result\n    """\n    # Implementation here\n    result = []\n    for item in input_data:\n        # Process each item\n        processed = item  # Replace with actual logic\n        result.append(processed)\n    return result\n\n# Test cases\nif __name__ == '__main__':\n    test_data = [1, 2, 3, 4, 5]\n    print(${topic.toLowerCase().replace(/\s+/g, '_')}(test_data))`,
        explanation: `A good implementation should be clean, well-commented, handle edge cases, and include test cases.`,
      },
    ],
  };

  const typeKey = type as keyof typeof templates;
  const questionPool = templates[typeKey] || templates.mcq;

  const result = [];
  for (let i = 0; i < count; i++) {
    const template = questionPool[i % questionPool.length];
    const difficultyMarks = difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 3;
    result.push({
      ...template,
      questionType: type,
      difficulty,
      marks: difficultyMarks,
      topic,
      tags: [subject, topic, difficulty],
    });
  }
  return result;
};

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !["teacher", "super_admin"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { subject, topic, difficulty, questionType, count, subjectId } = body;

    if (!subject || !topic || !questionType || !count) {
      return NextResponse.json({ error: "Subject, topic, question type and count are required" }, { status: 400 });
    }

    const generatedQuestions = generateQuestionsWithAI(subject, topic, difficulty || "medium", questionType, Math.min(count, 10));

    // Log the generation
    await db.insert(aiGenerationLogs).values({
      requestedBy: session.userId,
      subjectId: subjectId || null,
      topic,
      difficulty: (difficulty || "medium") as "easy" | "medium" | "hard",
      questionType: questionType as "mcq" | "true_false" | "short_answer" | "long_answer" | "numerical" | "coding",
      count,
      generatedCount: generatedQuestions.length,
      prompt: `Generate ${count} ${difficulty} ${questionType} questions about ${topic} in ${subject}`,
      response: generatedQuestions,
      status: "completed",
    });

    return NextResponse.json({
      success: true,
      questions: generatedQuestions,
      message: `Generated ${generatedQuestions.length} questions. Please review and edit before publishing.`,
    });
  } catch (err) {
    console.error("AI generate error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
