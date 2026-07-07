import bcrypt from "bcryptjs";
import Admin from "../../models/admin/Admin.js";
import AdminRole from "../../models/admin/AdminRole.js";

const withRole = { model: AdminRole, as: "adminRole", attributes: ["id", "name"] };

/* ===== GET /api/admin/profile — ملف المشرف نفسه ===== */
export async function getProfile(req, res) {
  const admin = await Admin.findByPk(req.admin.id, { include: [withRole] });
  res.json({ admin: admin.toSafeJSON(), role: admin.adminRole?.name || null });
}

/* ===== PATCH /api/admin/profile — تعديل بياناته (اسم/كلمة مرور) ===== */
export async function updateProfile(req, res) {
  const admin = await Admin.findByPk(req.admin.id);
  const updates = {};
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.password) {
    if (String(req.body.password).length < 6) return res.status(400).json({ message: "كلمة المرور 6 أحرف على الأقل" });
    updates.password = await bcrypt.hash(req.body.password, 10);
  }
  await admin.update(updates);
  res.json({ message: "تم تحديث البيانات", admin: admin.toSafeJSON() });
}

/* ===== POST /api/admin/profile/avatar (multipart: avatar) ===== */
export async function uploadAvatar(req, res) {
  if (!req.file) return res.status(400).json({ message: "لم يتم رفع أي صورة" });
  const admin = await Admin.findByPk(req.admin.id);
  await admin.update({ avatar: `/uploads/avatars/${req.file.filename}` });
  res.json({ message: "تم تحديث الصورة", admin: admin.toSafeJSON() });
}
