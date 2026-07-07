import PlatformSetting from "../../models/settings/PlatformSetting.js";
import { logAudit } from "../../utils/audit.js";

/* ===== GET /api/config — إعدادات عامة للـ frontend ===== */
export async function publicConfig(_req, res) {
  const all = await PlatformSetting.findAll();
  const map = Object.fromEntries(all.map((s) => [s.key, s.value]));
  res.json({
    points_per_egp: Number(map.points_per_egp || 100),
    currency_symbol: map.currency_symbol || "ج.م",
    // بيانات فودافون كاش
    vodafone_cash_number: map.vodafone_cash_number || "",
    vodafone_cash_name: map.vodafone_cash_name || "",
    vodafone_cash_instructions: map.vodafone_cash_instructions || "",
  });
}

/* ===== GET /api/admin/settings ===== */
export async function adminListSettings(_req, res) {
  const settings = await PlatformSetting.findAll({ order: [["id", "ASC"]] });
  res.json({ settings });
}

/* ===== PATCH /api/admin/settings/:key ===== */
export async function updateSetting(req, res) {
  const s = await PlatformSetting.findOne({ where: { key: req.params.key } });
  if (!s) return res.status(404).json({ message: "الإعداد غير موجود" });
  await s.update({ value: String(req.body.value) });
  await logAudit(req, "settings.update", s.key, { value: s.value });
  res.json({ message: "تم التحديث", setting: s });
}

/* ===== POST /api/admin/settings — إضافة إعداد مخصّص ===== */
export async function createSetting(req, res) {
  const key = String(req.body.key || "").trim();
  if (!key) return res.status(400).json({ message: "المفتاح مطلوب" });
  if (await PlatformSetting.findOne({ where: { key } }))
    return res.status(409).json({ message: "المفتاح مستخدم بالفعل" });
  const setting = await PlatformSetting.create({
    key, value: String(req.body.value ?? ""), label_ar: req.body.label_ar || null,
  });
  await logAudit(req, "settings.create", key);
  res.status(201).json({ message: "تمت الإضافة", setting });
}

/* ===== DELETE /api/admin/settings/:key ===== */
export async function deleteSetting(req, res) {
  const s = await PlatformSetting.findOne({ where: { key: req.params.key } });
  if (!s) return res.status(404).json({ message: "الإعداد غير موجود" });
  const key = s.key;
  await s.destroy();
  await logAudit(req, "settings.delete", key);
  res.json({ message: "تم الحذف" });
}
