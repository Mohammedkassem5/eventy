import Admin from "../../models/admin/Admin.js";
import AdminRole from "../../models/admin/AdminRole.js";
import { hasPermission } from "../../utils/permissions.js";

// صلاحيات أدمن (من دوره)
export async function getAdminPermissions(adminId) {
  const admin = await Admin.findByPk(adminId);
  if (!admin) return null;
  const role = admin.admin_role_id ? await AdminRole.findByPk(admin.admin_role_id) : null;
  return role?.permissions || [];
}

// حارس صلاحية — يُستخدم بعد verifyAdmin (req.admin موجود)
export default function authorizePermission(key) {
  return async (req, res, next) => {
    if (!req.admin?.id) return res.status(403).json({ message: "ممنوع — لست مشرفًا" });
    const role = req.admin.admin_role_id ? await AdminRole.findByPk(req.admin.admin_role_id) : null;
    const perms = role?.permissions || [];
    if (!hasPermission(perms, key)) return res.status(403).json({ message: "صلاحية غير كافية" });
    req.adminPermissions = perms;
    next();
  };
}
