import { Router } from "express";
import Joi from "joi";
import verifyToken from "../../middleware/auth/verifyToken.js";
import validate from "../../middleware/validate.js";
import { myMessages, sendMessage, closeMySession, rateSession } from "../../controllers/user/supportController.js";

const bodySchema = Joi.object({ body: Joi.string().min(1).max(2000).required() });
const rateSchema = Joi.object({ rating: Joi.number().integer().min(1).max(5).required(), comment: Joi.string().max(500).allow("") });

const router = Router();
router.use(verifyToken);
router.get("/messages", myMessages);
router.post("/messages", validate(bodySchema), sendMessage);
router.post("/close", closeMySession);
router.post("/sessions/:id/rate", validate(rateSchema), rateSession);
export default router;
