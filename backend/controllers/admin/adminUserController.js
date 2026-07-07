import bcrypt from "bcryptjs";
import { fn, col } from "sequelize";
import Admin from "../../models/admin/Admin.js";
import AdminRole from "../../models/admin/AdminRole.js";
import SupportSession from "../../models/support/SupportSession.js";
import { logAudit } from "../../utils/audit.js";

const withRole = { model: AdminRole, as: "adminRole", attributes: ["id", "name", "permissions", "is_system"] };

const isSupportAgent = (perms = []) => perms.includes("*") || perms.includes("support.reply");

async function agentRating(agentId) {
  const row = await SupportSession.findOne({
    where: { agent_id: agentId },
    attributes: [
      [fn("AVG", col("rating")), "avg"],
      [fn("COUNT", col("rating")), "count"],
      [fn("COUNT", col("id")), "handled"],
    ],
    raw: true,
  });
  return {
    avg: row?.avg ? +Number(row.avg).toFixed(2) : null,
    count: Number(row?.count || 0),
    handled: Number(row?.handled || 0),
  };
}

/* ===== GET /api/admin/me — المشرف الحالي + صلاحياته ===== */
export async function adminMe(req, res) {
  const admin = await Admin.findByPk(req.admin.id, { include: [withRole] });
  if (!admin) return res.status(403).json({ message: "ممنوع" });
  res.json({
    user: admin.toSafeJSON(),
    role: admin.adminRole ? { id: admin.adminRole.id, name: admin.adminRole.name } : null,
    permissions: admin.adminRole?.permissions || [],
  });
}

/* ===== GET /api/admin/admins ===== */
export async function listAdmins(_req, res) {
  const admins = await Admin.findAll({ include: [withRole], order: [["createdAt", "ASC"]] });
  const out = await Promise.all(
    admins.map(async (a) => {
      const support = isSupportAgent(a.adminRole?.permissions);
      return {
        ...a.toSafeJSON(),
        adminRole: a.adminRole,
        is_banned: !a.is_active, // للتوافق مع الواجهة
        is_support_agent: support,
        support_rating: support ? await agentRating(a.id) : null,
      };
    })
  );
  res.json({ admins: out });
}

/* ===== POST /api/admin/admins — إنشاء مشرف وإسناد دور ===== */
export async function createAdmin(req, res) {
  const { name, email, password, admin_role_id, is_demo } = req.body;
  const role = await AdminRole.findByPk(admin_role_id);
  if (!role) return res.status(400).json({ message: "الدور غير موجود" });
  if (role.is_system) return res.status(403).json({ message: "لا يمكن إسناد دور المالك" });

  if (await Admin.findOne({ where: { email } }))
    return res.status(409).json({ message: "هذا البريد مشرف بالفعل" });

  const hash = await bcrypt.hash(password, 10);
  const admin = await Admin.create({ name, email, password: hash, admin_role_id, is_active: true, is_demo: !!is_demo });
  await logAudit(req, "admin.create", `${name} <${email}>`, { role: role.name, demo: !!is_demo });
  res.status(201).json({ message: "تم إنشاء المشرف", admin: admin.toSafeJSON() });
}

/* ===== PATCH /api/admin/admins/:id ===== */
export async function updateAdmin(req, res) {
  const admin = await Admin.findByPk(req.params.id, { include: [withRole] });
  if (!admin) return res.status(404).json({ message: "المشرف غير موجود" });
  if (admin.adminRole?.is_system) return res.status(403).json({ message: "لا يمكن تعديل المالك" });
  if (admin.id === req.admin.id) return res.status(400).json({ message: "لا يمكنك تعديل حسابك من هنا" });

  const updates = {};
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.is_banned !== undefined) updates.is_active = !req.body.is_banned; // حظر = تعطيل
  if (req.body.password) updates.password = await bcrypt.hash(req.body.password, 10);
  if (req.body.admin_role_id !== undefined) {
    const role = await AdminRole.findByPk(req.body.admin_role_id);
    if (!role || role.is_system) return res.status(400).json({ message: "دور غير صالح" });
    updates.admin_role_id = req.body.admin_role_id;
  }
  await admin.update(updates);
  await logAudit(req, "admin.update", `${admin.name} <${admin.email}>`, { fields: Object.keys(updates) });
  res.json({ message: "تم التحديث", admin: admin.toSafeJSON() });
}

/* ===== DELETE /api/admin/admins/:id — إزالة المشرف نهائيًا ===== */
export async function removeAdmin(req, res) {
  const admin = await Admin.findByPk(req.params.id, { include: [withRole] });
  if (!admin) return res.status(404).json({ message: "المشرف غير موجود" });
  if (admin.adminRole?.is_system) return res.status(403).json({ message: "لا يمكن إزالة المالك" });
  if (admin.id === req.admin.id) return res.status(400).json({ message: "لا يمكنك إزالة نفسك" });
  await admin.destroy();
  await logAudit(req, "admin.remove", `${admin.name} <${admin.email}>`);
  res.json({ message: "تمت إزالة المشرف" });
}
