import { Router } from "express";
import Joi from "joi";
import verifyAdmin from "../../middleware/auth/verifyAdmin.js";
import authorizePermission from "../../middleware/auth/authorizePermission.js";
import validate from "../../middleware/validate.js";
import {
  permissionsCatalog,
  listRoles,
  createRole,
  updateRole,
  deleteRole,
} from "../../controllers/admin/roleController.js";
import {
  adminMe,
  listAdmins,
  createAdmin,
  updateAdmin,
  removeAdmin,
} from "../../controllers/admin/adminUserController.js";

const roleSchema = Joi.object({
  name: Joi.string().min(2).max(80).required(),
  permissions: Joi.array().items(Joi.string()).default([]),
});
const roleUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(80),
  permissions: Joi.array().items(Joi.string()),
}).min(1);
const adminSchema = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  admin_role_id: Joi.number().integer().required(),
  is_demo: Joi.boolean(),
});
const adminUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(120),
  admin_role_id: Joi.number().integer(),
  is_banned: Joi.boolean(),
  password: Joi.string().min(6),
}).min(1);

const router = Router();
router.use(verifyAdmin);

// أي مشرف يقرأ بياناته وصلاحياته
router.get("/me", adminMe);

// إدارة الأدوار والمشرفين — تحتاج صلاحية roles.manage
const manage = authorizePermission("roles.manage");
router.get("/permissions", manage, permissionsCatalog);
router.get("/roles", manage, listRoles);
router.post("/roles", manage, validate(roleSchema), createRole);
router.patch("/roles/:id", manage, validate(roleUpdateSchema), updateRole);
router.delete("/roles/:id", manage, deleteRole);

router.get("/admins", manage, listAdmins);
router.post("/admins", manage, validate(adminSchema), createAdmin);
router.patch("/admins/:id", manage, validate(adminUpdateSchema), updateAdmin);
router.delete("/admins/:id", manage, removeAdmin);

export default router;
