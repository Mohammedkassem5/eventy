import User from "../../models/user/User.js";

const FIELDS = ["name", "phone", "birthdate", "gender", "preferred_lang"];

/* ===== PATCH /api/user/profile ===== */
export async function updateProfile(req, res) {
  const user = await User.findByPk(req.user.id);
  if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });

  const updates = {};
  for (const f of FIELDS) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  }
  await user.update(updates);
  res.json({ message: "تم تحديث البيانات", user: user.toSafeJSON() });
}

/* ===== POST /api/user/avatar (multipart: avatar) ===== */
export async function uploadAvatar(req, res) {
  if (!req.file) return res.status(400).json({ message: "لم يتم رفع أي صورة" });

  const user = await User.findByPk(req.user.id);
  if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });

  const url = `/uploads/avatars/${req.file.filename}`;
  await user.update({ avatar: url });
  res.json({ message: "تم تحديث الصورة", user: user.toSafeJSON() });
}
