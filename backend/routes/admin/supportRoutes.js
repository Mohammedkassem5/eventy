import { Router } from "express";
import Joi from "joi";
import verifyAdmin from "../../middleware/auth/verifyAdmin.js";
import authorizePermission from "../../middleware/auth/authorizePermission.js";
import validate from "../../middleware/validate.js";
import {
  listConversations,
  getConversation,
  reply,
  closeConversation,
  userContext,
} from "../../controllers/admin/supportController.js";

const bodySchema = Joi.object({ body: Joi.string().min(1).max(2000).required() });

const router = Router();
router.use(verifyAdmin, authorizePermission("support.reply"));
router.get("/conversations", listConversations);
router.get("/:userId/context", userContext);
router.get("/:userId", getConversation);
router.post("/:userId/reply", validate(bodySchema), reply);
router.post("/:userId/close", closeConversation);
export default router;
