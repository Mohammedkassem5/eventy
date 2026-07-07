import AdminRole from "../../models/admin/AdminRole.js";
import Admin from "../../models/admin/Admin.js";
import { PERMISSIONS, PERMISSION_KEYS } from "../../utils/permissions.js";
import { logAudit } from "../../utils/audit.js";

/* ===== GET /api/admin/permissions — كتالوج الصلاحيات ===== */
export function permissionsCatalog(_req, res) {
  res.json({ permissions: PERMISSIONS });
}

/* ===== GET /api/admin/roles ===== */
export async function listRoles(_req, res) {
  const roles = await AdminRole.findAll({ order: [["is_system", "DESC"], ["id", "ASC"]] });
  // عدد المشرفين لكل دور
  const withCount = await Promise.all(
    roles.map(async (r) => ({
      ...r.toJSON(),
      admins_count: await Admin.count({ where: { admin_role_id: r.id } }),
    }))
  );
  res.json({ roles: withCount });
}

/* ===== POST /api/admin/roles ===== */
export async function createRole(req, res) {
  const { name, permissions } = req.body;
  const clean = (permissions || []).filter((p) => PERMISSION_KEYS.includes(p));
  if (await AdminRole.findOne({ where: { name } }))
    return res.status(409).json({ message: "اسم الدور مستخدم" });
  const role = await AdminRole.create({ name, permissions: clean, is_system: false });
  await logAudit(req, "role.create", role.name, { permissions: clean });
  res.status(201).json({ message: "تم إنشاء الدور", role });
}

/* ===== PATCH /api/admin/roles/:id ===== */
export async function updateRole(req, res) {
  const role = await AdminRole.findByPk(req.params.id);
  if (!role) return res.status(404).json({ message: "الدور غير موجود" });
  if (role.is_system) return res.status(403).json({ message: "لا يمكن تعديل دور المالك" });

  const updates = {};
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.permissions !== undefined)
    updates.permissions = req.body.permissions.filter((p) => PERMISSION_KEYS.includes(p));
  await role.update(updates);
  await logAudit(req, "role.update", role.name);
  res.json({ message: "تم تحديث الدور", role });
}

/* ===== DELETE /api/admin/roles/:id ===== */
export async function deleteRole(req, res) {
  const role = await AdminRole.findByPk(req.params.id);
  if (!role) return res.status(404).json({ message: "الدور غير موجود" });
  if (role.is_system) return res.status(403).json({ message: "لا يمكن حذف دور المالك" });
  const count = await Admin.count({ where: { admin_role_id: role.id } });
  if (count > 0) return res.status(400).json({ message: "الدور مُسند لمشرفين — انقلهم أولًا" });
  const name = role.name;
  await role.destroy();
  await logAudit(req, "role.delete", name);
  res.json({ message: "تم حذف الدور" });
}
