import { Router } from "express";
import {
  addBookmark,
  completeLesson,
  createCertificate,
  deleteNote,
  getBookmarks,
  getDashboard,
  removeBookmark,
  submitQuizAttempt,
  upsertNote
} from "../controllers/progressController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/dashboard", getDashboard);
router.post("/lessons/:lessonId/complete", completeLesson);
router.post("/quiz-attempts", submitQuizAttempt);
router.get("/bookmarks", getBookmarks);
router.post("/bookmarks/:lessonId", addBookmark);
router.delete("/bookmarks/:lessonId", removeBookmark);
router.post("/notes/:lessonId", upsertNote);
router.delete("/notes/:lessonId", deleteNote);
router.post("/certificate", createCertificate);

export default router;
