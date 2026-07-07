import { Op } from "sequelize";
import AuditLog from "../../models/admin/AuditLog.js";

// كتالوج الإجراءات (للفلترة + الترجمة في الواجهة)
export const ACTIONS = {
  "admin.create": "إنشاء مشرف",
  "admin.update": "تعديل مشرف",
  "admin.remove": "إزالة مشرف",
  "role.create": "إنشاء دور",
  "role.update": "تعديل دور",
  "role.delete": "حذف دور",
  "user.ban": "حظر عميل",
  "user.unban": "رفع حظر",
  "refund.approve": "قبول استرداد",
  "refund.reject": "رفض استرداد",
  "settings.update": "تعديل إعداد",
  "settings.create": "إضافة إعداد",
  "settings.delete": "حذف إعداد",
};

/* ===== GET /api/admin/audit ===== */
export async function listAudit(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const { action, q } = req.query;

  const where = {};
  if (action) where.action = action;
  if (q) where[Op.or] = [
    { admin_name: { [Op.like]: `%${q}%` } },
    { target: { [Op.like]: `%${q}%` } },
  ];

  const { rows, count } = await AuditLog.findAndCountAll({
    where, order: [["id", "DESC"]], limit, offset: (page - 1) * limit,
  });

  res.json({
    logs: rows.map((l) => ({ ...l.toJSON(), action_label: ACTIONS[l.action] || l.action })),
    actions: ACTIONS,
    total: count,
    page,
    pages: Math.ceil(count / limit) || 1,
  });
}
