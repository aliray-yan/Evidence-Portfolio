import { Router } from "express";
import {
  getDocument,
  getLogs,
  listDocuments,
  previewChunks,
  queryDocument,
  upload,
  uploadDocument
} from "../controllers/ragController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.post("/preview-chunks", previewChunks);
router.post("/documents", upload.single("document"), uploadDocument);
router.get("/documents", listDocuments);
router.get("/documents/:documentId", getDocument);
router.post("/documents/:documentId/query", queryDocument);
router.get("/logs", getLogs);

export default router;
