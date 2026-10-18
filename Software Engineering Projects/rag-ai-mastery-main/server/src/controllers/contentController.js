import { prisma } from "../prisma/client.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const lessonListSelect = {
  id: true,
  title: true,
  slug: true,
  difficulty: true,
  estimatedMinutes: true,
  summary: true,
  tags: true,
  sortOrder: true
};

export const getOverview = asyncHandler(async (_req, res) => {
  const [levels, lessons, quizzes, exercises, projects, tools] = await Promise.all([
    prisma.level.count(),
    prisma.lesson.count(),
    prisma.quizQuestion.count(),
    prisma.practiceExercise.count(),
    prisma.guidedProject.count(),
    prisma.toolReference.count()
  ]);

  const firstLevels = await prisma.level.findMany({
    take: 5,
    orderBy: { sortOrder: "asc" },
    include: {
      modules: {
        take: 2,
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: {
            take: 2,
            orderBy: { sortOrder: "asc" },
            select: lessonListSelect
          }
        }
      }
    }
  });

  res.json({
    stats: { levels, lessons, quizzes, exercises, projects, tools },
    firstLevels
  });
});

export const getLevels = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const levels = await prisma.level.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      modules: {
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: {
            orderBy: { sortOrder: "asc" },
            select: lessonListSelect
          }
        }
      }
    }
  });

  let progressByLesson = {};
  if (userId) {
    const progress = await prisma.userProgress.findMany({ where: { userId } });
    progressByLesson = Object.fromEntries(progress.map((item) => [item.lessonId, item.status]));
  }

  res.json({ levels, progressByLesson });
});

export const getLevel = asyncHandler(async (req, res) => {
  const maybeNumber = Number(req.params.levelId);
  const where = Number.isInteger(maybeNumber) ? { number: maybeNumber } : { id: req.params.levelId };

  const level = await prisma.level.findUnique({
    where,
    include: {
      modules: {
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: {
            orderBy: { sortOrder: "asc" },
            select: lessonListSelect
          },
          exercises: {
            orderBy: { createdAt: "asc" },
            take: 3
          }
        }
      },
      guidedProjects: {
        orderBy: { createdAt: "asc" },
        take: 6
      }
    }
  });

  if (!level) {
    return res.status(404).json({ message: "Level not found" });
  }

  res.json({ level });
});

export const getLesson = asyncHandler(async (req, res) => {
  const lesson = await prisma.lesson.findUnique({
    where: { slug: req.params.slug },
    include: {
      module: {
        include: {
          level: true
        }
      },
      quizQuestions: {
        orderBy: { sortOrder: "asc" }
      }
    }
  });

  if (!lesson) {
    return res.status(404).json({ message: "Lesson not found" });
  }

  let userState = null;
  if (req.user?.id) {
    const [progress, bookmark, note] = await Promise.all([
      prisma.userProgress.findUnique({
        where: { userId_lessonId: { userId: req.user.id, lessonId: lesson.id } }
      }),
      prisma.bookmark.findUnique({
        where: { userId_lessonId: { userId: req.user.id, lessonId: lesson.id } }
      }),
      prisma.note.findUnique({
        where: { userId_lessonId: { userId: req.user.id, lessonId: lesson.id } }
      })
    ]);
    userState = { progress, bookmarked: Boolean(bookmark), note };
  }

  res.json({ lesson, userState });
});

export const getLessonQuiz = asyncHandler(async (req, res) => {
  const quizQuestions = await prisma.quizQuestion.findMany({
    where: { lessonId: req.params.lessonId },
    orderBy: { sortOrder: "asc" }
  });

  res.json({ quizQuestions });
});

export const getFinalExam = asyncHandler(async (req, res) => {
  const level = await prisma.level.findUnique({
    where: { number: Number(req.params.levelNumber) },
    include: {
      modules: {
        include: {
          lessons: {
            select: {
              id: true
            }
          }
        }
      }
    }
  });

  if (!level) {
    return res.status(404).json({ message: "Level not found" });
  }

  const lessonIds = level.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id));
  const questions = await prisma.quizQuestion.findMany({
    where: { lessonId: { in: lessonIds } },
    take: 15,
    orderBy: { sortOrder: "asc" }
  });

  res.json({ level: { id: level.id, number: level.number, title: level.title }, questions });
});

export const getExercises = asyncHandler(async (req, res) => {
  const difficulty = req.query.difficulty;
  const exercises = await prisma.practiceExercise.findMany({
    where: difficulty ? { difficulty } : undefined,
    orderBy: { createdAt: "asc" },
    include: {
      module: {
        select: {
          title: true,
          level: { select: { number: true, title: true } }
        }
      }
    }
  });

  res.json({ exercises });
});

export const getProjects = asyncHandler(async (_req, res) => {
  const projects = await prisma.guidedProject.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      level: { select: { number: true, title: true } }
    }
  });

  res.json({ projects });
});

export const getTools = asyncHandler(async (_req, res) => {
  const tools = await prisma.toolReference.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }]
  });

  res.json({ tools });
});

export const getAchievements = asyncHandler(async (_req, res) => {
  const achievements = await prisma.achievement.findMany({
    orderBy: [{ points: "asc" }, { title: "asc" }]
  });

  res.json({ achievements });
});

export const searchLessons = asyncHandler(async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (q.length < 2) {
    return res.json({ lessons: [] });
  }

  const lessons = await prisma.lesson.findMany({
    where: {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { simpleExplanation: { contains: q, mode: "insensitive" } },
        { technicalExplanation: { contains: q, mode: "insensitive" } },
        { summary: { contains: q, mode: "insensitive" } }
      ]
    },
    take: 20,
    orderBy: { sortOrder: "asc" },
    select: {
      ...lessonListSelect,
      module: {
        select: {
          title: true,
          level: { select: { number: true, title: true } }
        }
      }
    }
  });

  res.json({ lessons });
});
