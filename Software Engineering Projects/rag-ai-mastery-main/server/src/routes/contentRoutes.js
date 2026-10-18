import { Router } from "express";
import {
  getAchievements,
  getExercises,
  getFinalExam,
  getLesson,
  getLessonQuiz,
  getLevel,
  getLevels,
  getOverview,
  getProjects,
  getTools,
  searchLessons
} from "../controllers/contentController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/overview", getOverview);
router.get("/levels", requireAuth, getLevels);
router.get("/levels/:levelId", requireAuth, getLevel);
router.get("/levels/:levelNumber/final-exam", requireAuth, getFinalExam);
router.get("/lessons/:slug", requireAuth, getLesson);
router.get("/lessons/:lessonId/quiz", requireAuth, getLessonQuiz);
router.get("/exercises", requireAuth, getExercises);
router.get("/projects", requireAuth, getProjects);
router.get("/tools", requireAuth, getTools);
router.get("/achievements", requireAuth, getAchievements);
router.get("/search", requireAuth, searchLessons);

export default router;
