import { Router } from "express";
import verifyAdmin from "../../middleware/auth/verifyAdmin.js";
import authorizePermission from "../../middleware/auth/authorizePermission.js";
import { dashboardStats } from "../../controllers/admin/statsController.js";

const router = Router();
router.get("/", verifyAdmin, authorizePermission("dashboard.view"), dashboardStats);
export default router;
