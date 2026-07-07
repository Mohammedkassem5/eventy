import { Router } from "express";
import Joi from "joi";
import validate from "../../middleware/validate.js";
import { ownerSetup, login, logout, forgotPassword, resetPassword } from "../../controllers/admin/authController.js";

const ownerSchema = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  secret: Joi.string().required(),
});
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  remember: Joi.boolean(),
});

const forgotSchema = Joi.object({ email: Joi.string().email().required() });
const resetSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).required(),
  password: Joi.string().min(6).required(),
});

const router = Router();
router.post("/owner-setup", validate(ownerSchema), ownerSetup);
router.post("/login", validate(loginSchema), login);
router.post("/logout", logout);
router.post("/password/forgot", validate(forgotSchema), forgotPassword);
router.post("/password/reset", validate(resetSchema), resetPassword);
export default router;
