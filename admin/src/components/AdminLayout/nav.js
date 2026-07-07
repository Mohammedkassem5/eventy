import {
  FiGrid, FiCalendar, FiTag, FiShoppingBag, FiUsers,
  FiCreditCard, FiHeadphones, FiSettings,
} from "react-icons/fi";

// بنية القائمة كبيانات (OOP-style) — عناصر مفردة + مجموعات قابلة للطي
export const NAV = [
  { type: "item", to: "/", label: "الرئيسية", icon: FiGrid, perm: "dashboard.view", end: true },

  {
    type: "group", label: "الفعاليات", icon: FiCalendar,
    children: [
      { to: "/events", label: "كل الفعاليات", perm: "events.manage" },
      { to: "/venues", label: "الأماكن", perm: "venues.manage" },
    ],
  },
  {
    type: "group", label: "التصنيفات", icon: FiTag,
    children: [
      { to: "/categories", label: "أنواع الفعاليات", perm: "categories.manage" },
    ],
  },
  {
    type: "group", label: "الحجوزات", icon: FiShoppingBag,
    children: [
      { to: "/bookings", label: "كل الحجوزات", perm: "bookings.manage" },
      { to: "/refunds", label: "الاستردادات", perm: "refunds.manage" },
    ],
  },
  {
    type: "group", label: "المستخدمون", icon: FiUsers,
    children: [
      { to: "/users", label: "العملاء", perm: "users.manage" },
      { to: "/roles", label: "المشرفون والصلاحيات", perm: "roles.manage" },
    ],
  },
  {
    type: "group", label: "المالية", icon: FiCreditCard,
    children: [
      { to: "/payments", label: "المدفوعات ووسائل الدفع", perm: "payments.manage" },
      { to: "/marketing", label: "التسويق والولاء", perm: "marketing.manage" },
    ],
  },

  { type: "item", to: "/support", label: "الدعم", icon: FiHeadphones, perm: "support.reply" },

  {
    type: "group", label: "الإعدادات", icon: FiSettings,
    children: [
      { to: "/settings", label: "إعدادات المنصة", perm: "settings.manage" },
      { to: "/audit", label: "سجل التدقيق", perm: "audit.view" },
    ],
  },
];

// كل الروابط مسطّحة بالترتيب — لحساب أول صفحة متاحة للمشرف
export const NAV_LINKS = NAV.flatMap((n) => (n.type === "item" ? [{ to: n.to, perm: n.perm }] : n.children));

// أول مسار يملك المشرف صلاحيته (للتوجيه بعد الدخول)
export function firstAllowedPath(can) {
  const hit = NAV_LINKS.find((l) => can(l.perm));
  return hit?.to || "/support";
}
