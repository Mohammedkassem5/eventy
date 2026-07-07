import { Router } from "express";
import verifyAdmin from "../../middleware/auth/verifyAdmin.js";
import authorizePermission from "../../middleware/auth/authorizePermission.js";
import { listAudit } from "../../controllers/admin/auditController.js";

const router = Router();
router.use(verifyAdmin, authorizePermission("audit.view"));
router.get("/", listAudit);
export default router;
