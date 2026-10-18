import { prisma } from "../prisma/client.js";

async function awardByCode(userId, code) {
  const achievement = await prisma.achievement.findUnique({ where: { code } });
  if (!achievement) {
    return null;
  }

  return prisma.userAchievement.upsert({
    where: { userId_achievementId: { userId, achievementId: achievement.id } },
    update: {},
    create: { userId, achievementId: achievement.id }
  });
}

export async function evaluateAchievements(userId) {
  const [completed, attempts, docs, bookmarks] = await Promise.all([
    prisma.userProgress.count({ where: { userId, status: "COMPLETED" } }),
    prisma.quizAttempt.count({ where: { userId } }),
    prisma.ragDocument.count({ where: { userId } }),
    prisma.bookmark.count({ where: { userId } })
  ]);

  const awards = [];
  if (completed >= 1) awards.push("FIRST_LESSON");
  if (completed >= 10) awards.push("TEN_LESSONS");
  if (completed >= 25) awards.push("PATH_BUILDER");
  if (attempts >= 1) awards.push("QUIZ_TAKER");
  if (attempts >= 10) awards.push("QUIZ_MACHINE");
  if (docs >= 1) awards.push("FIRST_RAG_UPLOAD");
  if (docs >= 5) awards.push("DOCUMENT_INGESTOR");
  if (bookmarks >= 3) awards.push("CURIOUS_BOOKMARKER");

  await Promise.all(awards.map((code) => awardByCode(userId, code)));
}
