import AuditLog from "../models/admin/AuditLog.js";
import logger from "./logger.js";

// تسجيل إجراء مشرف — لا يُفشل الطلب لو تعطّل التسجيل
export async function logAudit(req, action, target, meta = null) {
  try {
    await AuditLog.create({
      admin_id: req.admin?.id || null,
      admin_name: req.admin?.name || null,
      action,
      target: target || null,
      meta,
    });
  } catch (e) {
    logger.error("audit log failed", { stack: e.stack });
  }
}
