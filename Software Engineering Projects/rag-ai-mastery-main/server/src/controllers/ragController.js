import multer from "multer";
import { config } from "../config.js";
import { prisma } from "../prisma/client.js";
import { answerQuestion, prepareChunks } from "../rag/ragService.js";
import { evaluateAchievements } from "../services/achievementService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { normalizeText, sanitizeFilename } from "../utils/sanitize.js";

const allowedExtensions = [".txt", ".md", ".markdown"];
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: config.maxUploadMb * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const lower = file.originalname.toLowerCase();
    const allowed = allowedExtensions.some((extension) => lower.endsWith(extension));
    callback(allowed ? null : new Error("Only TXT and Markdown files are allowed"), allowed);
  }
});

export const previewChunks = asyncHandler(async (req, res) => {
  const text = normalizeText(req.body.text || "");
  if (!text) {
    return res.status(400).json({ message: "Text is required" });
  }

  const chunks = prepareChunks(text, {
    chunkSize: req.body.chunkSize,
    overlap: req.body.overlap
  });

  res.json({ chunks });
});

export const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "A TXT or Markdown file is required" });
  }

  const text = normalizeText(req.file.buffer.toString("utf8"));
  if (text.length < 20) {
    return res.status(400).json({ message: "Document text is too short for a useful RAG demo" });
  }

  const chunkSize = Number(req.body.chunkSize || 700);
  const overlap = Number(req.body.overlap || 100);
  const chunks = prepareChunks(text, { chunkSize, overlap });
  const filename = sanitizeFilename(req.file.originalname);

  const document = await prisma.ragDocument.create({
    data: {
      userId: req.user.id,
      title: req.body.title || filename,
      filename,
      mimeType: req.file.mimetype || "text/plain",
      text,
      chunkSize,
      overlap,
      mode: req.body.mode || "mock",
      chunks: {
        create: chunks.map((chunk) => ({
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          tokenEstimate: chunk.tokenEstimate,
          metadata: chunk.metadata,
          vector: chunk.vector
        }))
      }
    },
    include: { chunks: { orderBy: { chunkIndex: "asc" } } }
  });

  await evaluateAchievements(req.user.id);
  res.status(201).json({ document });
});

export const listDocuments = asyncHandler(async (req, res) => {
  const documents = await prisma.ragDocument.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { chunks: true, queryLogs: true } } }
  });

  res.json({ documents });
});

export const getDocument = asyncHandler(async (req, res) => {
  const where =
    req.user.role === "ADMIN"
      ? { id: req.params.documentId }
      : {
          id: req.params.documentId,
          userId: req.user.id
        };

  const document = await prisma.ragDocument.findFirst({
    where,
    include: { chunks: { orderBy: { chunkIndex: "asc" } } }
  });

  if (!document) {
    return res.status(404).json({ message: "Document not found" });
  }

  res.json({ document });
});

export const queryDocument = asyncHandler(async (req, res) => {
  const question = String(req.body.question || "").trim();
  if (question.length < 3) {
    return res.status(400).json({ message: "Question is required" });
  }

  const where =
    req.user.role === "ADMIN"
      ? { id: req.params.documentId }
      : {
          id: req.params.documentId,
          userId: req.user.id
        };

  const document = await prisma.ragDocument.findFirst({
    where,
    include: { chunks: { orderBy: { chunkIndex: "asc" } } }
  });

  if (!document) {
    return res.status(404).json({ message: "Document not found" });
  }

  const result = await answerQuestion({
    question,
    chunks: document.chunks,
    mode: req.body.mode || document.mode || "mock",
    topK: Number(req.body.topK || 4)
  });

  const log = await prisma.ragQueryLog.create({
    data: {
      userId: req.user.id,
      documentId: document.id,
      question,
      answer: result.answer,
      retrievedChunks: result.retrieved,
      mode: result.mode,
      confidence: result.confidence
    }
  });

  res.json({ ...result, logId: log.id });
});

export const getLogs = asyncHandler(async (req, res) => {
  const logs = await prisma.ragQueryLog.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { document: { select: { title: true, filename: true } } }
  });
  res.json({ logs });
});
