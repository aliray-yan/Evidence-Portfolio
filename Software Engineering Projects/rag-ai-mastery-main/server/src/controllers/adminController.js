import { prisma } from "../prisma/client.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const models = {
  levels: prisma.level,
  modules: prisma.module,
  lessons: prisma.lesson,
  quizzes: prisma.quizQuestion,
  exercises: prisma.practiceExercise,
  projects: prisma.guidedProject,
  tools: prisma.toolReference,
  achievements: prisma.achievement
};

function getModel(name) {
  const model = models[name];
  if (!model) {
    const error = new Error("Unknown admin resource");
    error.status = 404;
    throw error;
  }
  return model;
}

function orderFor(resource) {
  if (["levels", "modules", "lessons", "quizzes"].includes(resource)) {
    return { sortOrder: "asc" };
  }
  return { createdAt: "desc" };
}

export const getAdminStats = asyncHandler(async (_req, res) => {
  const [
    users,
    levels,
    modules,
    lessons,
    questions,
    exercises,
    projects,
    tools,
    documents,
    queryLogs,
    certificates
  ] = await Promise.all([
    prisma.user.count(),
    prisma.level.count(),
    prisma.module.count(),
    prisma.lesson.count(),
    prisma.quizQuestion.count(),
    prisma.practiceExercise.count(),
    prisma.guidedProject.count(),
    prisma.toolReference.count(),
    prisma.ragDocument.count(),
    prisma.ragQueryLog.count(),
    prisma.certificate.count()
  ]);

  res.json({
    stats: {
      users,
      levels,
      modules,
      lessons,
      questions,
      exercises,
      projects,
      tools,
      documents,
      queryLogs,
      certificates
    }
  });
});

export const listResource = asyncHandler(async (req, res) => {
  const model = getModel(req.params.resource);
  const items = await model.findMany({
    take: 100,
    orderBy: orderFor(req.params.resource)
  });
  res.json({ items });
});

export const createResource = asyncHandler(async (req, res) => {
  const model = getModel(req.params.resource);
  const item = await model.create({ data: req.body });
  res.status(201).json({ item });
});

export const updateResource = asyncHandler(async (req, res) => {
  const model = getModel(req.params.resource);
  const item = await model.update({
    where: { id: req.params.id },
    data: req.body
  });
  res.json({ item });
});

export const deleteResource = asyncHandler(async (req, res) => {
  const model = getModel(req.params.resource);
  await model.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
