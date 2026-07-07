// كتالوج صلاحيات لوحة التحكم — المصدر الوحيد للحقيقة
export const PERMISSIONS = [
  { key: "dashboard.view", label_ar: "عرض الرئيسية", group: "عام" },
  { key: "events.manage", label_ar: "إدارة الفعاليات", group: "الفعاليات" },
  { key: "categories.manage", label_ar: "إدارة أنواع الفعاليات", group: "الفعاليات" },
  { key: "venues.manage", label_ar: "إدارة الأماكن", group: "الفعاليات" },
  { key: "tickets.manage", label_ar: "إدارة فئات التذاكر والمقاعد", group: "الفعاليات" },
  { key: "bookings.manage", label_ar: "إدارة الحجوزات", group: "الحجوزات" },
  { key: "refunds.manage", label_ar: "الاستردادات والإلغاءات", group: "الحجوزات" },
  { key: "users.manage", label_ar: "إدارة المستخدمين", group: "المستخدمون" },
  { key: "roles.manage", label_ar: "إدارة المشرفين والصلاحيات", group: "المستخدمون" },
  { key: "payments.manage", label_ar: "المالية ووسائل الدفع", group: "المالية" },
  { key: "marketing.manage", label_ar: "التسويق والخصومات والولاء", group: "التسويق" },
  { key: "support.reply", label_ar: "الدعم والدردشة", group: "التواصل" },
  { key: "settings.manage", label_ar: "إعدادات المنصة", group: "الإعدادات" },
  { key: "audit.view", label_ar: "سجل التدقيق", group: "الإعدادات" },
];

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);
export const ALL = "*"; // صلاحية المالك الكاملة

export function hasPermission(perms, key) {
  if (!Array.isArray(perms)) return false;
  return perms.includes(ALL) || perms.includes(key);
}
