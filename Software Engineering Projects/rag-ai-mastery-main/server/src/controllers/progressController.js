import crypto from "crypto";
import { prisma } from "../prisma/client.js";
import { evaluateAchievements } from "../services/achievementService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function answerMatches(question, answer) {
  const correct = question.correctAnswer;
  if (question.type === "ORDERING") {
    return JSON.stringify(answer) === JSON.stringify(correct.order);
  }
  if (question.type === "TRUE_FALSE") {
    return Boolean(answer) === Boolean(correct.value);
  }
  return String(answer) === String(correct.index ?? correct.value);
}

export const getDashboard = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const [totalLessons, completed, attempts, bookmarks, notes, achievements, recentLessons, levels, documents, logs] =
    await Promise.all([
      prisma.lesson.count(),
      prisma.userProgress.count({ where: { userId, status: "COMPLETED" } }),
      prisma.quizAttempt.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { lesson: { select: { title: true, slug: true } } }
      }),
      prisma.bookmark.findMany({
        where: { userId },
        take: 6,
        orderBy: { createdAt: "desc" },
        include: { lesson: { select: { title: true, slug: true, summary: true } } }
      }),
      prisma.note.count({ where: { userId } }),
      prisma.userAchievement.findMany({
        where: { userId },
        include: { achievement: true },
        orderBy: { awardedAt: "desc" }
      }),
      prisma.userProgress.findMany({
        where: { userId },
        take: 8,
        orderBy: { updatedAt: "desc" },
        include: {
          lesson: {
            select: {
              title: true,
              slug: true,
              module: { select: { level: { select: { number: true, title: true } } } }
            }
          }
        }
      }),
      prisma.level.findMany({
        orderBy: { sortOrder: "asc" },
        include: {
          modules: {
            select: {
              lessons: { select: { id: true } }
            }
          }
        }
      }),
      prisma.ragDocument.count({ where: { userId } }),
      prisma.ragQueryLog.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 })
    ]);

  const progressRows = await prisma.userProgress.findMany({ where: { userId, status: "COMPLETED" } });
  const completedLessonIds = new Set(progressRows.map((row) => row.lessonId));

  const skillTree = levels.map((level) => {
    const lessonIds = level.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id));
    const done = lessonIds.filter((id) => completedLessonIds.has(id)).length;
    return {
      id: level.id,
      number: level.number,
      title: level.title,
      total: lessonIds.length,
      completed: done,
      percent: lessonIds.length ? Math.round((done / lessonIds.length) * 100) : 0
    };
  });

  const averageQuiz =
    attempts.length === 0
      ? 0
      : Math.round(attempts.reduce((sum, attempt) => sum + (attempt.score / attempt.total) * 100, 0) / attempts.length);

  res.json({
    user: req.user,
    stats: {
      totalLessons,
      completedLessons: completed,
      percentComplete: totalLessons ? Math.round((completed / totalLessons) * 100) : 0,
      averageQuiz,
      bookmarks: bookmarks.length,
      notes,
      achievements: achievements.length,
      ragDocuments: documents
    },
    attempts,
    bookmarks,
    achievements,
    recentLessons,
    skillTree,
    ragLogs: logs
  });
});

export const completeLesson = asyncHandler(async (req, res) => {
  const lesson = await prisma.lesson.findUnique({ where: { id: req.params.lessonId } });
  if (!lesson) {
    return res.status(404).json({ message: "Lesson not found" });
  }

  const progress = await prisma.userProgress.upsert({
    where: { userId_lessonId: { userId: req.user.id, lessonId: lesson.id } },
    update: { status: "COMPLETED", completedAt: new Date() },
    create: {
      userId: req.user.id,
      lessonId: lesson.id,
      status: "COMPLETED",
      completedAt: new Date()
    }
  });

  await evaluateAchievements(req.user.id);
  res.json({ progress });
});

export const submitQuizAttempt = asyncHandler(async (req, res) => {
  const lessonId = req.body.lessonId;
  const answers = req.body.answers || {};
  const questions = await prisma.quizQuestion.findMany({
    where: lessonId ? { lessonId } : { id: { in: Object.keys(answers) } },
    orderBy: { sortOrder: "asc" }
  });

  if (!questions.length) {
    return res.status(400).json({ message: "No quiz questions found" });
  }

  const feedback = questions.map((question) => {
    const answer = answers[question.id];
    const correct = answerMatches(question, answer);
    return {
      questionId: question.id,
      correct,
      answer,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation
    };
  });

  const score = feedback.filter((item) => item.correct).length;
  const attempt = await prisma.quizAttempt.create({
    data: {
      userId: req.user.id,
      lessonId: lessonId || null,
      score,
      total: questions.length,
      answers,
      feedback
    }
  });

  if (lessonId) {
    await prisma.userProgress.upsert({
      where: { userId_lessonId: { userId: req.user.id, lessonId } },
      update: { score: Math.round((score / questions.length) * 100), status: "IN_PROGRESS" },
      create: {
        userId: req.user.id,
        lessonId,
        score: Math.round((score / questions.length) * 100),
        status: "IN_PROGRESS"
      }
    });
  }

  await evaluateAchievements(req.user.id);
  res.status(201).json({ attempt, feedback });
});

export const upsertNote = asyncHandler(async (req, res) => {
  const content = String(req.body.content || "").slice(0, 8000);
  const note = await prisma.note.upsert({
    where: { userId_lessonId: { userId: req.user.id, lessonId: req.params.lessonId } },
    update: { content },
    create: {
      userId: req.user.id,
      lessonId: req.params.lessonId,
      content
    }
  });

  res.json({ note });
});

export const deleteNote = asyncHandler(async (req, res) => {
  await prisma.note.deleteMany({
    where: { userId: req.user.id, lessonId: req.params.lessonId }
  });
  res.status(204).send();
});

export const addBookmark = asyncHandler(async (req, res) => {
  const bookmark = await prisma.bookmark.upsert({
    where: { userId_lessonId: { userId: req.user.id, lessonId: req.params.lessonId } },
    update: {},
    create: { userId: req.user.id, lessonId: req.params.lessonId }
  });
  await evaluateAchievements(req.user.id);
  res.status(201).json({ bookmark });
});

export const removeBookmark = asyncHandler(async (req, res) => {
  await prisma.bookmark.deleteMany({
    where: { userId: req.user.id, lessonId: req.params.lessonId }
  });
  res.status(204).send();
});

export const getBookmarks = asyncHandler(async (req, res) => {
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      lesson: {
        select: {
          title: true,
          slug: true,
          summary: true,
          module: { select: { title: true, level: { select: { number: true, title: true } } } }
        }
      }
    }
  });
  res.json({ bookmarks });
});

export const createCertificate = asyncHandler(async (req, res) => {
  const title = req.body.title || "RAG AI Mastery Completion Certificate";
  const certificate = await prisma.certificate.create({
    data: {
      userId: req.user.id,
      title,
      verificationCode: crypto.randomBytes(8).toString("hex").toUpperCase()
    }
  });
  res.status(201).json({ certificate });
});
