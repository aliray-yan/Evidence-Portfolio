import { Router } from "express";
import {
  createResource,
  deleteResource,
  getAdminStats,
  listResource,
  updateResource
} from "../controllers/adminController.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireAdmin);
router.get("/stats", getAdminStats);
router.get("/:resource", listResource);
router.post("/:resource", createResource);
router.patch("/:resource/:id", updateResource);
router.delete("/:resource/:id", deleteResource);

export default router;
